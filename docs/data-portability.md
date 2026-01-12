---
title: Data Portability & Backup
description: How to backup, restore, and transfer your CyberMem data
---

# Data Portability & Backup

One of CyberMem's core promises is **data sovereignty**. Your memory lives on your device, not in our cloud. This guide explains how to manage your data.

## Where is my data?

All your data (memories, vectors, and configuration) is stored in a **single SQLite file** inside the Docker container.

- **Container Path**: `/data/openmemory.sqlite`
- **Docker Volume**: `cybermem-openmemory-data`

This file contains:
- 🧠 **Memories**: All facts and interactions stored by OpenMemory.
- 📊 **Audit Logs**: History of all requests (for the Dashboard).
- ⚙️ **Vector Data**: If using default SQLite vector store.

> [!NOTE]
> Metrics history (CPU usage, request rates) is stored separately in Prometheus and is not included in the standard backup to keep it lightweight.

---

## One-Command Backup

We provide a simple CLI command to export your data to a portable tarball.

### Create a Backup

Run this command in your terminal:

```bash
npx @cybermem/mcp backup
```

This will:
1. Connect to the running CyberMem container.
2. Safely export the `/data` directory.
3. Create a timestamped file (e.g., `cybermem-backup-2023-10-27-1430.tar.gz`).
4. Save it to your current directory.

**File Size**: Typically ~5MB for 10k memories.

### Restore from Backup

To restore your memory on the same machine or a new one:

1. Copy the backup file to the machine.
2. Run the restore command:

```bash
npx @cybermem/mcp restore ./cybermem-backup-file.tar.gz
```

This will:
1. **Stop** the CyberMem service (to safely write data).
2. **Overwrite** the current data with the backup.
3. **Fix permissions** automatically.
4. **Restart** the service.

> [!WARNING]
> Restore will **overwrite** any existing data on the target machine. Make sure to backup the target first if it has important data.

---

## Manual Backup (Docker)

If you prefer using standard Docker commands or want to automate backups via cron, you can use:

**Backup:**
```bash
docker run --rm \
  --volumes-from cybermem-openmemory \
  -v $(pwd):/backup \
  alpine tar czf /backup/manual-backup.tar.gz /data
```

**Restore:**
```bash
docker stop cybermem-openmemory

docker run --rm \
  --volumes-from cybermem-openmemory \
  -v $(pwd):/backup \
  alpine sh -c "tar xzf /backup/manual-backup.tar.gz -C / && chown -R 1001:1001 /data"

docker start cybermem-openmemory
```

## Migrating to Another Machine

Since the backup is a standard archive of the data directory, you can easily move it between environments:

1. **Local → RPi**: Backup on Mac, SCP to Pi, `npx @cybermem/mcp restore`.
2. **RPi → Cloud**: Backup on Pi, SCP to VPS, restoring might require volume mapping adjustments if using Kubernetes (see VPS docs).
