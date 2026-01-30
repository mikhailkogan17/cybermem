## Summary
Finalizes the Agile infrastructure by refining workflows and adding community funding.

## Changes
- **[MOD] Agent-PR**: Now calls 'gh pr create' using a direct description input (via env) instead of a file.
- **[NEW] FUNDING.yml**: Added GitHub Sponsors + thanks.dev.
- **[MOD] Dangerfile**: Enforces PR Template (Summary/Changes sections).
- **[FIX] Pre-commit**: Added PATH fix for Homebrew/NPM detection.

## Verification
- [ ] Verify PR created (Manual Bootstrap required for input schema change).
- [ ] Verify Funding button appears in repo.
