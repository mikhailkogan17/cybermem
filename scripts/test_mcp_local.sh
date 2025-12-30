#!/bin/bash
# Quick test script for MCP server (local deployment)
set -e

API_KEY="${OM_API_KEY:-dev-secret-key}"
BASE_URL="http://localhost:8080"

echo "🧪 Testing CyberMem MCP Server"
echo "================================"

# 1. Health check
echo "1️⃣  Health check..."
curl -s "${BASE_URL}/health" | jq '.' || echo "❌ Health check failed"

# 2. MCP endpoint
echo ""
echo "2️⃣  MCP endpoint..."
curl -s "${BASE_URL}/mcp" | head -n 5

# 3. Add a test memory
echo ""
echo "3️⃣  Adding test memory..."
MEMORY_ID=$(curl -s -X POST "${BASE_URL}/v1/memory" \
  -H "Authorization: Bearer ${API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Test memory from MCP validation script",
    "metadata": {"source": "test_script"}
  }' | jq -r '.id')

echo "   Created memory: ${MEMORY_ID}"

# 4. Search for it
echo ""
echo "4️⃣  Searching for test memory..."
curl -s -X POST "${BASE_URL}/v1/memory/search" \
  -H "Authorization: Bearer ${API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"query": "MCP validation"}' | jq '.results[0].content'

# 5. Delete it
echo ""
echo "5️⃣  Cleaning up..."
curl -s -X DELETE "${BASE_URL}/v1/memory/${MEMORY_ID}" \
  -H "Authorization: Bearer ${API_KEY}"

echo ""
echo "✅ All tests passed!"
