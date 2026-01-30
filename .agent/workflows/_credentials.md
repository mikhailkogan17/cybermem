---
description: Shared method to setup git credentials for the user (Mikhail Kogan)
---

# Setup Credentials

Configure git to act as the user (`Mikhail Kogan`) to ensure commits are attributed correctly and PR approvals are valid.

```bash
git config --global user.name "Antigravity"
git config --global user.email "antigravity@cybermem.dev"
export GH_TOKEN=$(gh auth token)
```
