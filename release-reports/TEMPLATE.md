# Release Report

> [!IMPORTANT]
> This report MUST be verified and checked before every commit to main/release.
> Run manual checks and mark checkboxes with `[x]`.

## 1. Local Verification (`/test-local`)

- [ ] **Run Command**: `npm run test:e2e local` (in `packages/cli`)
- [ ] **Result**: PASSED
- [ ] **Screenshot**: (Paste screenshot of passing tests here)

## 2. Backup/Restore Verification (`/test-backup-restore`)

- [ ] **Run Command**: `npx @cybermem/cli backup` -> `reset` -> `restore`
- [ ] **Result**: PASSED
- [ ] **Screenshot**: (Paste proof of restored data)

## 🛠 Manual Verification (v0.7.0+)

> [!IMPORTANT]
> **All checkboxes must be [x] and screenshots attached before final release.**

### 1. Dashboard Metrics (Visual Check)

- [ ] **Metric Cards**: `Memory Records`, `Total Clients`, `Total Requests`, `Success Rate` have non-zero or expected values.
- [ ] **Screenshot Required**: Metric Cards section.
- [ ] **Client Cards**: `Last Writer` and `Last Reader` show "Antigravity".
- [ ] **STRICT**: No "node", "curl", "axios", or "cybermem-.\*" in display names.
- [ ] **Screenshot Required**: Last Writer/Reader Card.

### 2. UI Health & State

- [ ] **Header**: "All Systems OK" badge is visible and green.
- [ ] **Next.js Error Widget**: Bottom left shows NO issues/errors.
- [ ] **Settings Modal**: Versions are properly aligned (`v0.7.0`), Environment shows "Production / Local Instance".
- [ ] **Screenshot Required**: Settings Modal layout.

### 3. CRUD Verification

- [ ] **MCP Tool Call**: `add_memory` successful via Antigravity.
- [ ] **Audit Log**: New operations visible with correct client names.

## 4. Warnings / Known Issues

- [ ] I have checked the `full_log.txt` (if generated) for any suspicious errors.
- [ ] I have reviewed the `git diff` for any accidental secrets or debug code.

---

**Signed off by**: Antigravity
