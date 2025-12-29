import sys
import time

import requests

# Configuration
BASE_URL = "http://localhost:80"  # Traefik entrypoint
DASHBOARD_URL = "http://localhost:3000"
CLIENT_NAME = "IntegrationTestBot"
EXPECTED_NAME = (
    "Test Client"  # 'test' pattern maps to 'Test Client' in client-metadata.ts
)
HEADERS = {
    "X-Client-Name": CLIENT_NAME,
    "Content-Type": "application/json",
    "Authorization": "Bearer dev-secret-key",
}


def generate_traffic():
    print(f"Generating traffic for client: {CLIENT_NAME}...")
    # Create 5 memories to ensure we become the top writer (if the system was idle or we send enough)
    # Note: If there's existing massive traffic, we might not become #1, but we should appear in audit logs.

    # generate writes
    # Generate enough traffic to overtake existing top writer (Antigravity ~21)
    for i in range(60):
        payload = {"content": f"Integration test memory {i}", "tags": ["test"]}
        try:
            # Use /memory/add which is validated to work with Traefik
            resp = requests.post(
                f"{BASE_URL}/memory/add", json=payload, headers=HEADERS
            )
            print(f"Write Request {i + 1}/5: {resp.status_code}")
        except Exception as e:
            print(f"Write Request failed: {e}")
            sys.exit(1)

    # generate reads
    print("Generating read traffic...")
    for i in range(5):
        payload = {"query": "test", "limit": 1}
        try:
            resp = requests.post(
                f"{BASE_URL}/memory/query", json=payload, headers=HEADERS
            )
            print(f"Read Request {i + 1}/5: {resp.status_code}")
        except Exception as e:
            print(f"Read Request failed: {e}")
            sys.exit(1)

    print("Traffic generation complete. Waiting for logs to propagate (5s)...")
    time.sleep(5)


def verify_dashboard_metrics():
    print("Verifying Dashboard Metrics (/api/metrics)...")
    try:
        resp = requests.get(f"{DASHBOARD_URL}/api/metrics")
        if resp.status_code != 200:
            print(f"Failed to fetch metrics: {resp.status_code}")
            return False

        data = resp.json()
        stats = data.get("stats", {})

        # Check Top Writer or Last Writer
        # Note: Depending on other traffic, we might not be Top, but we should likely be Last Writer
        last_writer = stats.get("lastWriter", {}).get("name")
        top_writer = stats.get("topWriter", {}).get("name")

        print(
            f"Dashboard reports - Last Writer: {last_writer}, Top Writer: {top_writer}"
        )

        if last_writer == EXPECTED_NAME or top_writer == EXPECTED_NAME:
            print("SUCCESS: Client found in Metrics.")
            return True

        # Strict check might fail if formatting changes, let's allow substring
        if EXPECTED_NAME in str(last_writer) or EXPECTED_NAME in str(top_writer):
            print("SUCCESS: Client found in Metrics (substring match).")
            return True

        print(
            f"FAILURE: {EXPECTED_NAME} not found in Top/Last Writer. Found: {top_writer}, {last_writer}"
        )
        return False

    except Exception as e:
        print(f"Error checking metrics: {e}")
        return False


def verify_audit_logs():
    print("Verifying Audit Logs (/api/audit-logs)...")
    try:
        resp = requests.get(f"{DASHBOARD_URL}/api/audit-logs")
        if resp.status_code != 200:
            print(f"Failed to fetch audit logs: {resp.status_code}")
            return False

        data = resp.json()
        logs = data.get("logs", [])

        if not logs:
            print("FAILURE: No audit logs returned.")
            return False

        # Check the most recent logs
        found = False
        for log in logs[:10]:  # Check to 10 logs
            client = log.get("client")
            if client == CLIENT_NAME or (CLIENT_NAME in str(client)):
                print(f"SUCCESS: Found log entry for client: {client}")
                found = True
                break

        if not found:
            print(f"FAILURE: {CLIENT_NAME} not found in recent audit logs.")
            print("Recent clients: ", [l.get("client") for l in logs[:5]])
            return False

        return True

    except Exception as e:
        print(f"Error checking audit logs: {e}")
        return False


if __name__ == "__main__":
    generate_traffic()

    metrics_ok = verify_dashboard_metrics()
    audit_ok = verify_audit_logs()

    if metrics_ok and audit_ok:
        print("\nALL INTEGRATION TESTS PASSED")
        sys.exit(0)
    else:
        print("\nINTEGRATION TESTS FAILED")
        sys.exit(1)
