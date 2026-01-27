---
description: Setup workflow - prevent sleep and configure test env
---

# Setup Workflow

// turbo-all

1. Prevent Mac Sleep:
```bash
/startup
```

2. Enable Docker (if not running):
```bash
open -a Docker
```

3. Initialize local stack:
```bash
npx @cybermem/cli init
npx @cybermem/cli up
```
