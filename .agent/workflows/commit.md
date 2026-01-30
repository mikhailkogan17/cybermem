---
description: Commit changes with pre-commit checks and correct author attribution
---
# Commit Changes

1. Setup Credentials
[Check _credentials]
view_file .agent/workflows/_credentials.md

2. Run Pre-commit Checks
```bash
./.hooks/pre-commit
```

3. Commit
```bash
# Usage: /commit "Commit message"
git add .
git commit -m "$1"
```
