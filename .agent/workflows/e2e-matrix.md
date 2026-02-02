---
description: Run the full E2E Verification Matrix (Local, RPi, VPS)
---
# E2E Verification Matrix

1. Setup Credentials
[Check _credentials]
view_file .agent/workflows/_credentials.md

2. Build Automation
```bash
# Ensure CLI and E2E scripts are built
npm run build -w @cybermem/cli
```

3. Run Verification
```bash
# Usage: /e2e-matrix [environment]
if [ -z "$1" ]; then
  npx tsx packages/cli/e2e/e2e.ts
else
  npx tsx packages/cli/e2e/e2e.ts --only-testing "$1"
fi
```
