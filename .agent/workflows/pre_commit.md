---
description: Pre-commit checks — run all tests, linters, and security checks before committing
---

# Pre-commit Gatekeeper

// turbo-all

> [!IMPORTANT]
> MUST pass before any push or publish. Uses `antigravity-client` for all system calls.

1. Run the local gatekeeper script:
```bash
X_CLIENT_NAME="antigravity-client" ./_gatekeeper/pre_commit.sh
```

2. Verify Helm charts:
```bash
helm lint packages/cli/templates/charts/cybermem
```

**Expected Results:**
- Gatekeeper: All checks pass.
- Helm: 0 failed.
