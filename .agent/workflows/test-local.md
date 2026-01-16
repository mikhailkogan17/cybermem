---
description: Run Playwright E2E tests for local environment (localhost:3000 dashboard, localhost:8626 API)
---

# Local Environment Playwright Tests

// turbo-all

## Prerequisites

Ensure the local stack is running (use `/stack-local` workflow).

---

## Step 0: Config Validation (MANDATORY)

> [!CAUTION]
> **DO NOT SKIP THIS STEP.** Validate before any happy path testing.

### 0.1 Check MCP Server Availability
```bash
# Must return {"ok":true,...}
curl -s http://localhost:8626/health | jq '.ok'
```
**Expected:** `true`

### 0.2 Check Dashboard API
```bash
# Must return memoryRecords (number, can be 0)
curl -s http://localhost:3000/api/metrics | jq '.stats.memoryRecords'
```
**Expected:** Number (0 or more)

### 0.3 Check db-exporter
```bash
# Must NOT return 404 or error
curl -s http://localhost:8000/api/stats | jq '.memoryRecords'
```
**Expected:** Number (0 or more)

### 0.4 Run Playwright Infrastructure Check (RECOMMENDED)
```bash
cd /Users/mikhailkogan/cybermem/packages/dashboard
npm run test:e2e -- infra-check.spec.ts
```
**Expected:** 7 tests pass

### 0.5 Verify Antigravity MCP Config
The `cybermem-local` MCP server in Antigravity must be configured. Use `mcp_cybermem-local_list_memories` to test.

**If any check fails:** Fix the issue before proceeding. Common fixes:
- `docker restart cybermem-openmemory cybermem-db-exporter cybermem-log-exporter`
- Check `/stack-local` workflow

---

## Step 1: Happy Path Test

### 1.1 Wipe Database (Clean Slate)
```bash
docker exec cybermem-openmemory sh -c 'rm -f /data/openmemory.sqlite*'
docker run --rm -v cybermem-openmemory-data:/data alpine sh -c 'chown -R 1001:1001 /data && chmod 777 /data'
docker restart cybermem-openmemory
# Wait for health
for i in {1..30}; do curl -s http://localhost:8626/health | grep -q ok && break || sleep 2; done
docker restart cybermem-log-exporter cybermem-db-exporter
sleep 5
```

### 1.2 MCP CRUD via Antigravity

> [!CAUTION]
> **FORBIDDEN TO USE CURL.** Use only Antigravity MCP tools.

1. **CREATE:** Use `mcp_cybermem-local_add_memory` to add 3 memories
2. **READ:** Use `mcp_cybermem-local_query_memory` to search

### 1.3 Verify Dashboard

Check API response:
```bash
curl -s http://localhost:3000/api/metrics | jq '.stats'
```

**Required assertions:**

| Metric            | Expected                 |
| ----------------- | ------------------------ |
| `topWriter.name`  | "Antigravity"            |
| `topReader.name`  | "Antigravity"            |
| `lastWriter.name` | "Antigravity"            |
| `lastReader.name` | "Antigravity"            |
| `memoryRecords`   | 3 (or number of created) |

> [!ATTENTION]
> **Only "Antigravity"** should appear. NOT: "cybermem", "curl", "node", "N/A", "antigravity-client"

---

## Step 2: Playwright Tests (Optional)

```bash
cd /Users/mikhailkogan/cybermem/packages/dashboard
SKIP_DB_RESET=true npm run test:e2e -- --project=chromium
```

## Environment Variables

| Variable   | Default               | Description                  |
| ---------- | --------------------- | ---------------------------- |
| `BASE_URL` | http://localhost:3000 | Dashboard URL                |
| `CI`       | -                     | Set in CI to disable retries |
