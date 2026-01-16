---
description: Run happy path manual test for backup-restore flow
---

# Backup-Restore Happy Path Test

// turbo-all

---

## Step 0: Config Validation (MANDATORY)

> [!CAUTION]
> **RUN BOTH VALIDATIONS BEFORE PROCEEDING**

### 0.1 Validate Local (run /test-local Step 0)
```bash
curl -s http://localhost:8626/health | jq '.ok'  # → true
curl -s http://localhost:8000/api/stats | jq '.memoryRecords'  # → number
```

### 0.2 Validate RPi (run /test-rpi Step 0)
```bash
ssh pi@raspberrypi.local 'curl -s http://localhost:8626/health | jq .ok'  # → true
ssh pi@raspberrypi.local 'curl -s http://localhost:8000/api/stats | jq .memoryRecords'  # → number
```

### 0.3 Verify Both MCP Servers in Antigravity
- `mcp_cybermem-local_list_memories` → Should work
- `mcp_cybermem-rpi_list_memories` → Should work (NOT 404)

**If RPi returns 404:** Fix Antigravity config URL/API key first!

---

## Step 1: Prepare Local Environment

### 1.1 Wipe Local Database
```bash
docker exec cybermem-openmemory sh -c 'rm -f /data/openmemory.sqlite*'
docker run --rm -v cybermem-openmemory-data:/data alpine sh -c 'chown -R 1001:1001 /data && chmod 777 /data'
docker restart cybermem-openmemory
for i in {1..30}; do curl -s http://localhost:8626/health | grep -q ok && break || sleep 2; done
docker restart cybermem-log-exporter cybermem-db-exporter
sleep 5
```

### 1.2 Create Test Memories via MCP
Use `mcp_cybermem-local_add_memory` to create 3 distinct memories:
- Memory 1: "Backup-restore test: Important note about project X"
- Memory 2: "Backup-restore test: Configuration details for system Y"
- Memory 3: "Backup-restore test: Meeting notes from date Z"

### 1.3 Verify Local Dashboard
```bash
curl -s http://localhost:3000/api/metrics | jq '.stats'
```
**Expected:** `memoryRecords: 3`, all names = "Antigravity"

### 1.4 Screenshot Local Dashboard
Take screenshot of dashboard showing:
- Memory Records: 3
- Top Writer: Antigravity
- Last Writer: Antigravity

---

## Step 2: Backup

```bash
cd /Users/mikhailkogan/cybermem
npx @cybermem/cli backup
```

Backup file created in current directory (e.g., `cybermem-backup-YYYYMMDD-HHMMSS.tar.gz`)

---

## Step 3: Restore to RPi

### 3.1 Copy Backup to RPi
```bash
scp cybermem-backup-*.tar.gz pi@raspberrypi.local:~/.cybermem/
```

### 3.2 SSH to RPi and Restore
```bash
ssh pi@raspberrypi.local
cd ~/.cybermem
npx @cybermem/cli restore cybermem-backup-*.tar.gz
```

### 3.3 Restart RPi Services
```bash
ssh pi@raspberrypi.local 'docker restart cybermem-openmemory cybermem-log-exporter cybermem-db-exporter'
```

---

## Step 4: Verify RPi After Restore

### 4.1 Check Stats
```bash
ssh pi@raspberrypi.local 'curl -s http://localhost:8000/api/stats' | jq '.'
```
**Expected:** `memoryRecords: 3`

### 4.2 Query via MCP
Use `mcp_cybermem-rpi_query_memory` to search for "Backup-restore test"
**Expected:** All 3 memories found

### 4.3 Screenshot RPi Dashboard (if available)

---

## Step 5: Compare Results

| Metric         | Local | RPi |
| -------------- | ----- | --- |
| Memory Records | 3     | 3   |
| Content Match  | ✓     | ✓   |

**PASS** if both have identical memory content after restore.
