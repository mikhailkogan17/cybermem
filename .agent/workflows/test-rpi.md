---
description: Run Playwright E2E tests for RPi environment (raspberrypi.local)
---

# RPi Environment Playwright Tests

## Prerequisites

1. RPi must be accessible at `raspberrypi.local` (or via Tailscale)
2. CyberMem stack must be running on RPi
3. Dashboard accessible at `https://raspberrypi.local:3000`
4. API accessible at `https://raspberrypi.local:8626`

## Environment Variables

Set these before running tests:

```bash
export BASE_URL=https://raspberrypi.local:3000
export RPI_URL=https://raspberrypi.local:8626/mcp
export RPI_API_KEY=your-rpi-api-key
export RPI_HOST=pi@raspberrypi.local
```

## Run Dashboard E2E Tests

1. Navigate to dashboard package:
```bash
cd /Users/mikhailkogan/cybermem/packages/dashboard
```

2. Run tests with RPi base URL:
// turbo
```bash
BASE_URL=https://raspberrypi.local:3000 npm run test:e2e -- --project=chromium
```

## Run MCP E2E Tests on RPi

1. [!IMPORTANT] [!REQUIRED] MANUAL HAPPY PATH ON PROD:

(0) ask user to add cybermem-rpi server in Antigravity config.
Provide a valid JSON file with the Tailscale link, OR write it yourself.
Wait for the user to refresh.
(1) Wipe OpenMemory database
(1) Add CRUD with MCP
> [!ATTENTION]
> FORBIDDEN TO USE CURL IN HAPPY PATH FLOW. Use it ONLY to debug.
(2) CHECK DASHBOARD:
- Antigravity should be last reader, last writer, top reader AND top writer. NOT OTHER CLIENTS, NOT N/A 
- All 4 time series should contain "Antigravity" line WITH NONNULL DATA.
- Audit log should be valid and non-empty
> [!ATTENTION]
> Everywhere should be only ONE single name: "Antigravity". NOT "cybermem", "test", "npm", "bash", "node", "curl", "Mozilla", "antigravity", "N/A".

2. Set environment variables:
```bash
export RPI_URL=https://raspberrypi.local:8626/mcp
export RPI_API_KEY=your-api-key
export RPI_HOST=pi@raspberrypi.local
```

3. Run MCP tests:
// turbo
```bash
cd /Users/mikhailkogan/cybermem/packages/cli
npx tsx e2e/test-mcp.ts rpi
```
> [!] ATTENTION
> The tests reset the database via SSH. Requires >`sshpass`:
> 
>```bash
> brew install hudochenkov/sshpass/sshpass
> ```
SSH credentials are read from the environment.

## Troubleshooting

- **HTTPS errors**: Tests run with `NODE_TLS_REJECT_UNAUTHORIZED=0` for self-signed certs
- **SSH issues**: Ensure RPi is reachable and SSH key/password is configured
- **Service not found**: Check if CyberMem stack is running on RPi: `ssh pi@raspberrypi.local "docker ps"`
