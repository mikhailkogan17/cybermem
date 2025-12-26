#!/bin/bash
set -e

# Configuration
API_URL=${1:-"http://localhost:8080"}
COUNT=${2:-50}
CLIENT_ID="e2e_test_client"

echo "🚀 Starting Load Test ($COUNT operations)..."

for i in $(seq 1 $COUNT); do
    # Generate random memory content
    CONTENT="Memory trace $i - $(date +%s)"

    # Store memory
    response=$(curl -s -X POST "$API_URL/api/store" \
        -H "Authorization: Bearer $CLIENT_ID" \
        -H "Content-Type: application/json" \
        -d "{\"content\": \"$CONTENT\", \"userId\": \"$CLIENT_ID\"}")

    if (( i % 10 == 0 )); then
        echo "  - Processed $i/$COUNT operations"
    fi
done

echo "✅ Load Test Complete!"
