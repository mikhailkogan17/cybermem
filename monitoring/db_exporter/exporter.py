#!/usr/bin/env python3
"""
CyberMem Database Exporter for Prometheus

Queries OpenMemory's database and exports per-client metrics to Prometheus.
Replaces the complex Vector + Traefik access logs pipeline with simple DB queries.
"""

import os
import time
import sqlite3
import json
from prometheus_client import Gauge, Info, generate_latest, CONTENT_TYPE_LATEST
from flask import Flask, Response, request, jsonify
import logging
import threading

# Configuration
DB_PATH = os.getenv("DB_PATH", "/data/openmemory.sqlite")
SCRAPE_INTERVAL = int(os.getenv("SCRAPE_INTERVAL", "15"))  # seconds
EXPORTER_PORT = int(os.getenv("EXPORTER_PORT", "8000"))

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("db_exporter")

# Prometheus metrics
info = Info('cybermem_exporter', 'CyberMem Database Exporter Info')
info.info({'version': '1.0.0', 'db_path': DB_PATH})

memories_total = Gauge(
    'openmemory_memories_total',
    'Total number of memories stored',
    ['client']
)

memories_recent_24h = Gauge(
    'openmemory_memories_recent_24h',
    'Memories created in the last 24 hours',
    ['client']
)

memories_recent_1h = Gauge(
    'openmemory_memories_recent_1h',
    'Memories created in the last hour',
    ['client']
)

requests_by_operation = Gauge(
    'openmemory_requests_total',
    'Total requests by client and operation (from cybermem_stats table)',
    ['client_name', 'operation']
)

errors_by_operation = Gauge(
    'openmemory_errors_total',
    'Total errors by client and operation (from cybermem_stats table)',
    ['client_name', 'operation']
)

sectors_count = Gauge(
    'openmemory_sectors_total',
    'Number of unique sectors per client',
    ['client']
)

avg_score = Gauge(
    'openmemory_avg_score',
    'Average score of memories',
    ['client']
)

# Aggregate metrics (not per-client)
total_requests_aggregate = Gauge(
    'openmemory_requests_aggregate_total',
    'Total API requests (aggregate, from stats table)'
)

total_errors_aggregate = Gauge(
    'openmemory_errors_aggregate_total',
    'Total API errors (aggregate, from stats table)'
)

success_rate_aggregate = Gauge(
    'openmemory_success_rate_aggregate',
    'API success rate percentage (aggregate)'
)


def get_db_connection():
    """Get SQLite database connection."""
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        return conn
    except Exception as e:
        logger.error(f"Failed to connect to database: {e}")
        raise


def collect_metrics():
    """Collect all metrics from OpenMemory database."""
    try:
        db = get_db_connection()
        cursor = db.cursor()

        # Metric 1: Total memories per client
        cursor.execute('''
            SELECT user_id as client, COUNT(*) as count
            FROM memories
            GROUP BY user_id
        ''')
        for row in cursor.fetchall():
            client = row['client'] or 'anonymous'
            memories_total.labels(client=client).set(row['count'])

        logger.debug(f"Collected total memories for {cursor.rowcount} clients")

        # Metric 2: Recent memories (24h)
        # Note: created_at is stored as milliseconds since epoch
        cursor.execute('''
            SELECT user_id as client, COUNT(*) as count
            FROM memories
            WHERE created_at > ?
            GROUP BY user_id
        ''', [int((time.time() - 86400) * 1000)])
        for row in cursor.fetchall():
            client = row['client'] or 'anonymous'
            memories_recent_24h.labels(client=client).set(row['count'])

        logger.debug(f"Collected 24h memories for {cursor.rowcount} clients")

        # Metric 3: Recent memories (1h)
        cursor.execute('''
            SELECT user_id as client, COUNT(*) as count
            FROM memories
            WHERE created_at > ?
            GROUP BY user_id
        ''', [int((time.time() - 3600) * 1000)])
        for row in cursor.fetchall():
            client = row['client'] or 'anonymous'
            memories_recent_1h.labels(client=client).set(row['count'])

        logger.debug(f"Collected 1h memories for {cursor.rowcount} clients")

        # Metric 4: Per-client request stats from cybermem_stats table
        cursor.execute('''
            SELECT client_name, operation, count, errors
            FROM cybermem_stats
        ''')
        for row in cursor.fetchall():
            client_name = row['client_name'] or 'unknown'
            operation = row['operation']
            count = row['count']
            errors = row['errors']
            requests_by_operation.labels(client_name=client_name, operation=operation).set(count)
            errors_by_operation.labels(client_name=client_name, operation=operation).set(errors)

        logger.debug(f"Collected request stats for {cursor.rowcount} client/operation pairs")

        # Metric 5: Aggregate request stats from OpenMemory's stats table
        # Note: stats table has no client_id, so these are aggregate only
        hour_ago_ms = int((time.time() - 3600) * 1000)

        # Get total requests (sum of qps snapshots)
        cursor.execute('''
            SELECT SUM(count) as total
            FROM stats
            WHERE type = 'qps' AND ts > ?
        ''', [hour_ago_ms])
        total_reqs = cursor.fetchone()['total'] or 0
        total_requests_aggregate.set(total_reqs)

        # Get total errors
        cursor.execute('''
            SELECT COUNT(*) as total
            FROM stats
            WHERE type = 'error' AND ts > ?
        ''', [hour_ago_ms])
        total_errs = cursor.fetchone()['total'] or 0
        total_errors_aggregate.set(total_errs)

        # Calculate success rate
        if total_reqs > 0:
            success_rate = ((total_reqs - total_errs) / total_reqs) * 100
            success_rate_aggregate.set(max(0.0, success_rate))  # Cap at 0% minimum
        else:
            success_rate_aggregate.set(100.0)  # No requests = 100% success

        logger.debug(f"Collected aggregate stats: {total_reqs} reqs, {total_errs} errs")

        # Metric 5: Number of unique sectors per client
        cursor.execute('''
            SELECT user_id as client, COUNT(DISTINCT primary_sector) as count
            FROM memories
            WHERE primary_sector IS NOT NULL
            GROUP BY user_id
        ''')
        for row in cursor.fetchall():
            client = row['client'] or 'anonymous'
            sectors_count.labels(client=client).set(row['count'])

        logger.debug(f"Collected sectors count for {cursor.rowcount} clients")

        # Metric 6: Average feedback score per client
        cursor.execute('''
            SELECT user_id as client, AVG(feedback_score) as avg_score
            FROM memories
            WHERE feedback_score IS NOT NULL
            GROUP BY user_id
        ''')
        for row in cursor.fetchall():
            client = row['client'] or 'anonymous'
            avg_score.labels(client=client).set(row['avg_score'] or 0)

        logger.debug(f"Collected average scores for {cursor.rowcount} clients")

        db.close()
        logger.info("Metrics collection completed successfully")

    except Exception as e:
        logger.error(f"Error collecting metrics: {e}", exc_info=True)


def get_logs_from_db(start_ms: int, limit: int = 100):
    """Get access logs from database"""
    try:
        db = get_db_connection()
        cursor = db.cursor()

        cursor.execute('''
            SELECT timestamp, client_name, client_version, method, endpoint, operation, status, is_error
            FROM cybermem_access_log
            WHERE timestamp >= ?
            ORDER BY timestamp DESC
            LIMIT ?
        ''', [start_ms, limit])

        logs = []
        for row in cursor.fetchall():
            logs.append({
                'timestamp': row['timestamp'],
                'client_name': row['client_name'],
                'client_version': row['client_version'],
                'method': row['method'],
                'endpoint': row['endpoint'],
                'operation': row['operation'],
                'status': row['status'],
                'is_error': bool(row['is_error'])
            })

        db.close()
        return logs
    except Exception as e:
        logger.error(f"Error fetching logs: {e}", exc_info=True)
        return []


# Create Flask app
app = Flask(__name__)

@app.route('/metrics')
def metrics():
    """Prometheus metrics endpoint"""
    return Response(generate_latest(), mimetype=CONTENT_TYPE_LATEST)

@app.route('/api/logs')
def api_logs():
    """Access logs API endpoint"""
    try:
        start_ms = int(request.args.get('start', 0))
        limit = int(request.args.get('limit', 100))

        logs = get_logs_from_db(start_ms, limit)
        return jsonify({'logs': logs})
    except Exception as e:
        logger.error(f"Error in /api/logs: {e}", exc_info=True)
        return jsonify({'error': str(e)}), 500

def metrics_collection_loop():
    """Background thread for collecting metrics"""
    logger.info("Starting metrics collection loop")
    while True:
        try:
            collect_metrics()
            time.sleep(SCRAPE_INTERVAL)
        except Exception as e:
            logger.error(f"Error in metrics collection: {e}", exc_info=True)
            time.sleep(SCRAPE_INTERVAL)

def main():
    """Start the exporter and metrics collection loop."""
    logger.info(f"Starting CyberMem Database Exporter on port {EXPORTER_PORT}")
    logger.info(f"Database path: {DB_PATH}")
    logger.info(f"Scrape interval: {SCRAPE_INTERVAL}s")

    # Start metrics collection in background thread
    metrics_thread = threading.Thread(target=metrics_collection_loop, daemon=True)
    metrics_thread.start()

    # Start Flask HTTP server
    logger.info(f"Starting HTTP server on http://0.0.0.0:{EXPORTER_PORT}")
    logger.info(f"  Metrics: http://0.0.0.0:{EXPORTER_PORT}/metrics")
    logger.info(f"  Logs API: http://0.0.0.0:{EXPORTER_PORT}/api/logs")

    app.run(host='0.0.0.0', port=EXPORTER_PORT, threaded=True)


if __name__ == '__main__':
    main()
