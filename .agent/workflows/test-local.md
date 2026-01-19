---
description: Run Playwright E2E tests for local environment (localhost:3000 dashboard, localhost:8626 API)
---

# Local Environment Happy Path Test

// turbo-all

---

## Quick Reference

| Service           | Port | Health Check                            |
| ----------------- | ---- | --------------------------------------- |
| MCP/API (Traefik) | 8626 | `curl http://localhost:8626/health`     |
| Dashboard         | 3000 | `curl http://localhost:3000/api/health` |

---

## Step 0: Config Validation (MANDATORY)

> [!CAUTION]
> **DO NOT SKIP.** Run these checks first, fix any issues before proceeding.

### 0.1 Check All Services

```bash
# All must return 200 OK
curl -s http://localhost:8626/health | jq '.ok'  # → true
curl -s http://localhost:3000/api/health | jq '.overall'  # → "ok"
curl -s http://localhost:3000/api/metrics | jq '.stats.memoryRecords'  # → number
```

### 0.2 (Optional) Run Playwright Infra Check

```bash
cd /Users/mikhailkogan/cybermem/packages/dashboard
npm run test:e2e -- infra-check.spec.ts
# Expected: 7 passed
```

### 0.3 Verify Antigravity MCP

Use `mcp_cybermem-local_list_memories` — should work without 404.

**If fails:**

- Restart containers: `docker restart cybermem-openmemory cybermem-db-exporter cybermem-log-exporter`
- Wait 30s, retry

---

## Step 1: Happy Path Test

### 1.1 Wipe Database (Local)

```bash
rm -f ~/.cybermem/data/openmemory.sqlite*
npx @cybermem/cli up
# Wait for health (up to 60s for embeddings init)
for i in {1..30}; do curl -s http://localhost:8626/health | grep -q true && break || sleep 2; done
sleep 5
```

### 1.2 MCP CRUD via Antigravity

> [!CAUTION]
> **FORBIDDEN TO USE CURL for CRUD.** Use only Antigravity MCP tools.

**CREATE (3 memories):**

```
mcp_cybermem-local_add_memory(content: "Happy Path Test #1 - verification", tags: ["happy-path", "local"])
mcp_cybermem-local_add_memory(content: "Happy Path Test #2 - second entry", tags: ["happy-path", "local"])
mcp_cybermem-local_add_memory(content: "Happy Path Test #3 - final entry", tags: ["happy-path", "local"])
```

**READ:**

```
mcp_cybermem-local_query_memory(query: "Happy Path Test", k: 3)
```

### 1.3 Verify Dashboard Metrics

```bash
curl -s http://localhost:3000/api/metrics | jq '.stats'
```

**Required Results:**

| Metric            | Expected      |
| ----------------- | ------------- |
| `memoryRecords`   | 3             |
| `topWriter.name`  | "Antigravity" |
| `topReader.name`  | "Antigravity" |
| `lastWriter.name` | "Antigravity" |
| `lastReader.name` | "Antigravity" |

> [!ATTENTION]
> **Only "Antigravity"** — NOT: "cybermem", "curl", "node", "N/A", "antigravity-client"
> (Raw "antigravity-client" from db-exporter is normalized to "Antigravity" by dashboard API)

---

## Step 2: UI Elements Validation (MANDATORY)

> [!IMPORTANT]
> **Run AFTER Step 1** to verify all UI components display correctly.

```bash
cd /Users/mikhailkogan/cybermem/packages/dashboard
SKIP_DB_RESET=true npm run test:e2e -- ui-elements.spec.ts
# Expected: 12 passed (visibility, functional, data)
```

**What it validates:**

- Header: Logo, title, All Systems badge
- MetricCards: All 4 numeric values visible
- ClientCards: Top/Last Writer/Reader
- ChartCards: All 4 charts with period selector
- AuditLog: Table, sorting
- Modals: Settings and MCP Config open correctly

---

## Step 3: Full E2E Suite (Optional)

```bash
cd /Users/mikhailkogan/cybermem/packages/dashboard
SKIP_DB_RESET=true npm run test:e2e -- --project=chromium
```

---

## Common Issues

| Issue             | Fix                                                                                      |
| ----------------- | ---------------------------------------------------------------------------------------- |
| db-exporter 500   | `docker restart cybermem-log-exporter && sleep 5 && docker restart cybermem-db-exporter` |
| Dashboard timeout | Check `DB_EXPORTER_URL` env or restart db-exporter                                       |
| MCP 404           | Check Antigravity config, refresh after changes                                          |
| reads not tracked | Requires log-exporter update (v0.6.3+)                                                   |
