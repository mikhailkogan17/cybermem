---
description: Master workflow - complete system health check and maintenance
---

# Master Health Check

// turbo-all

> [!IMPORTANT]
> Comprehensive system validation via port 8626 using `antigravity-client`.

1. Overall health check:
```bash
curl -s http://localhost:8626/api/health -H "X-Client-Name: antigravity-client" | jq -r '.overall'
```

2. Metrics check:
```bash
curl -s http://localhost:8626/api/stats -H "X-Client-Name: antigravity-client" | jq -r '.lastWriter'
```

3. Run full CRUD:
```bash
/test-crud
```

**Expected Results:**
- Health: `ok`.
- Writer: `antigravity-client`.
- CRUD: `Passed`.
