#!/bin/bash
set -e

# CyberMem CRUD verification script
# Standardized to port 8626 (Zero Trust)

BASE_URL=${CYBERMEM_URL:-"http://localhost:8626"}
CLIENT_NAME="antigravity-client"

echo "🚀 Starting CyberMem CRUD Verification..."
echo "📍 Target: $BASE_URL"

# 1. ADD
echo "📝 Adding memory..."
ADD_RES=$(curl -s -X POST "$BASE_URL/add" \
  -H "Content-Type: application/json" \
  -H "X-Client-Name: $CLIENT_NAME" \
  -d '{"content": "SSoT verification test - $(date)", "tags": ["e2e", "ssot"]}')

ID=$(echo "$ADD_RES" | grep -o '"id":"[^"]*' | cut -d'"' -f4)

if [ -z "$ID" ]; then
  echo "❌ Failed to add memory. Response: $ADD_RES"
  exit 1
fi
echo "✅ Added memory ID: $ID"

# 2. QUERY
echo "🔍 Querying memory..."
QUERY_RES=$(curl -s -X POST "$BASE_URL/query" \
  -H "Content-Type: application/json" \
  -H "X-Client-Name: $CLIENT_NAME" \
  -d '{"query": "SSoT verification", "k": 1}')

if [[ "$QUERY_RES" == *"$ID"* ]]; then
  echo "✅ Query successful"
else
  echo "❌ ID not found in query results. Response: $QUERY_RES"
  exit 1
fi

# 3. LIST ALL
echo "📋 Listing all memories..."
LIST_RES=$(curl -s -X GET "$BASE_URL/all?limit=5" \
  -H "X-Client-Name: $CLIENT_NAME")

if [[ "$LIST_RES" == *"$ID"* ]]; then
  echo "✅ List successful"
else
  echo "❌ ID not found in list. Response: $LIST_RES"
  exit 1
fi

# 4. DELETE
echo "🗑️ Deleting memory..."
DEL_RES=$(curl -s -X DELETE "$BASE_URL/$ID" \
  -H "X-Client-Name: $CLIENT_NAME")

if [[ "$DEL_RES" == *"ok\":true"* ]]; then
  echo "✅ Delete successful"
else
  echo "❌ Delete failed. Response: $DEL_RES"
  exit 1
fi

echo "🏁 CRUD Verification Passed!"
