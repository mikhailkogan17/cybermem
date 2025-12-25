#!/bin/bash
API_URL="http://localhost:80/memory"
API_KEY="dev-secret-key"

echo "Starting Load Test..."

for i in {1..5}; do
  echo "--- Iteration $i ---"

  # 1. Add
  echo "Adding memory..."
  RESP=$(curl -s -X POST "$API_URL/add" \
    -H "Authorization: Bearer $API_KEY" \
    -H "Content-Type: application/json" \
    -H "X-Client-Name: LoadTester" \
    -d "{\"content\": \"Load test memory $i\", \"user_id\": \"user_$i\"}")

  # Basic extraction of ID (assuming simple valid JSON response like {"id": "..."})
  # If jq is missing, we use sed/awk.
  ID=$(echo "$RESP" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)

  if [ -z "$ID" ]; then
    echo "❌ Failed to get ID from response: $RESP"
    continue
  fi

  echo "✅ Added ID: $ID"
  sleep 1

  # 2. Query
  echo "Querying..."
  Q_VAL=$(curl -s -X POST "$API_URL/query" \
    -H "Authorization: Bearer $API_KEY" \
    -H "Content-Type: application/json" \
    -H "X-Client-Name: LoadTester" \
    -d "{\"query\": \"load test\", \"k\": 5}")
  if [[ "$Q_VAL" == *"matches"* ]]; then
     echo "✅ Query successful"
  else
     echo "❌ Query failed: $Q_VAL"
  fi
  sleep 1

  # 3. Update
  echo "Updating..."
  UPD_VAL=$(curl -s -X PATCH "$API_URL/$ID" \
    -H "Authorization: Bearer $API_KEY" \
    -H "Content-Type: application/json" \
    -H "X-Client-Name: LoadTester" \
    -d "{\"content\": \"Updated load test memory $i\", \"tags\": [\"updated\"]}")

  if [[ "$UPD_VAL" == *"id"* ]]; then
     echo "✅ Update successful"
  else
     echo "❌ Update failed: $UPD_VAL"
  fi
  sleep 1

  # 4. Delete
  echo "Deleting..."
  DEL_VAL=$(curl -s -X DELETE "$API_URL/$ID" \
    -H "Authorization: Bearer $API_KEY" \
    -H "X-Client-Name: LoadTester")

  if [[ "$DEL_VAL" == *"ok"* ]]; then
     echo "✅ Delete successful"
  else
     echo "❌ Delete failed: $DEL_VAL"
  fi
  sleep 1
done

echo "Load Test Complete"
