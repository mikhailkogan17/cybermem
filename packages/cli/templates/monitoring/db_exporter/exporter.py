#!/usr/bin/env python3
"""
CyberMem Database Exporter for Prometheus

Queries OpenMemory's database and exports per-client metrics to Prometheus.
Replaces the complex Vector + Traefik access logs pipeline with simple DB queries.
"""

import logging
import os
import sqlite3
import threading
import time

from flask import Flask, Response, jsonify, request
from prometheus_client import CONTENT_TYPE_LATEST, Gauge, Info, generate_latest

# Configuration
DB_PATH = os.getenv("DB_PATH", "/data/openmemory.sqlite")
SCRAPE_INTERVAL = int(os.getenv("SCRAPE_INTERVAL", "15"))  # seconds
EXPORTER_PORT = int(os.getenv("EXPORTER_PORT", "8000"))

# Setup logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger("db_exporter")

# Prometheus metrics
info = Info("cybermem_exporter", "CyberMem Database Exporter Info")
info.info({"version": "1.0.0", "db_path": DB_PATH})

memories_total = Gauge(
    "openmemory_memories_total", "Total number of memories stored", ["client"]
)

memories_recent_24h = Gauge(
    "openmemory_memories_recent_24h",
    "Memories created in the last 24 hours",
    ["client"],
)

memories_recent_1h = Gauge(
    "openmemory_memories_recent_1h", "Memories created in the last hour", ["client"]
)

requests_by_operation = Gauge(
    "openmemory_requests_total",
    "Total requests by client and operation (from cybermem_stats table)",
    ["client_name", "operation"],
)

errors_by_operation = Gauge(
    "openmemory_errors_total",
    "Total errors by client and operation (from cybermem_stats table)",
    ["client_name", "operation"],
)

sectors_count = Gauge(
    "openmemory_sectors_total", "Number of unique sectors per client", ["client"]
)

avg_score = Gauge("openmemory_avg_score", "Average score of memories", ["client"])

# Aggregate metrics (not per-client)
total_requests_aggregate = Gauge(
    "openmemory_requests_aggregate_total",
    "Total API requests (aggregate, from stats table)",
)

total_errors_aggregate = Gauge(
    "openmemory_errors_aggregate_total",
    "Total API errors (aggregate, from stats table)",
)

success_rate_aggregate = Gauge(
    "openmemory_success_rate_aggregate", "API success rate percentage (aggregate)"
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
        cursor.execute("""
            SELECT user_id as client, COUNT(*) as count
            FROM memories
            GROUP BY user_id
        """)
        for row in cursor.fetchall():
            client = row["client"] or "anonymous"
            memories_total.labels(client=client).set(row["count"])

        logger.debug(f"Collected total memories for {cursor.rowcount} clients")

        # Metric 2: Recent memories (24h)
        # Note: created_at is stored as milliseconds since epoch
        cursor.execute(
            """
            SELECT user_id as client, COUNT(*) as count
            FROM memories
            WHERE created_at > ?
            GROUP BY user_id
        """,
            [int((time.time() - 86400) * 1000)],
        )
        for row in cursor.fetchall():
            client = row["client"] or "anonymous"
            memories_recent_24h.labels(client=client).set(row["count"])

        logger.debug(f"Collected 24h memories for {cursor.rowcount} clients")

        # Metric 3: Recent memories (1h)
        cursor.execute(
            """
            SELECT user_id as client, COUNT(*) as count
            FROM memories
            WHERE created_at > ?
            GROUP BY user_id
        """,
            [int((time.time() - 3600) * 1000)],
        )
        for row in cursor.fetchall():
            client = row["client"] or "anonymous"
            memories_recent_1h.labels(client=client).set(row["count"])

        logger.debug(f"Collected 1h memories for {cursor.rowcount} clients")

        # Metric 4: Per-client request stats from cybermem_stats table
        cursor.execute("""
            SELECT client_name, operation, count, errors
            FROM cybermem_stats
        """)
        for row in cursor.fetchall():
            client_name = row["client_name"] or "unknown"
            operation = row["operation"]
            count = row["count"]
            errors = row["errors"]
            requests_by_operation.labels(
                client_name=client_name, operation=operation
            ).set(count)
            errors_by_operation.labels(
                client_name=client_name, operation=operation
            ).set(errors)

        logger.debug(
            f"Collected request stats for {cursor.rowcount} client/operation pairs"
        )

        # Metric 5: Aggregate request stats from OpenMemory's stats table
        # Note: stats table has no client_id, so these are aggregate only
        hour_ago_ms = int((time.time() - 3600) * 1000)

        # Get total requests (sum of qps snapshots)
        cursor.execute(
            """
            SELECT SUM(count) as total
            FROM stats
            WHERE type = 'qps' AND ts > ?
        """,
            [hour_ago_ms],
        )
        total_reqs = cursor.fetchone()["total"] or 0
        total_requests_aggregate.set(total_reqs)

        # Get total errors
        cursor.execute(
            """
            SELECT COUNT(*) as total
            FROM stats
            WHERE type = 'error' AND ts > ?
        """,
            [hour_ago_ms],
        )
        total_errs = cursor.fetchone()["total"] or 0
        total_errors_aggregate.set(total_errs)

        # Calculate success rate
        if total_reqs > 0:
            success_rate = ((total_reqs - total_errs) / total_reqs) * 100
            success_rate_aggregate.set(max(0.0, success_rate))  # Cap at 0% minimum
        else:
            success_rate_aggregate.set(100.0)  # No requests = 100% success

        logger.debug(f"Collected aggregate stats: {total_reqs} reqs, {total_errs} errs")

        # Metric 5: Number of unique sectors per client
        cursor.execute("""
            SELECT user_id as client, COUNT(DISTINCT primary_sector) as count
            FROM memories
            WHERE primary_sector IS NOT NULL
            GROUP BY user_id
        """)
        for row in cursor.fetchall():
            client = row["client"] or "anonymous"
            sectors_count.labels(client=client).set(row["count"])

        logger.debug(f"Collected sectors count for {cursor.rowcount} clients")

        # Metric 6: Average feedback score per client
        cursor.execute("""
            SELECT user_id as client, AVG(feedback_score) as avg_score
            FROM memories
            WHERE feedback_score IS NOT NULL
            GROUP BY user_id
        """)
        for row in cursor.fetchall():
            client = row["client"] or "anonymous"
            avg_score.labels(client=client).set(row["avg_score"] or 0)

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

        cursor.execute(
            """
            SELECT timestamp, client_name, client_version, method, endpoint, operation, status, is_error
            FROM cybermem_access_log
            WHERE timestamp >= ?
            ORDER BY timestamp DESC
            LIMIT ?
        """,
            [start_ms, limit],
        )

        logs = []
        for row in cursor.fetchall():
            logs.append(
                {
                    "timestamp": row["timestamp"],
                    "client_name": row["client_name"],
                    "client_version": row["client_version"],
                    "method": row["method"],
                    "endpoint": row["endpoint"],
                    "operation": row["operation"],
                    "status": row["status"],
                    "is_error": bool(row["is_error"]),
                }
            )

        db.close()
        return logs
    except Exception as e:
        logger.error(f"Error fetching logs: {e}", exc_info=True)
        return []


# Create Flask app
app = Flask(__name__)


@app.route("/metrics")
def metrics():
    """Prometheus metrics endpoint"""
    return Response(generate_latest(), mimetype=CONTENT_TYPE_LATEST)


@app.route("/health")
def health():
    """Health check endpoint for dashboard"""
    try:
        db = get_db_connection()
        cursor = db.cursor()
        cursor.execute("SELECT 1")
        db.close()
        return jsonify({"status": "ok", "db": "connected"})
    except Exception as e:
        return jsonify({"status": "error", "error": str(e)}), 503


@app.route("/api/logs")
def api_logs():
    """Access logs API endpoint"""
    try:
        start_ms = int(request.args.get("start", 0))
        limit = int(request.args.get("limit", 100))

        logs = get_logs_from_db(start_ms, limit)
        return jsonify({"logs": logs})
    except Exception as e:
        logger.error(f"Error in /api/logs: {e}", exc_info=True)
        return jsonify({"error": str(e)}), 500


@app.route("/api/stats")
def api_stats():
    """Dashboard stats API endpoint - single source of truth for dashboard metrics"""
    try:
        db = get_db_connection()
        cursor = db.cursor()

        # 1. Total memory records
        cursor.execute("SELECT COUNT(*) as count FROM memories")
        memory_records = cursor.fetchone()["count"] or 0

        # 2. Unique clients (from memories table)
        cursor.execute("SELECT COUNT(DISTINCT user_id) as count FROM memories")
        total_clients = cursor.fetchone()["count"] or 0

        # 3. Total requests and errors from cybermem_stats
        cursor.execute(
            "SELECT SUM(count) as total, SUM(errors) as errors FROM cybermem_stats"
        )
        row = cursor.fetchone()
        total_requests = row["total"] or 0
        total_errors = row["errors"] or 0
        success_rate = (
            ((total_requests - total_errors) / total_requests * 100)
            if total_requests > 0
            else 100.0
        )

        # 4. Top writer (client with most writes)
        cursor.execute("""
            SELECT client_name, SUM(count) as total
            FROM cybermem_stats
            WHERE operation IN ('create', 'update', 'delete')
            GROUP BY client_name
            ORDER BY total DESC
            LIMIT 1
        """)
        top_writer_row = cursor.fetchone()
        top_writer = {
            "name": top_writer_row["client_name"] if top_writer_row else "N/A",
            "count": top_writer_row["total"] if top_writer_row else 0,
        }

        # 5. Top reader
        cursor.execute("""
            SELECT client_name, SUM(count) as total
            FROM cybermem_stats
            WHERE operation IN ('read', 'list', 'query', 'search', 'other')
            GROUP BY client_name
            ORDER BY total DESC
            LIMIT 1
        """)
        top_reader_row = cursor.fetchone()
        top_reader = {
            "name": top_reader_row["client_name"] if top_reader_row else "N/A",
            "count": top_reader_row["total"] if top_reader_row else 0,
        }

        # 6. Last writer (most recent write operation from access log)
        cursor.execute("""
            SELECT client_name, timestamp
            FROM cybermem_access_log
            WHERE operation IN ('create', 'update', 'delete')
            ORDER BY timestamp DESC
            LIMIT 1
        """)
        last_writer_row = cursor.fetchone()
        last_writer = {
            "name": last_writer_row["client_name"] if last_writer_row else "N/A",
            "timestamp": last_writer_row["timestamp"] if last_writer_row else 0,
        }

        # 7. Last reader
        cursor.execute("""
            SELECT client_name, timestamp
            FROM cybermem_access_log
            WHERE operation IN ('read', 'list', 'query', 'search', 'other')
            ORDER BY timestamp DESC
            LIMIT 1
        """)
        last_reader_row = cursor.fetchone()
        last_reader = {
            "name": last_reader_row["client_name"] if last_reader_row else "N/A",
            "timestamp": last_reader_row["timestamp"] if last_reader_row else 0,
        }

        db.close()

        return jsonify(
            {
                "memoryRecords": memory_records,
                "totalClients": total_clients,
                "successRate": round(success_rate, 1),
                "totalRequests": total_requests,
                "topWriter": top_writer,
                "topReader": top_reader,
                "lastWriter": last_writer,
                "lastReader": last_reader,
            }
        )
    except Exception as e:
        logger.error(f"Error in /api/stats: {e}", exc_info=True)
        return jsonify({"error": str(e)}), 500


@app.route("/api/timeseries")
def api_timeseries():
    """Time series data for dashboard charts - adaptive bucket sizes"""
    try:
        period = request.args.get("period", "24h")

        # Parse period to milliseconds
        period_map = {"1h": 3600, "24h": 86400, "7d": 604800, "30d": 2592000}
        period_seconds = period_map.get(period, 86400)
        start_ms = int((time.time() - period_seconds) * 1000)

        # Bucket size: 5m for 1h, 1h for 24h, 6h for 7d, 1d for 30d
        if period == "1h":
            bucket_format = "%Y-%m-%d %H:%M"
            bucket_seconds = 300  # 5 minutes
        elif period == "24h":
            bucket_format = "%Y-%m-%d %H:00"
            bucket_seconds = 3600  # 1 hour
        elif period == "7d":
            bucket_format = "%Y-%m-%d %H:00"
            bucket_seconds = 21600  # 6 hours
        else:
            bucket_format = "%Y-%m-%d"
            bucket_seconds = 86400

        db = get_db_connection()
        cursor = db.cursor()

        # Get operations grouped by time bucket and client
        cursor.execute(
            """
            SELECT
                datetime(timestamp/1000, 'unixepoch', 'localtime') as dt,
                client_name,
                operation,
                COUNT(*) as count
            FROM cybermem_access_log
            WHERE timestamp >= ?
            GROUP BY strftime(?, datetime(timestamp/1000, 'unixepoch', 'localtime')), client_name, operation
            ORDER BY dt
        """,
            [start_ms, bucket_format],
        )

        # Organize by operation type
        creates = {}
        reads = {}
        updates = {}
        deletes = {}

        for row in cursor.fetchall():
            dt = row["dt"]
            client = row["client_name"] or "unknown"
            op = row["operation"]
            count = row["count"]

            # Round to bucket
            ts = int(time.mktime(time.strptime(dt, "%Y-%m-%d %H:%M:%S")))
            bucket_ts = (ts // bucket_seconds) * bucket_seconds

            if op == "create":
                if bucket_ts not in creates:
                    creates[bucket_ts] = {"time": bucket_ts}
                creates[bucket_ts][client] = creates[bucket_ts].get(client, 0) + count
            elif op in ["read", "list", "query", "search", "other"]:
                if bucket_ts not in reads:
                    reads[bucket_ts] = {"time": bucket_ts}
                reads[bucket_ts][client] = reads[bucket_ts].get(client, 0) + count
            elif op == "update":
                if bucket_ts not in updates:
                    updates[bucket_ts] = {"time": bucket_ts}
                updates[bucket_ts][client] = updates[bucket_ts].get(client, 0) + count
            elif op == "delete":
                if bucket_ts not in deletes:
                    deletes[bucket_ts] = {"time": bucket_ts}
                deletes[bucket_ts][client] = deletes[bucket_ts].get(client, 0) + count

        db.close()

        return jsonify(
            {
                "creates": list(creates.values()),
                "reads": list(reads.values()),
                "updates": list(updates.values()),
                "deletes": list(deletes.values()),
            }
        )
    except Exception as e:
        logger.error(f"Error in /api/timeseries: {e}", exc_info=True)
        return jsonify({"error": str(e)}), 500


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

    app.run(host="0.0.0.0", port=EXPORTER_PORT, threaded=True)


if __name__ == "__main__":
    main()
