---
description: Master workflow - complete system health check and maintenance
---

# System Health Check (Master Workflow)

// turbo-all

> [!IMPORTANT]
> Run this workflow weekly or before any demo/interview to ensure system is production-ready.

---

## Quick Status Check

// turbo

```bash
# RPi health (must return "ok")
curl -s http://raspberrypi.local:8626/health | jq -r '.overall'

# NPM versions
npm view @cybermem/mcp version && npm view @cybermem/cli version
```

---

## Step 1: Infrastructure Health

### 1.1 RPi Services

```bash
ssh pi@raspberrypi.local 'docker ps --format "{{.Names}}: {{.Status}}" | grep cybermem'
```

**Expected:** All 6 services running (traefik, mcp, dashboard, auth-sidecar, db-exporter, log-exporter)

### 1.2 Tailscale Funnel

```bash
curl -s --max-time 5 https://raspberrypi.tail7242ed.ts.net/cybermem/health | jq -r '.overall'
```

**Expected:** `ok`

### 1.3 Dashboard Auth

```bash
curl -sI https://raspberrypi.tail7242ed.ts.net/cybermem/dashboard 2>&1 | grep -E "HTTP|location"
```

**Expected:** 307 redirect to `/api/auth/token?error=no_token`

---

## Step 2: MCP Protocol

### 2.1 Initialize (via curl)

```bash
curl -s -X POST \
  -H 'Authorization: Bearer sk-7d98adc9035773de15615de8a5c0905e' \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"health-check","version":"1.0"}},"id":1}' \
  http://raspberrypi.local:8626/mcp | jq -r '.result.serverInfo.name'
```

**Expected:** `cybermem`

### 2.2 Via Antigravity

```
mcp_cybermem_list_memories(limit: 3)
```

**Expected:** Returns memories array

---

## Step 3: Documentation Sync

Run `/refresh-docs` workflow.

---

## Step 4: Version Alignment

```bash
# Local packages
grep '"version"' packages/*/package.json

# NPM packages
npm view @cybermem/mcp version && npm view @cybermem/cli version
```

If versions don't match, run `/release` workflow.

---

## Step 5: Generate Report

| Component      | Status | Notes |
| -------------- | ------ | ----- |
| RPi Docker     | ✅/❌    |       |
| Tailscale      | ✅/❌    |       |
| Dashboard Auth | ✅/❌    |       |
| MCP Protocol   | ✅/❌    |       |
| Docs Sync      | ✅/❌    |       |
| NPM Versions   | ✅/❌    |       |

---

## Common Fixes

| Issue                 | Command                                                                                            |
| --------------------- | -------------------------------------------------------------------------------------------------- |
| RPi containers down   | `ssh pi@raspberrypi.local 'cd ~/.cybermem && docker-compose up -d'`                                |
| Tailscale funnel off  | `ssh pi@raspberrypi.local 'sudo tailscale funnel --bg --set-path /cybermem http://127.0.0.1:8626'` |
| Stale images          | `ssh pi@raspberrypi.local 'docker-compose pull && docker-compose up -d'`                           |
| Submodule out of sync | `cd ~/cybermem-landing && git submodule update --remote vendor/cybermem`                           |
