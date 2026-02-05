---
description: Commit changes with agent author attribution
---

//turbo_all

# Commit Workflow

1. Setup Credentials
[Check _credentials]
view_file .agent/workflows/_credentials.md

2. Commit
```bash
# Usage: /commit "Commit message"

git add .
git commit -m "$1"
```

3. Push & Verify
```bash
git push origin HEAD
```

Use the GitHub MCP command `mcp_github-mcp-server_get_pull_request` to check for an existing PR. If a PR exists, you may monitor CI status using:
```bash
# Add Homebrew to PATH (locally) if needed
export PATH=/opt/homebrew/bin:$PATH
gh run watch --exit-status
```
