---
description: Run Playwright E2E tests for RPi environment (raspberrypi.local)
---

# RPi Environment Happy Path Test

// turbo-all

---

## Quick Reference

| Service     | Local Port | Tailscale URL Pattern                                  |
| ----------- | ---------- | ------------------------------------------------------ |
| MCP/API     | 8626       | `https://raspberrypi.tail<NET>.ts.net/cybermem/memory` |
| db-exporter | 8000       | N/A (SSH only)                                         |

**Antigravity Config:** `~/.gemini/antigravity/mcp_config.json`

---

## Step 0: Config Validation (MANDATORY)

### 0.1 SSH Access
```bash
ssh pi@raspberrypi.local 'echo "SSH OK"'
# → SSH OK
```

### 0.2 Check RPi Containers
```bash
ssh pi@raspberrypi.local 'docker ps --format "{{.Names}}: {{.Status}}" | grep cybermem'
# → All containers Up
```

### 0.3 Check Health (via SSH)
```bash
ssh pi@raspberrypi.local 'curl -s http://localhost:8626/health | jq .ok'
# → true
```

### 0.4 Check db-exporter
```bash
ssh pi@raspberrypi.local 'curl -s http://localhost:8000/api/stats | jq .memoryRecords'
# → number (0 or more)
```
**If 404:** Update db-exporter on RPi (see Common Issues)

### 0.5 Verify Antigravity MCP for RPi

**Config Location:** `~/.gemini/antigravity/mcp_config.json`

**Correct Format:**
```json
{
  "cybermem-rpi": {
    "command": "npx",
    "args": [
      "-y", "@cybermem/mcp@latest",
      "--url", "https://raspberrypi.tail<YOUR-TAILNET>.ts.net/cybermem/memory",
      "--api-key", "<YOUR-API-KEY>"
    ]
  }
}
```

> [!IMPORTANT]
> - URL must end with `/cybermem/memory` (NOT `/mcp`)
> - MCP package appends `/add`, `/query`, `/all` to this URL
> - After config change: **MUST refresh Antigravity** (Cmd+Shift+P → Reload)

**Test:** `mcp_cybermem-rpi_list_memories` — should return memories, NOT 404

---

## Step 1: Happy Path Test

### 1.1 Wipe RPi Database
```bash
ssh pi@raspberrypi.local 'docker exec cybermem-openmemory sh -c "rm -f /data/openmemory.sqlite*"'
ssh pi@raspberrypi.local 'docker restart cybermem-openmemory cybermem-log-exporter'
sleep 10
ssh pi@raspberrypi.local 'docker restart cybermem-db-exporter'
```

### 1.2 Wait for Health
```bash
ssh pi@raspberrypi.local 'for i in $(seq 1 30); do curl -s http://localhost:8626/health | grep -q ok && echo "Health OK" && break || sleep 2; done'
# → Health OK
```

### 1.3 MCP CRUD via Antigravity

> [!CAUTION]
> **FORBIDDEN TO USE CURL.** Use only Antigravity MCP tools.

**CREATE (3 memories):**
```
mcp_cybermem-rpi_add_memory(content: "RPi Happy Path Test #1", tags: ["happy-path", "rpi"])
mcp_cybermem-rpi_add_memory(content: "RPi Happy Path Test #2", tags: ["happy-path", "rpi"])
mcp_cybermem-rpi_add_memory(content: "RPi Happy Path Test #3", tags: ["happy-path", "rpi"])
```

**READ:**
```
mcp_cybermem-rpi_query_memory(query: "RPi Happy Path", k: 3)
```

### 1.4 Verify RPi Stats
```bash
ssh pi@raspberrypi.local 'curl -s http://localhost:8000/api/stats' | jq '.'
```

**Required Results:**

| Metric            | Expected                   |
| ----------------- | -------------------------- |
| `memoryRecords`   | 3                          |
| `topWriter.name`  | "antigravity-client" (raw) |
| `lastWriter.name` | "antigravity-client" (raw) |

> [!NOTE]
> RPi db-exporter returns raw names. Dashboard API normalizes "antigravity-client" → "Antigravity"

---

## Common Issues

| Issue           | Fix                                                                                |
| --------------- | ---------------------------------------------------------------------------------- |
| MCP 404         | 1. URL must end with `/cybermem/memory` 2. Refresh Antigravity after config change |
| db-exporter 404 | Update exporter.py on RPi (see below)                                              |
| ETIMEDOUT       | Tailscale not connected, check `tailscale status`                                  |
| Container busy  | Stop container first, then cp: `docker stop X && docker cp ... && docker start X`  |

### Update db-exporter on RPi
```bash
scp /Users/mikhailkogan/cybermem/packages/cli/templates/monitoring/db_exporter/exporter.py pi@raspberrypi.local:/tmp/
ssh pi@raspberrypi.local 'docker stop cybermem-db-exporter && docker cp /tmp/exporter.py cybermem-db-exporter:/app/exporter.py && docker start cybermem-db-exporter'
```
