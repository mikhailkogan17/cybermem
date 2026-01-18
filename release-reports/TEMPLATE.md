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

## 4. Warnings / Known Issues

- [ ] I have checked the `full_log.txt` (if generated) for any suspicious errors.
- [ ] I have reviewed the `git diff` for any accidental secrets or debug code.

---

**Signed off by**: (Your Name / Agent Model)
