---
description: Backup RPi production data and restore to local for testing
---

# RPi Sync Workflow

// turbo-all

> [!CAUTION]
> This pulls data FROM production. Ensure local DB is NOT in use.

1. Run sync script:
```bash
./tools/sync-from-rpi.sh
```

2. Verify local health after sync:
```bash
/check-dashboard
```

**Expected Results:**
- `openmemory.sqlite` backed up and copied to local data directory.
- Local dashboard reflects RPi data.
