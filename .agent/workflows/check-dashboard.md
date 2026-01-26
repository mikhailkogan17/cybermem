---
description: Quick UI status check for CyberMem (8626)
---

# Dashboard Health Workflow

// turbo-all

> [!IMPORTANT]
> Verifies that the dashboard and metrics APIs are reachable via the Zero Trust gateway.

1. Run health check:
```bash
curl -s http://localhost:8626/api/health | jq -e '.overall == "ok"'
```

2. Check metrics endpoint:
```bash
curl -s http://localhost:8626/api/stats | jq -r '.lastWriter'
```

**Expected Results:**
- Healthy status (200 OK + `overall: ok`).
- Metrics available (not empty).
