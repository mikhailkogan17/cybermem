---
description: Backup RPi production data and restore to local for testing
---

# Backup RPi → Restore Local

// turbo-all

> [!IMPORTANT]
> RPi is **production memory**. Never wipe. Always backup first.

---

## Step 1: Backup RPi

```bash
ssh pi@raspberrypi.local 'cd ~/.cybermem && tar -czf ~/cybermem-backup-$(date +%Y%m%d-%H%M%S).tar.gz data/'
```

### 1.1 Copy to Local
```bash
scp pi@raspberrypi.local:~/cybermem-backup-*.tar.gz ~/cybermem/
```

---

## Step 2: Restore to Local

### 2.1 Stop Local Stack
```bash
cd ~/.cybermem && docker-compose -p cybermem stop openmemory
```

### 2.2 Extract Backup
```bash
cd ~/.cybermem
tar -xzf ~/cybermem/cybermem-backup-YYYYMMDD-HHMMSS.tar.gz
```

### 2.3 Restart Stack
```bash
export CYBERMEM_ENV_PATH=~/.cybermem/.env
docker-compose -p cybermem up -d openmemory log-exporter db-exporter
sleep 10
```

---

## Step 3: Verify

### 3.1 Check Memory Count
```bash
curl -s http://localhost:8000/api/stats | jq '.memoryRecords'
# Should match RPi memory count
```

### 3.2 Test Query via MCP
```
mcp_cybermem_query_memory(query: "user context", k: 5)
```

---

## Cleanup

```bash
# Remove old backups (keep last 3)
ls -t ~/cybermem/cybermem-backup-*.tar.gz | tail -n +4 | xargs rm -f
```
