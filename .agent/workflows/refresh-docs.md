---
description: Check documentation freshness across all CyberMem repos and components
---

# Documentation Sync Workflow

// turbo-all

1. Sync local docs to landing:
```bash
./scripts/sync-docs.sh
```

2. Check landing build status:
```bash
cd ~/cybermem-landing && npm run build
```

**Expected Results:**
- Docs correctly mapped to `cybermem-landing/docs/docs/`.
- Landing build passes.
