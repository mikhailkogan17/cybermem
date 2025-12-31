#!/bin/bash
set -e

# Configuration
DASHBOARD_URL="http://localhost:3000"
API_URL="http://localhost:8080"
PROMETHEUS_URL="http://localhost:9092"
METRICS_URL="${PROMETHEUS_URL}/federate?match[]={__name__=~\".+\"}"

# Detect docker compose command
if command -v docker-compose >/dev/null 2>&1; then
    COMPOSE="docker-compose"
else
    COMPOSE="docker compose"
fi

echo "🧪 Starting E2E Test Suite"
echo "--------------------------------"

# 1. Clean Environment
echo "🧹 Cleaning previous environment..."
if [ -f "docker-compose.prod.yml" ]; then
    $COMPOSE -f docker-compose.prod.yml down -v --remove-orphans 2>/dev/null || true
    docker network prune -f >/dev/null 2>&1 || true
    sleep 3
fi

# 2. Start Stack
echo "🔥 Starting CyberMem stack..."
export USE_PREBUILT=1  # Use prebuilt images for speed/stability in CI
./deploy.sh --target local

# Wait for health (API)
echo "⏳ Waiting for API ($API_URL)..."
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
echo "✅ API is UP"

# 3. Check Dashboard Reachability
echo "⏳ Checking Dashboard ($DASHBOARD_URL)..."
if curl -I -s "$DASHBOARD_URL" | head -n 1 | grep -q -E "200|307|308"; then
    echo "✅ Dashboard is accessible"
else
    echo "❌ Dashboard is unreachable"
    exit 1
fi

# 4. Run Load Test
echo "⚡ Running Load Test..."
chmod +x scripts/load_test.sh
./scripts/load_test.sh "$API_URL" 50

# 5. Verify Metrics
echo "🔍 Verifying Metrics via Prometheus Federation..."
sleep 20 # Wait for scrape (15s interval)

METRICS=$(curl -s -g "$METRICS_URL")
if echo "$METRICS" | grep -q "e2e_test_client"; then
    echo "✅ Metrics received for test client"
else
    echo "❌ No metrics found for test client in Prometheus"
    echo "Top 20 metrics lines:"
    echo "$METRICS" | head -n 20
    exit 1
fi

echo "🎉 E2E Test Passed!"
