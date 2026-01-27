---
description: how to add a new MCP client to the dashboard and clients.json
---

# Add MCP Client

1. Read `clients.json`:
```bash
view_file /Users/mikhailkogan/cybermem/packages/dashboard/clients.json
```

2. Add new client entry with `id` and `name`.

3. Rebuild dashboard:
```bash
cd packages/dashboard && npm run build
```
