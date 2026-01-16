---
description: Run happy path manual test for backup-restore flow
---

# Backup-Restore Happy Path Test

// turbo-all

> [!IMPORTANT]
> **Direction: RPi → Local** (not Local → RPi)
> RPi is production. Local is test environment.

---

## Step 0: Backup RPi Production Data

### 0.1 Create Backup on RPi
```bash
ssh pi@raspberrypi.local 'cd ~/.cybermem && tar -czf ~/cybermem-backup-$(date +%Y%m%d-%H%M%S).tar.gz data/'
```

### 0.2 Copy to Local
```bash
scp pi@raspberrypi.local:~/cybermem-backup-*.tar.gz ~/cybermem/
ls -la ~/cybermem/cybermem-backup-*.tar.gz
```

### 0.3 Record RPi Stats (Before)
```bash
ssh pi@raspberrypi.local 'curl -s http://localhost:8000/api/stats | jq .memoryRecords'
```

---

## Step 1: Restore to Local

### 1.1 Stop Local OpenMemory
```bash
docker stop cybermem-openmemory
```

### 1.2 Extract Backup to Docker Volume
> [!IMPORTANT]
> Backup must be copied directly to Docker volume, not host path.

```bash
docker run --rm \
  -v cybermem-openmemory-data:/data \
  -v ~/cybermem:/backup \
  alpine sh -c 'rm -f /data/openmemory.sqlite*; cd /data && tar -xzf /backup/cybermem-backup-YYYYMMDD-HHMMSS.tar.gz --strip-components=1'
```

### 1.3 Restart Stack
```bash
docker start cybermem-openmemory
sleep 15
docker restart cybermem-log-exporter cybermem-db-exporter
sleep 5
```

---

## Step 2: Verify Local

### 2.1 Check Local Stats
```bash
curl -s http://localhost:8000/api/stats | jq '.memoryRecords'
# Should match RPi count
```

### 2.2 Query via MCP
```
mcp_cybermem_query_memory(query: "user context profile", k: 5)
```
**Expected:** Same memories as RPi

---

## Step 3: Compare

| Metric        | RPi | Local |
| ------------- | --- | ----- |
| memoryRecords | ?   | ?     |
| Content Match | ✓   | ✓     |

**PASS** if both have identical memory count and content.
