#!/bin/bash
set -e

# Endpoint configuration
DASHBOARD_URL="http://localhost:3000"
API_URL="http://localhost:8080"
METRICS_URL="http://localhost:9091/metrics" # Vector metrics

echo "🧪 Starting E2E Test Suite"
echo "--------------------------------"

# 1. Clean Environment
echo "🧹 Cleaning previous environment..."
if [ -f "docker-compose.yml" ]; then
    docker-compose down -v --remove-orphans 2>/dev/null || true
    # Force cleanup of networks to prevent race conditions
    docker network prune -f >/dev/null 2>&1 || true
    sleep 3
fi

# 2. Start Stack
echo "🔥 Starting CyberMem stack..."
./deploy.sh --target local > /dev/null

# Wait for health (simple loop)
echo "⏳ Waiting for services..."
retries=0
while ! curl -s "$API_URL/health" > /dev/null; do
    sleep 2
    retries=$((retries+1))
    if [ $retries -gt 30 ]; then
        echo "❌ Timeout waiting for API"
        exit 1
    fi
    echo -n "."
done
echo "✅ Stack is UP"

# 3. Run Load Test
echo "⚡ Running Load Test..."
chmod +x scripts/load_test.sh
./scripts/load_test.sh "$API_URL" 50

# 4. Verify Metrics
echo "🔍 Verifying Metrics..."
sleep 5 # Wait for scrape

# Check if metrics reflect the operations
# Simple check: fetch metrics and look for client_id
METRICS=$(curl -s "$METRICS_URL")
if echo "$METRICS" | grep -q "e2e_test_client"; then
    echo "✅ Metrics received for test client"
else
    echo "❌ No metrics found for test client"
    # Dump for debugging
    echo "$METRICS"
    exit 1
fi

echo "🎉 E2E Test Passed!"
