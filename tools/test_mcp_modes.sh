#!/bin/bash
# MCP E2E Test - Local + Remote Modes
# Gatekeeper to prevent remote proxy regressions
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
MCP_CLI="${SCRIPT_DIR}/../packages/mcp/dist/index.js"
RPI_URL="${RPI_MCP_URL:-https://raspberrypi.tail7242ed.ts.net/cybermem}"
RPI_TOKEN="${RPI_MCP_TOKEN:-}"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

pass() { echo -e "${GREEN}✅ $1${NC}"; }
fail() { echo -e "${RED}❌ $1${NC}"; exit 1; }
warn() { echo -e "${YELLOW}⚠️  $1${NC}"; }

# Timeout compatibility (macOS vs Linux)
if command -v timeout > /dev/null; then
    TIMEOUT_CMD="timeout"
elif command -v gtimeout > /dev/null; then
    TIMEOUT_CMD="gtimeout"
elif command -v python3 > /dev/null; then
    TIMEOUT_CMD="python3_timeout"
else
    warn "timeout command not found. Tests might hang if they fail."
    TIMEOUT_CMD=""
fi

python3_timeout() {
    local duration=$1
    shift
    # Convert 10s to 10
    local seconds=${duration%s}
    # Use -c to keep stdin available for the subprocess
    python3 -c "import subprocess, sys; subprocess.run(sys.argv[2:], timeout=int(sys.argv[1]), stdin=sys.stdin)" "$seconds" "$@"
}

run_with_timeout() {
    local duration=$1
    shift
    if [ "$TIMEOUT_CMD" = "python3_timeout" ]; then
        python3_timeout "$duration" "$@"
    elif [ -n "$TIMEOUT_CMD" ]; then
        $TIMEOUT_CMD "$duration" "$@"
    else
        "$@"
    fi
}

# Build first
echo "🔨 Building MCP package..."
cd "${SCRIPT_DIR}/../packages/mcp" && npm run build > /dev/null 2>&1
cd "${SCRIPT_DIR}"

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "  CyberMem MCP E2E Test Suite v0.7.6"
echo "═══════════════════════════════════════════════════════════"
echo ""

# ─────────────────────────────────────────────────────────────────
# TEST 1: LOCAL SDK MODE (STDIO)
# ─────────────────────────────────────────────────────────────────
echo "▶ TEST 1: Local SDK Mode (STDIO)"
echo "────────────────────────────────"

# Use timeout because MCP server is a long-running process
LOCAL_RESULT=$(echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"e2e-local-test","version":"1.0"}}}' | run_with_timeout 10s node "$MCP_CLI" 2>&1 || true)

if echo "$LOCAL_RESULT" | grep -q '"serverInfo"'; then
    VERSION=$(echo "$LOCAL_RESULT" | grep -oE '"version":"[0-9.]+"' | head -1)
    pass "Local SDK initialized ($VERSION)"
else
    echo "Output: $LOCAL_RESULT"
    fail "Local SDK initialization failed"
fi

# Quick tool call test
LOCAL_QUERY=$( (echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"e2e-local-test","version":"1.0"}}}'; sleep 1; echo '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"list_memories","arguments":{"limit":1}}}') | run_with_timeout 15s node "$MCP_CLI" 2>&1 || true)

if echo "$LOCAL_QUERY" | grep -q '"id":2'; then
    pass "Local SDK tool call works"
else
    echo "Output: $LOCAL_QUERY"
    fail "Local SDK tool call failed"
fi

echo ""

# ─────────────────────────────────────────────────────────────────
# TEST 2: REMOTE PROXY MODE (via --url)
# ─────────────────────────────────────────────────────────────────
echo "▶ TEST 2: Remote Proxy Mode (--url)"
echo "────────────────────────────────────"

if [ -z "$RPI_TOKEN" ]; then
    warn "RPI_MCP_TOKEN not set, skipping remote tests"
    echo "   Set: export RPI_MCP_TOKEN=sk-..."
    echo ""
else
    # Test initialize via remote
    REMOTE_RESULT=$(echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"e2e-remote-test","version":"1.0"},"roots":{"listChanged":true}}}' | run_with_timeout 15s node "$MCP_CLI" --url "$RPI_URL" --token "$RPI_TOKEN" 2>&1 || true)

    if echo "$REMOTE_RESULT" | grep -q '"serverInfo"'; then
        VERSION=$(echo "$REMOTE_RESULT" | grep -oE '"version":"[0-9.]+"' | head -1)
        pass "Remote proxy initialized ($VERSION)"
    else
        echo "Output: $REMOTE_RESULT"
        fail "Remote proxy initialization failed (check Accept headers!)"
    fi

    # Test tool call via remote
    REMOTE_QUERY=$( (echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"e2e-remote-test","version":"1.0"}}}'; sleep 1; echo '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"query_memory","arguments":{"query":"test","k":1}}}') | run_with_timeout 20s node "$MCP_CLI" --url "$RPI_URL" --token "$RPI_TOKEN" 2>&1 || true)

    if echo "$REMOTE_QUERY" | grep -q '"id":2'; then
        pass "Remote proxy tool call works"
    else
        echo "Output: $REMOTE_QUERY"
        fail "Remote proxy tool call failed"
    fi
fi

echo ""

# ─────────────────────────────────────────────────────────────────
# TEST 3: HTTP Transport (if local stack running)
# ─────────────────────────────────────────────────────────────────
echo "▶ TEST 3: HTTP Transport (localhost:8626)"
echo "────────────────────────────────────"

if curl -s http://localhost:8626/health > /dev/null 2>&1; then
    HEALTH=$(curl -s http://localhost:8626/health)
    if echo "$HEALTH" | grep -q '"ok":true'; then
        VERSION=$(echo "$HEALTH" | grep -oE '"version":"[0-9.]+"')
        pass "Local HTTP health check ($VERSION)"
    else
        warn "Local HTTP health returned unexpected response"
    fi

    # Test SSE headers requirement
    HTTP_INIT=$(curl -s -X POST \
        -H "Content-Type: application/json" \
        -H "Accept: application/json, text/event-stream" \
        -d '{"jsonrpc":"2.0","method":"initialize","params":{"protocolVersion":"2024-11-05","clientInfo":{"name":"e2e-http","version":"1.0"},"capabilities":{}},"id":1}' \
        http://localhost:8626/mcp)

    if echo "$HTTP_INIT" | grep -q '"serverInfo"'; then
        pass "Local HTTP MCP accepts SSE headers"
    else
        echo "$HTTP_INIT"
        fail "Local HTTP MCP SSE headers test failed"
    fi
else
    warn "Local stack not running (localhost:8626), skipping HTTP tests"
    echo "   Run: npx @cybermem/cli up"
fi

echo ""
echo "═══════════════════════════════════════════════════════════"
echo -e "  ${GREEN}All tests passed!${NC}"
echo "═══════════════════════════════════════════════════════════"
