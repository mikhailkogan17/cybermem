#!/usr/bin/env python3
"""
Traefik Access Log Exporter for Prometheus
Parses Traefik JSON access logs and exports per-request metrics
Writes aggregates to cybermem_stats table for persistence
"""

import json
import os
import sqlite3
import time
from pathlib import Path

# Configuration
LOG_FILE = os.environ.get("LOG_FILE", "/var/log/traefik/access.log")
EXPORTER_PORT = int(os.environ.get("EXPORTER_PORT", "8001"))
SCRAPE_INTERVAL = int(os.environ.get("SCRAPE_INTERVAL", "5"))
DB_PATH = os.environ.get("DB_PATH", "/data/openmemory.sqlite")

# No Prometheus metrics here - we write to DB instead
# db_exporter will read from cybermem_stats and export as Gauge


def init_db():
    """Initialize cybermem_stats and cybermem_access_log tables in OpenMemory database"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # Create aggregate stats table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS cybermem_stats (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            client_name TEXT NOT NULL,
            operation TEXT NOT NULL,
            count INTEGER DEFAULT 0,
            errors INTEGER DEFAULT 0,
            last_updated INTEGER NOT NULL,
            UNIQUE(client_name, operation)
        )
    """)

    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_cybermem_stats_client_op
        ON cybermem_stats(client_name, operation)
    """)

    # Create access log table for detailed request history
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS cybermem_access_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp INTEGER NOT NULL,
            client_name TEXT NOT NULL,
            client_version TEXT,
            method TEXT NOT NULL,
            endpoint TEXT NOT NULL,
            operation TEXT NOT NULL,
            status TEXT NOT NULL,
            is_error INTEGER DEFAULT 0
        )
    """)

    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_cybermem_access_log_timestamp
        ON cybermem_access_log(timestamp DESC)
    """)

    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_cybermem_access_log_client
        ON cybermem_access_log(client_name, timestamp DESC)
    """)

    conn.commit()
    conn.close()
    print(f"[DB] Initialized cybermem tables in {DB_PATH}")


def increment_stat(client_name: str, operation: str, is_error: bool = False):
    """Increment counter in cybermem_stats table"""
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()

        ts = int(time.time() * 1000)

        # Upsert: increment if exists, insert if not
        if is_error:
            cursor.execute(
                """
                INSERT INTO cybermem_stats (client_name, operation, count, errors, last_updated)
                VALUES (?, ?, 1, 1, ?)
                ON CONFLICT(client_name, operation)
                DO UPDATE SET
                    count = count + 1,
                    errors = errors + 1,
                    last_updated = ?
            """,
                [client_name, operation, ts, ts],
            )
        else:
            cursor.execute(
                """
                INSERT INTO cybermem_stats (client_name, operation, count, errors, last_updated)
                VALUES (?, ?, 1, 0, ?)
                ON CONFLICT(client_name, operation)
                DO UPDATE SET
                    count = count + 1,
                    last_updated = ?
            """,
                [client_name, operation, ts, ts],
            )

        conn.commit()
        conn.close()
    except Exception as e:
        print(f"[DB] Error updating stats: {e}")


def log_access(
    client_name: str,
    client_version: str,
    method: str,
    endpoint: str,
    operation: str,
    status: str,
    is_error: bool,
):
    """Log individual request to access_log table"""
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()

        ts = int(time.time() * 1000)

        cursor.execute(
            """
            INSERT INTO cybermem_access_log (timestamp, client_name, client_version, method, endpoint, operation, status, is_error)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """,
            [
                ts,
                client_name,
                client_version,
                method,
                endpoint,
                operation,
                status,
                1 if is_error else 0,
            ],
        )

        conn.commit()
        conn.close()
    except Exception as e:
        print(f"[DB] Error logging access: {e}")


def tail_log_file(filepath, poll_interval=1):
    """Tail a log file, yielding new lines as they appear"""
    path = Path(filepath)

    # Wait for file to exist
    while not path.exists():
        print(f"Waiting for log file: {filepath}")
        time.sleep(poll_interval)

    with open(filepath, "r") as f:
        # Start from the end of file
        f.seek(0, 2)

        while True:
            line = f.readline()
            if line:
                yield line
            else:
                time.sleep(poll_interval)


def parse_and_export():
    """Parse Traefik access logs and export metrics"""
    print(f"Starting Traefik Log Exporter on port {EXPORTER_PORT}")
    print(f"Watching log file: {LOG_FILE}")

    for line in tail_log_file(LOG_FILE, poll_interval=SCRAPE_INTERVAL):
        try:
            data = json.loads(line.strip())

            # Extract relevant fields
            method = data.get("RequestMethod", "UNKNOWN")
            path = data.get("RequestPath", "/unknown")
            status = str(data.get("DownstreamStatus", 0))

            # Extract MCP client info from custom headers
            client_name = data.get("request_X-Client-Name", "unknown")
            client_version = data.get("request_X-Client-Version", "unknown")

            # Fallback to User-Agent if client_name is unknown
            if client_name == "unknown":
                ua = data.get("request_User-Agent", "")
                if ua and ua != "-":
                    # Simple heuristic: take the first part before '/' or space
                    # e.g. "curl/7.64.1" -> "curl", "Mozilla/5.0" -> "Mozilla"
                    parts = ua.split("/")
                    if len(parts) > 0:
                        potential_name = parts[0].split(" ")[0].strip()
                        if potential_name:
                            client_name = potential_name

            # Remove query params first
            endpoint = path.split("?")[0]

            # Determine operation type from endpoint BEFORE normalization
            if endpoint == "/memory/add":
                operation = "create"
            elif endpoint == "/memory/query":
                operation = "read"
            elif endpoint.startswith("/memory/") and method == "PATCH":
                operation = "update"
            elif endpoint.startswith("/memory/") and method == "DELETE":
                operation = "delete"
            elif endpoint.startswith("/mcp"):
                operation = "create"  # MCP operations are typically POST
            else:
                operation = "other"

            # NOW normalize endpoint to remove IDs (e.g., /memory/123 -> /memory/:id)
            if (
                endpoint.startswith("/memory/")
                and len(endpoint) > 8
                and operation in ["update", "delete"]
            ):
                endpoint = "/memory/:id"

            # Only track requests to OpenMemory API (/memory/* and /mcp endpoints)
            # Exclude /health checks - they pollute Top/Last Reader metrics
            if endpoint.startswith("/memory") or endpoint.startswith("/mcp"):
                # Check if it's an error (4xx or 5xx)
                is_error = status.startswith("4") or status.startswith("5")

                # Write aggregate stats
                increment_stat(client_name, operation, is_error)

                # Log individual request to access_log
                log_access(
                    client_name,
                    client_version,
                    method,
                    endpoint,
                    operation,
                    status,
                    is_error,
                )

                print(
                    f"[{time.strftime('%H:%M:%S')}] {client_name}/{client_version} {method} {endpoint} ({operation}) -> {status}"
                )

        except json.JSONDecodeError:
            # Skip invalid JSON lines
            continue
        except Exception as e:
            print(f"Error processing log line: {e}")
            continue


if __name__ == "__main__":
    # Initialize database table
    init_db()

    # Note: No Prometheus HTTP server here
    # Metrics are written to DB and exported by db_exporter
    print(f"Writing metrics to database: {DB_PATH}")

    # Start parsing logs
    parse_and_export()
