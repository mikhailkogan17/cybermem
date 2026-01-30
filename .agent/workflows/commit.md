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

4. Push & Wait (if PR exists)
```bash
# Add Homebrew to PATH (locally)
export PATH=/opt/homebrew/bin:$PATH

git push origin HEAD

if command -v gh &> /dev/null; then
    # Check if PR exists for this branch
    if gh pr view --json url &> /dev/null; then
        echo "PR exists. Waiting for checks..."
        # Wait a moment for checks to be scheduled
        sleep 5 
        gh run watch --exit-status || echo "Checks failed or none found."
    fi
else
    echo "GH CLI not found. Skipping CI wait."
fi
```
