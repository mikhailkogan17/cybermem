---
description: Run happy path manual test for backup-restore flow
---

// turbo-all

1. Provide MCP config with cybermem-local and cybermem-rpi (TAILSCALE)
2. Change it automatically or ask a user and WAIT FOR REFRESH.
3. Run /test-local and /test-rpi workflows
4. Write something to local memory
5. Screenshot of local dashboard
5. Backup it with `npx @cybermem/cli backup.`
6. Restore on rpi: ssh and npx @cybermem/cli backup (see creds in a global environment)
7. Screenshot of remote dashboard
8. Compare screenshots: EVERYTHING should be the same
