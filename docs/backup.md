---
title: Backup & Restore
description: Complete guide to backing up and restoring your CyberMem memory
sidebar_position: 8
---

# Backup & Restore

Your memories live on **your** infrastructure. This guide covers backup and restore for all environments.

## Data Location

| Environment      | Data Path                 | Volume                     |
| ---------------- | ------------------------- | -------------------------- |
| **Local/Mac**    | `~/.cybermem/data/`       | `cybermem-openmemory-data` |
| **Raspberry Pi** | `~/.cybermem/data/`       | `cybermem-openmemory-data` |
| **VPS/Cloud**    | `/data/openmemory.sqlite` | Kubernetes PVC             |

The SQLite file contains:
- 🧠 **Memories** — facts and context stored by AI clients
- 📊 **Audit logs** — request history for Dashboard
- ⚙️ **Vectors** — embeddings for semantic search

---

## Quick Commands

### Create Backup

```bash
npx @cybermem/cli backup
```

Creates timestamped archive: `cybermem-backup-YYYY-MM-DD-HHMM.tar.gz`

### Restore from Backup

```bash
npx @cybermem/cli restore ./cybermem-backup-2026-01-13-1430.tar.gz
```

:::warning
Restore **overwrites** existing data. Backup the target first if needed.
:::

---

## Environment-Specific Instructions

### Local (Mac/Linux)

**Backup:**
```bash
# Using CLI
npx @cybermem/cli backup

# Or manually
cd ~/.cybermem && tar czf ~/backup.tar.gz data/
```

**Restore:**
```bash
# Using CLI
npx @cybermem/cli restore ./backup.tar.gz

# Or manually
cd ~/.cybermem && rm -rf data && tar xzf ~/backup.tar.gz
```

### Raspberry Pi

SSH into your Pi first:

```bash
ssh pi@<rpi-ip>

# Backup
npx @cybermem/cli backup

# Copy to Mac
scp pi@<rpi-ip>:~/cybermem-backup-*.tar.gz ./
```

**Restore on Pi:**
```bash
scp ./cybermem-backup.tar.gz pi@<rpi-ip>:~/
ssh pi@<rpi-ip>
npx @cybermem/cli restore ./cybermem-backup.tar.gz
```

### VPS / Cloud (Docker)

**Backup:**
```bash
docker run --rm \
  --volumes-from cybermem-openmemory \
  -v $(pwd):/backup \
  alpine tar czf /backup/backup.tar.gz /data
```

**Restore:**
```bash
docker stop cybermem-openmemory

docker run --rm \
  --volumes-from cybermem-openmemory \
  -v $(pwd):/backup \
  alpine sh -c "tar xzf /backup/backup.tar.gz -C / && chown -R 1001:1001 /data"

docker start cybermem-openmemory
```

---

## Migration Between Environments

1. **Local → RPi**: Backup on Mac, SCP to Pi, restore
2. **RPi → Cloud**: Backup on Pi, SCP to VPS, restore with volume adjustments
3. **Cloud → Local**: `docker cp` from container, restore locally

---

## Automated Backups (Cron)

Add to crontab for daily backups:

```bash
# Edit crontab
crontab -e

# Add line (daily at 3am)
0 3 * * * cd ~/.cybermem && tar czf ~/backups/cybermem-$(date +%Y-%m-%d).tar.gz data/
```

:::note
In crontab, `%` has special meaning. If pasting directly, escape as `\%Y-\%m-\%d`.
:::

:::tip
Keep last 7 backups: `find ~/backups -name "cybermem-*.tar.gz" -mtime +7 -delete`
:::
