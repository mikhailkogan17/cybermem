# Release Report

> [!IMPORTANT]
> This report MUST be verified and checked before every commit to main/release.
> Run manual checks and mark checkboxes with `[x]`.

## 1. Local Verification (`/test-local`)

- [x] **Run Command**: `npm run test:e2e local` (in `packages/cli`)
- [x] **Result**: PASSED
- [x] **Screenshot**:
      ![Dashboard Home](file:///Users/mikhailkogan/cybermem/release-reports/evidence/v0.6.15/dashboard_home.png)

## 2. Backup/Restore Verification (`/test-backup-restore`)

- [x] **Run Command**: `npx @cybermem/cli backup` -> `reset` -> `restore`
- [x] **Result**: PASSED
- [x] **Screenshot**: (Integrity checksum verified in flow test)

## 3. Dashboard Display Verification (Visual Check)

- [x] **Top/Last Writer Card**: Shows valid client name (Verified).
- [x] **Audit Log**:
      ![Audit Log](file:///Users/mikhailkogan/cybermem/release-reports/evidence/v0.6.15/audit_log.png)
- [x] **Settings Modal (Polished Buttons)**:
      ![Settings Modal](file:///Users/mikhailkogan/cybermem/release-reports/evidence/v0.6.15/settings_modal.png)

## 4. Warnings / Known Issues

- [x] I have checked the `full_log.txt` (if generated) for any suspicious errors.
- [x] I have reviewed the `git diff` for any accidental secrets or debug code.

---

**Signed off by**: Antigravity (Gemini 2.0 Flash)
