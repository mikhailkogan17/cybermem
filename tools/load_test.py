import time

import requests

# Configuration
API_URL = "http://localhost:80/memory"
# Using X-Client-Name to simulate different clients
CLIENT_NAME = "Antigravity LoadTest"
API_KEY = "dev-secret-key"

HEADERS = {
    "Authorization": f"Bearer {API_KEY}",
    "Content-Type": "application/json",
    "X-Client-Name": CLIENT_NAME,
}


def run_load_test():
    print(f"🚀 Starting Load Test against {API_URL}...")

    # Shared memory ID for CRUD cycle
    created_id = None

    for i in range(1, 6):
        print(f"\n--- Iteration {i} ---")

        # 1. Create (POST /add)
        print("Creating memory...")
        try:
            payload = {
                "content": f"Load test memory {i} content - {time.time()}",
                "metadata": {"source": "load_test", "iteration": i},
                "tags": ["test", "load"],
            }
            res = requests.post(
                f"{API_URL}/add",
                headers=HEADERS,
                json=payload,
            )
            if res.status_code in [200, 201]:
                data = res.json()
                # Assuming response is the memory object with 'id'
                created_id = data.get("id")
                print(f"✅ Created: {created_id}")
            else:
                print(f"❌ Create failed: {res.status_code} {res.text}")
        except Exception as e:
            print(f"❌ Create exception: {e}")

        time.sleep(1)

        # 2. Search (POST /query)
        print("Searching...")
        try:
            search_payload = {"query": "load test", "limit": 5}
            # Note: Explicit search endpoint
            res = requests.post(
                f"{API_URL}/query", headers=HEADERS, json=search_payload
            )
            if res.status_code == 200:
                results = res.json()
                count = (
                    len(results)
                    if isinstance(results, list)
                    else len(results.get("data", []))
                )
                print(f"✅ Search success: found {count} items")
            else:
                print(f"❌ Search failed: {res.status_code} {res.text}")
        except Exception as e:
            print(f"❌ Search exception: {e}")

        time.sleep(1)

        # 3. Update (PATCH /{id})
        if created_id:
            print(f"Updating {created_id}...")
            try:
                update_payload = {
                    "content": f"Updated content for iteration {i}",
                }
                res = requests.patch(
                    f"{API_URL}/{created_id}",
                    headers=HEADERS,
                    json=update_payload,
                )
                if res.status_code == 200:
                    print("✅ Update success")
                else:
                    print(f"❌ Update failed: {res.status_code} {res.text}")
            except Exception as e:
                print(f"❌ Update exception: {e}")

        time.sleep(1)

        # 4. Delete (DELETE /{id})
        # Only delete on the last iteration or specifically if we want to clean up
        # Let's delete to keep system clean
        if created_id:
            print(f"Deleting {created_id}...")
            try:
                res = requests.delete(f"{API_URL}/{created_id}", headers=HEADERS)
                if res.status_code == 200:
                    print("✅ Delete success")
                else:
                    print(f"❌ Delete failed: {res.status_code} {res.text}")
            except Exception as e:
                print(f"❌ Delete exception: {e}")

        time.sleep(1)

    print("\n✅ Load Test Complete!")


if __name__ == "__main__":
    run_load_test()
