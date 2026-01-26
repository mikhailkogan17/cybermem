---
description: Quick CRUD check for CyberMem (Local/Zero Trust)
---

# CRUD Verification Workflow

// turbo-all

> [!IMPORTANT]
> This workflow verifies the entire SSoT stack using the standardized `antigravity-client` identity.

1. Run the CRUD script:
```bash
./tools/test-crud.sh
```

2. Verify Dashboard status (headless check):
```bash
curl -s http://localhost:8626/api/health | jq -r '.overall'
```

**Expected Results:**
- CRUD passed: All 4 stages (Add, Query, List, Delete) show success.
- Health: Returns `ok`.
