---
description: how to add a new MCP client to the dashboard and clients.json
---

### 1. Update `packages/dashboard/public/clients.json`
- Append a new client object to the array.
- Required fields: `id`, `name`, `match` (regex string for identification), `color`, `icon`, `description`, `steps`, `configType` (`json`, `toml`, or `command`).

### 2. Add Icon
- Place a 64x64 or 128x128 PNG in `packages/dashboard/public/icons/`.

### 3. Verification
- Run `npm run lint` in `packages/dashboard`.
- Verify the new client appears in the "Integrate MCP Client" modal on `localhost:3000`.
- Trigger a request from the new client and verify the "Top Writer/Reader" cards correctly identify it via the `match` regex.
