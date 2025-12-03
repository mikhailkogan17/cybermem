#!/usr/bin/env python3
"""
Traefik Access Log Exporter for Prometheus
Parses Traefik JSON access logs and exports per-request metrics
"""

import json
import time
import os
from prometheus_client import Counter, start_http_server
from pathlib import Path

# Configuration
LOG_FILE = os.environ.get('LOG_FILE', '/var/log/traefik/access.log')
EXPORTER_PORT = int(os.environ.get('EXPORTER_PORT', '8001'))
SCRAPE_INTERVAL = int(os.environ.get('SCRAPE_INTERVAL', '5'))

# Prometheus metrics
requests_total = Counter(
    'openmemory_requests_total',
    'Total HTTP requests to OpenMemory',
    ['client', 'method', 'endpoint', 'status']
)

def extract_client_from_auth(auth_header):
    """Extract client_id from Authorization header (Bearer client_id.secret or Bearer token)"""
    if not auth_header:
        return 'anonymous'

    # Format: "Bearer client_id.secret" or "Bearer token"
    try:
        token = auth_header.replace('Bearer ', '').strip()
        # If token has a dot, extract client_id (everything before the first dot)
        # Otherwise, use the token itself as client_id
        if '.' in token:
            return token.split('.')[0]
        return token
    except Exception:
        return 'unknown'

def tail_log_file(filepath, poll_interval=1):
    """Tail a log file, yielding new lines as they appear"""
    path = Path(filepath)

    # Wait for file to exist
    while not path.exists():
        print(f"Waiting for log file: {filepath}")
        time.sleep(poll_interval)

    with open(filepath, 'r') as f:
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
            method = data.get('RequestMethod', 'UNKNOWN')
            path = data.get('RequestPath', '/unknown')
            status = str(data.get('DownstreamStatus', 0))

            # Extract client from Authorization header (Traefik uses flattened format)
            auth_header = data.get('request_Authorization', '')
            client = extract_client_from_auth(auth_header)

            # Normalize endpoint (remove query params and IDs)
            endpoint = path.split('?')[0]

            # Normalize endpoint to remove IDs (e.g., /memory/123 -> /memory/:id)
            if endpoint.startswith('/memory/') and len(endpoint) > 8:
                endpoint = '/memory/:id'

            # Only track requests to OpenMemory API (skip health checks, etc.)
            if endpoint.startswith('/memory') or endpoint.startswith('/health'):
                requests_total.labels(
                    client=client,
                    method=method,
                    endpoint=endpoint,
                    status=status
                ).inc()

                print(f"[{time.strftime('%H:%M:%S')}] {client} {method} {endpoint} -> {status}")

        except json.JSONDecodeError:
            # Skip invalid JSON lines
            continue
        except Exception as e:
            print(f"Error processing log line: {e}")
            continue

if __name__ == '__main__':
    # Start Prometheus HTTP server
    start_http_server(EXPORTER_PORT)
    print(f"Metrics available at http://localhost:{EXPORTER_PORT}/metrics")

    # Start parsing logs
    parse_and_export()
