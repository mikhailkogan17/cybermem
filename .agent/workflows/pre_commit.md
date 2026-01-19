---
description: Pre-commit checks — run all tests, linters, and security checks before committing
---

# Pre-Commit Gatekeeper

// turbo-all

> [!CAUTION]
> **MANDATORY before ANY commit to main.** No exceptions. Agent must verify pass before git commit.

---

## TL;DR — Run This

```bash
# Single command — runs atomic test pyramid
./.hooks/pre-commit
# Expected: "✅ GATEKEEPER PASSED"
```

If gatekeeper fails: **FIX THE ERROR. DO NOT --force commit.**

---

## Atomic Test Pyramid

| Layer | What                    | Command                 | Time   |
| ----- | ----------------------- | ----------------------- | ------ |
| 1     | Static (lint, types)    | Automatic               | ~10s   |
| 2     | Unit (MCP STDIO)        | Automatic               | ~5s    |
| 3     | Integration (Docker)    | Requires running stack  | ~3s    |

**Total: ~20s** — runs automatically on every commit.

---

## Layer 1: Static Analysis

Runs without Docker. Catches 80% of issues.

- [x] **Secrets scan** — gitleaks (prevents API key leaks)
- [x] **TypeScript** — `tsc --noEmit` (catches type errors)
- [x] **Lint** — ESLint (catches code style issues)
- [x] **MCP build** — `npm run build` (catches syntax errors)

---

## Layer 2: Unit Tests

Runs without Docker. Catches protocol bugs.

- [x] **MCP STDIO** — Sends initialize request, expects serverInfo response
- [x] **Auth-sidecar** — Syntax check

### MCP STDIO Test Rationale

This catches:
- Missing Accept headers (SSE compatibility)
- Broken JSON-RPC protocol
- Initialization failures
- Export/import issues

---

## Layer 3: Integration Tests

Requires local Docker stack (`npx @cybermem/cli up`).

- [x] **MCP Health** — `localhost:8626/health` → `{"ok":true}`
- [x] **Dashboard Health** — `localhost:3000/api/health` → `{"overall":"ok"}`
- [x] **Metrics API** — `localhost:3000/api/metrics` → has stats
- [x] **Traefik Routing** — `/mcp` not 404 (middleware works)

### Dashboard Data Flow Check

Prevents empty dashboard regression:
```
MCP CRUD → SQLite → db-exporter → Dashboard API → UI cards
```

If stats.memoryRecords > 0 but UI shows 0 → data pipeline broken.

---

## Agent Protocol

### Before Commit

```
1. Make changes
2. Run: ./.hooks/pre-commit
3. If FAILED → fix errors → goto 2
4. If PASSED → git commit
```

### Before Push/Publish

```
1. Gatekeeper PASSED ✓
2. Run: npm run test:e2e -- ui-elements.spec.ts
   Expected: 12 passed
3. Run: ./tools/test_mcp_modes.sh  
   Expected: All tests passed
4. Only then: git push / npm publish
```

---

## Common Failures

| Error | Fix |
|-------|-----|
| "SECRETS DETECTED" | Remove API keys from code, use .env |
| "TypeScript errors" | Fix type issues in packages/dashboard |
| "MCP STDIO failed" | Check packages/mcp/src/index.ts exports |
| "MCP health 404" | Run `/stack-local` workflow |
| "Dashboard health failed" | `docker restart cybermem-dashboard` |
| "Traefik 404 on /mcp" | Check middleware labels in docker-compose |

---

## Install Hook

```bash
cp .hooks/pre-commit .git/hooks/pre-commit && chmod +x .git/hooks/pre-commit
```

Now gatekeeper runs automatically on every `git commit`.
