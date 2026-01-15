---
description: Run Playwright E2E tests for local environment (localhost:3000 dashboard, localhost:8626 API)
---

# Local Environment Playwright Tests

// turbo-all

## Prerequisites

Ensure the local stack is running (use `/stack-local` workflow).

## Run All E2E Tests

1. [!IMPORTANT] [!REQUIRED] MANUAL HAPPY PATH ON PROD:
(0) ask user to add cybermem-rpi server in Antigravity config.
Provide a valid JSON file WITHOUT ANY API TOKEN, OR write it yourself.
Wait for the user to refresh.
(1) Wipe the local OpenMemory database
(1) Add CRUD with MCP
> [!ATTENTION]
> FORBIDDEN TO USE CURL IN HAPPY PATH FLOW. Use it ONLY to debug.
(2) CHECK DASHBOARD:
- Antigravity should be the last reader, the last writer, the top reader, and the top writer. NOT OTHER CLIENTS, NOT N/A.
- All 4 time series should contain "Antigravity" line WITH NONNULL DATA.
- Audit log should be valid and non-empty
> [!ATTENTION]
> Everywhere should be only ONE single name: "Antigravity". NOT "cybermem", "test", "npm", "bash", "node", "curl", "Mozilla", "antigravity", "N/A".

2. Run all playwright tests with Chromium:
```bash
npm run test:e2e -- --project=chromium
```

## Run Specific Test Suites

```bash
# CRUD Happy Path with X-Client-Name verification
npm run test:e2e -- crud-happy-path.spec.ts

# Metrics & Visualization
npm run test:e2e -- metrics.spec.ts

# Audit Log Export
npm run test:e2e -- audit-export.spec.ts

# Authentication
npm run test:e2e -- auth.spec.ts

# Config UI
npm run test:e2e -- config-ui.spec.ts
```

## Run with UI (Debug Mode)

```bash
npx playwright test --ui
```

## View Last Report

```bash
npx playwright show-report
```

## Environment Variables

| Variable   | Default               | Description                  |
| ---------- | --------------------- | ---------------------------- |
| `BASE_URL` | http://localhost:3000 | Dashboard URL                |
| `CI`       | -                     | Set in CI to disable retries |
