---
description: Publish packages to NPM and GitHub Releases
---
# Publish Release

1. Setup Credentials
[Check _credentials]
view_file .agent/workflows/_credentials.md

2. Trigger Release Workflow
```bash
# Usage: /publish [patch|minor|major]
VERSION_TYPE=${1:-patch}
gh workflow run publish.yml --field version_type=$VERSION_TYPE
```

3. Monitor Release
```bash
gh run list --workflow publish.yml --limit 1
```
