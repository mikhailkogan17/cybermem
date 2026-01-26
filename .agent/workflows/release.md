---
description: Create a new release - bump version, tag, and publish
---

# Release Workflow

// turbo-all

1. Bump version:
```bash
npm version patch
```

2. Trigger CI release:
```bash
gh workflow run release.yml --field version_type=patch
```

3. Sync documentation:
```bash
/refresh-docs
```

**Expected Results:**
- Successful GH action run.
- Documentation updated on cybermem.dev.
