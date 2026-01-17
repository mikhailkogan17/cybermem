---
description: Run happy path manual test for backup-restore flow
---

# Backup-Restore Happy Path Test

// turbo-all

> [!CAUTION]
> **RPi = PRODUCTION. NEVER modify, delete, or restore TO RPi.**
> This workflow only: 1) Backups FROM RPi, 2) Restores TO Local for testing.

> [!IMPORTANT]
> **Direction: RPi → Local** (not Local → RPi)
> RPi data and metrics must remain untouched.

---

## Step 0: Backup RPi Production Data (READ-ONLY)

### 0.1 Create Backup on RPi

```bash
ssh pi@raspberrypi.local 'cd ~/.cybermem && tar -czf ~/cybermem-backup-$(date +%Y%m%d-%H%M%S).tar.gz data/'
```

### 0.2 Copy to Local

```bash
scp pi@raspberrypi.local:~/cybermem-backup-*.tar.gz ~/cybermem/
ls -la ~/cybermem/cybermem-backup-*.tar.gz
```

### 0.3 Record RPi Stats (READ-ONLY)

```bash
ssh pi@raspberrypi.local 'curl -s http://localhost:8000/api/stats | jq "{memoryRecords, topWriter, lastWriter}"'
```

---

## Step 1: Restore to Local (LOCAL ONLY)

### 1.1 Stop Local OpenMemory

```bash
docker stop cybermem-openmemory
```

### 1.2 Extract Backup to Local Docker Volume

> [!IMPORTANT]
> This modifies LOCAL volume only, not RPi.

```bash
# Find latest backup
BACKUP=$(ls -t ~/cybermem/cybermem-backup-*.tar.gz | head -1)
echo "Restoring from: $BACKUP"

docker run --rm \
  -v cybermem-openmemory-data:/data \
  -v ~/cybermem:/backup \
  alpine sh -c "rm -f /data/openmemory.sqlite*; cd /data && tar -xzf /backup/$(basename $BACKUP) --strip-components=1"
```

### 1.3 Restart Local Stack

```bash
docker start cybermem-openmemory
sleep 15
docker restart cybermem-log-exporter cybermem-db-exporter
sleep 5
```

---

## Step 2: Verify Local Has RPi Data

### 2.1 Check Local Stats

```bash
curl -s http://localhost:8000/api/stats | jq '{memoryRecords, topWriter, lastWriter}'
# Should match RPi stats from Step 0.3
```

### 2.2 Query via Local MCP

```
mcp_cybermem_query_memory(query: "user context profile", k: 5)
```

**Expected:** Same memories as RPi

---

## Step 3: Compare

| Metric        | RPi (Step 0.3) | Local (Step 2.1) |
| ------------- | -------------- | ---------------- |
| memoryRecords | ?              | ?                |
| topWriter     | ?              | ?                |
| lastWriter    | ?              | ?                |

**PASS** if Local matches RPi.

---

## Cleanup (Optional)

Remove old backups:

```bash
rm ~/cybermem/cybermem-backup-*.tar.gz
```
