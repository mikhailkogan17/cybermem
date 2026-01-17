---
description: Run Playwright E2E tests for RPi environment (raspberrypi.local)
---

# RPi Environment Tests (READONLY)

// turbo-all

> [!CAUTION]
> **RPi is PRODUCTION memory.** Never wipe database. Readonly tests only.

---

## Quick Reference

| Service | Tailscale URL Pattern                                  |
| ------- | ------------------------------------------------------ |
| MCP/API | `https://raspberrypi.tail<NET>.ts.net/cybermem/memory` |

**Antigravity Config:** `~/.gemini/antigravity/mcp_config.json`

---

## Step 0: Validation (MANDATORY)

### 0.1 SSH Access

```bash
ssh pi@raspberrypi.local 'echo "SSH OK"'
```

### 0.2 Check Containers

```bash
ssh pi@raspberrypi.local 'docker ps --format "{{.Names}}: {{.Status}}" | grep cybermem'
```

### 0.3 Check Health

```bash
ssh pi@raspberrypi.local 'curl -s http://localhost:8626/health | jq .ok'
# → true
```

### 0.4 Check Stats

```bash
ssh pi@raspberrypi.local 'curl -s http://localhost:8000/api/stats | jq .'
```

---

## Step 1: Readonly Tests

> [!IMPORTANT]
> **DO NOT WIPE DATABASE.** Read operations only.

### 1.1 List Memories (via Antigravity)

```
mcp_cybermem_list_memories(limit: 10)
```

### 1.2 Query Memories

```
mcp_cybermem_query_memory(query: "user context", k: 5)
```

### 1.3 Check Instructions Injection

```bash
curl -s -X POST -H 'Content-Type: application/json' -H 'Accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}}}' \
  https://raspberrypi.tail<NET>.ts.net/cybermem/mcp | jq '.result.instructions'
```

**Expected:** Instructions field present (if injector deployed)

---

## Step 2: Readonly UI Validation (Playwright)

> [!IMPORTANT]
> **Read-only tests only.** These tests verify UI displays correctly without modifying data.

### 2.1 Run UI Elements Tests Against RPi Dashboard

```bash
cd /Users/mikhailkogan/cybermem/packages/dashboard
BASE_URL=http://raspberrypi.local:3000 npm run test:e2e -- ui-elements.spec.ts --project=chromium
# Expected: 12 passed
```

### 2.2 Run Infra Check Against RPi

```bash
cd /Users/mikhailkogan/cybermem/packages/dashboard
BASE_URL=http://raspberrypi.local:3000 \
DB_EXPORTER_URL=http://raspberrypi.local:8000 \
MCP_URL=http://raspberrypi.local:8626 \
npm run test:e2e -- infra-check.spec.ts --project=chromium
# Expected: 7 passed
```

**What it validates (readonly):**

- Dashboard loads and shows data
- All metric cards display values
- Charts render correctly
- Audit log table works
- No data is modified

---

## To Deploy Changes to RPi

> [!WARNING]
> **BACKUP FIRST** before any deployment:
>
> ```bash
> ssh pi@raspberrypi.local 'cd ~/.cybermem && tar -czf ~/cybermem-backup-$(date +%Y%m%d-%H%M%S).tar.gz data/'
> ```

Then deploy files and restart containers.
