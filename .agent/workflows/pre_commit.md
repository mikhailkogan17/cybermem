---
description: Pre-commit checks — run all tests, linters, and security checks before committing
---

# Pre-Commit Comprehensive Check

// turbo-all

> [!IMPORTANT]
> **Run this workflow BEFORE any commit to main branch.**
> Prevents regressions and ensures code quality.

---

## Quick Summary

| Check         | Command                                   | Pass Criteria    |
| ------------- | ----------------------------------------- | ---------------- |
| Linters       | `npm run lint` (in each package)          | No errors        |
| TypeScript    | `npm run typecheck` or `tsc --noEmit`     | No errors        |
| Unit Tests    | `npm test`                                | All pass         |
| E2E Tests     | `npm run test:e2e -- ui-elements.spec.ts` | 12+ passed       |
| Secrets Check | `git secrets --scan` or `gitleaks detect` | No secrets found |

---

## Step 0: Secrets Scan (MANDATORY)

> [!CAUTION]
> **Never commit secrets.** Run this first.

### 0.1 Using gitleaks (recommended)

```bash
# Install if needed: brew install gitleaks
gitleaks detect --source . --verbose
# Expected: No leaks detected
```

### 0.2 Alternative: git-secrets

```bash
# Install if needed: brew install git-secrets
git secrets --scan
# Expected: no secrets found
```

---

## Step 1: Linters and Type Checks

### 1.1 Dashboard Lint

```bash
cd /Users/mikhailkogan/cybermem/packages/dashboard
npm run lint
# Expected: No errors (warnings OK)
```

### 1.2 TypeScript Check

```bash
cd /Users/mikhailkogan/cybermem/packages/dashboard
npx tsc --noEmit
# Expected: No errors
```

### 1.3 MCP Package Lint

```bash
cd /Users/mikhailkogan/cybermem/packages/mcp
npm run lint 2>/dev/null || npx eslint src/
# Expected: No errors
```

---

## Step 2: E2E Tests (Local Stack Required)

> [!IMPORTANT]
> Requires local Docker stack running. See `/stack-local` workflow.

### 2.1 Infrastructure Check

```bash
cd /Users/mikhailkogan/cybermem/packages/dashboard
npm run test:e2e -- infra-check.spec.ts
# Expected: 7 passed
```

### 2.2 UI Elements Test

```bash
cd /Users/mikhailkogan/cybermem/packages/dashboard
SKIP_DB_RESET=true npm run test:e2e -- ui-elements.spec.ts
# Expected: 12 passed
```

### 2.3 Full E2E Suite (Optional, takes longer)

```bash
cd /Users/mikhailkogan/cybermem/packages/dashboard
SKIP_DB_RESET=true npm run test:e2e -- --project=chromium
# Expected: All specs pass
```

---

## Step 3: Run Test Workflows

### 3.1 Test Local Environment

Reference: `/test-local` workflow

- Step 0: Config Validation ✓
- Step 1: Happy Path Test ✓
- Step 2: UI Elements Validation ✓

### 3.2 Test RPi (Readonly)

Reference: `/test-rpi` workflow

- Step 0: Validation ✓
- Step 1: Readonly Tests ✓
- Step 2: Readonly UI Validation ✓

---

## Step 4: Pre-Commit Checklist

Before running `git commit`:

- [ ] `gitleaks detect` — no secrets
- [ ] `npm run lint` — no errors in dashboard
- [ ] `tsc --noEmit` — no TypeScript errors
- [ ] `infra-check.spec.ts` — 7 passed
- [ ] `ui-elements.spec.ts` — 12 passed
- [ ] Visual check of `http://localhost:3000` — no UI regressions

---

## Common Issues

| Issue                  | Fix                                      |
| ---------------------- | ---------------------------------------- |
| gitleaks not installed | `brew install gitleaks`                  |
| E2E tests fail         | Run `/stack-local` first, check Docker   |
| TypeScript errors      | Fix type issues or update types          |
| Lint errors            | Run `npm run lint -- --fix` for auto-fix |
