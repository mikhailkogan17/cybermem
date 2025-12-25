import time

import requests

API_URL = "http://localhost:80/memory"
API_KEY = "dev-secret-key"
HEADERS = {
    "Authorization": f"Bearer {API_KEY}",
    "Content-Type": "application/json",
    "X-Client-Name": "LoadTester",
}


def run_load_test():
    print("Starting Load Test (5 iterations)...")

    for i in range(1, 6):
        print(f"\n--- Iteration {i} ---")

        # 1. Add
        print("Adding memory...")
        try:
            res = requests.post(
                f"{API_URL}/add",
                headers=HEADERS,
                json={
                    "content": f"Load test memory {i} content",
                    "metadata": {"source": "load_test", "iteration": i},
                },
            )
            if res.status_code == 200:
                data = res.json()
                mem_id = data.get("id")
                print(f"✅ Added: {mem_id}")
            else:
                print(f"❌ Add failed: {res.status_code} {res.text}")
                continue
        except Exception as e:
            print(f"❌ Add exception: {e}")
            continue

        time.sleep(1)

        # 2. Query
        print("Querying...")
        try:
            res = requests.post(
                f"{API_URL}/query", headers=HEADERS, json={"query": "load test", "k": 5}
            )
            if res.status_code == 200:
                print("✅ Query success")
            else:
                print(f"❌ Query failed: {res.status_code}")
        except Exception as e:
            print(f"❌ Query exception: {e}")

        time.sleep(1)

        # 3. Update
        if mem_id:
            print(f"Updating {mem_id}...")
            try:
                res = requests.patch(
                    f"{API_URL}/{mem_id}",
                    headers=HEADERS,
                    json={
                        "content": f"Updated content for iteration {i}",
                        "tags": ["updated", "test"],
                    },
                )
                if res.status_code == 200:
                    print("✅ Update success")
                else:
                    print(f"❌ Update failed: {res.status_code}")
            except Exception as e:
                print(f"❌ Update exception: {e}")

        time.sleep(1)

        # 4. Delete
        if mem_id:
            print(f"Deleting {mem_id}...")
            try:
                res = requests.delete(f"{API_URL}/{mem_id}", headers=HEADERS)
                if res.status_code == 200:
                    print("✅ Delete success")
                else:
                    print(f"❌ Delete failed: {res.status_code}")
            except Exception as e:
                print(f"❌ Delete exception: {e}")

        time.sleep(1)


if __name__ == "__main__":
    run_load_test()
