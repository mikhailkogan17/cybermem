---
description: Run Playwright E2E tests for RPi environment (raspberrypi.local)
---

# RPi Environment Playwright Tests

// turbo-all

## Prerequisites

1. RPi accessible at `raspberrypi.local` (or via Tailscale)
2. CyberMem stack running on RPi
3. SSH access configured

---

## Step 0: Config Validation (MANDATORY)

> [!CAUTION]
> **DO NOT SKIP THIS STEP.** Validate before any happy path testing.

### 0.1 Check RPi SSH
```bash
ssh pi@raspberrypi.local 'echo "SSH OK"'
```
**Expected:** `SSH OK`

### 0.2 Check RPi Containers
```bash
ssh pi@raspberrypi.local 'docker ps --format "{{.Names}}: {{.Status}}" | grep -E "openmemory|traefik|db-exporter"'
```
**Expected:** All containers Up and healthy

### 0.3 Check RPi Health Endpoint
```bash
ssh pi@raspberrypi.local 'curl -s http://localhost:8626/health | jq .ok'
```
**Expected:** `true`

### 0.4 Check RPi db-exporter
```bash
ssh pi@raspberrypi.local 'curl -s http://localhost:8000/api/stats | jq .memoryRecords'
```
**Expected:** Number (0 or more). If 404 → db-exporter needs updated exporter.py

### 0.5 Verify Antigravity MCP Config for RPi

Test that `cybermem-rpi` MCP server is reachable:
```bash
# Use Antigravity MCP tool: mcp_cybermem-rpi_list_memories
# Should return memories array, NOT 404
```

**If 404:** Check Antigravity config:
- URL should be `https://raspberrypi.local:8626` (with HTTPS) or Tailscale URL
- API key must be set if remote mode

**Common fixes:**
- Update db-exporter: `scp exporter.py pi@raspberrypi.local:/tmp/ && ssh pi 'docker cp /tmp/exporter.py cybermem-db-exporter:/app/exporter.py && docker restart cybermem-db-exporter'`

---

## Step 1: Happy Path Test

### 1.1 Wipe RPi Database
```bash
ssh pi@raspberrypi.local 'docker exec cybermem-openmemory sh -c "rm -f /data/openmemory.sqlite*"; docker restart cybermem-openmemory cybermem-log-exporter; sleep 10; docker restart cybermem-db-exporter'
```

### 1.2 Wait for Health
```bash
ssh pi@raspberrypi.local 'for i in $(seq 1 30); do curl -s http://localhost:8626/health | grep -q ok && echo "Health OK" && break || sleep 2; done'
```

### 1.3 MCP CRUD via Antigravity

> [!CAUTION]
> **FORBIDDEN TO USE CURL.** Use only Antigravity MCP tools.

1. **CREATE:** Use `mcp_cybermem-rpi_add_memory` to add 3 memories
2. **READ:** Use `mcp_cybermem-rpi_query_memory` to search

### 1.4 Verify Dashboard

```bash
ssh pi@raspberrypi.local 'curl -s http://localhost:8000/api/stats' | jq '.'
```

**Required assertions:**

| Metric            | Expected                                              |
| ----------------- | ----------------------------------------------------- |
| `topWriter.name`  | Contains "antigravity" (raw, normalized on dashboard) |
| `lastWriter.name` | Contains "antigravity"                                |
| `memoryRecords`   | 3 (or number of created)                              |

---

## Environment Variables

| Variable      | Example                            | Description      |
| ------------- | ---------------------------------- | ---------------- |
| `RPI_URL`     | https://raspberrypi.local:8626/mcp | MCP endpoint     |
| `RPI_API_KEY` | your-api-key                       | API key for auth |
| `RPI_HOST`    | pi@raspberrypi.local               | SSH host         |
