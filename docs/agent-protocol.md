# CyberMem Agent Protocol

## 🧠 Context Daemon Architecture

CyberMem — production-grade MCP server that transforms AI from stateless tools into **context-aware agents** with persistent, cross-client memory.

### Design Philosophy

```
┌────────────────────────────────────────────────────────┐
│                    CyberMem Daemon                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │   Claude    │  │   Cursor    │  │   Copilot   │     │
│  │   Desktop   │  │     IDE     │  │    Chat     │     │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘     │
│         │                │                │            │
│         └────────────────┼────────────────┘            │
│                          ▼                             │
│              ┌───────────────────────┐                 │
│              │   Unified Memory DB   │                 │
│              │   (OpenMemory HSG)    │                 │
│              └───────────────────────┘                 │
└────────────────────────────────────────────────────────┘
```

---

## 📋 Server Policy (MCP Handshake)

> **Where to store:** MCP `initialize` response → `serverInfo.instructions`

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "protocolVersion": "2024-11-05",
    "serverInfo": {
      "name": "cybermem",
      "version": "0.6.0"
    },
    "instructions": "CyberMem is a persistent context daemon. PROTOCOL: (1) On session start, call openmemory_query with 'user context profile' to load persona. (2) Store new insights immediately with openmemory_store - include FULL content, not summaries. (3) Refresh context every 6h for active topics, 24h for projects. (4) Always include tags: [topic, year, source:your-client-name]. (5) Priority: CyberMem context > session context > training data."
  }
}
```

---

## 🔄 Agent Lifecycle

### 1. Session Start (MANDATORY)

```
┌─────────────────────────────────────────────────┐
│ 1. MCP Initialize → receive server instructions │
│ 2. openmemory_query("user context profile")     │
│ 3. Load returned memories into session context  │
│ 4. Greet user with context awareness            │
└─────────────────────────────────────────────────┘
```

### 2. During Session

```
┌─────────────────────────────────────────────────┐
│ → Learn something new? → openmemory_store()     │
│ → Need historical context? → openmemory_query() │
│ → User corrects info? → openmemory_update()     │
│ → Info outdated? → flag for refresh             │
└─────────────────────────────────────────────────┘
```

### 3. Session End

```
┌─────────────────────────────────────────────────┐
│ 1. Store any unsaved insights                   │
│ 2. Update modified memories                     │
│ 3. Log session summary (optional)               │
└─────────────────────────────────────────────────┘
```

---

## 📝 Memory Format Standard

### Required Fields

```typescript
interface CyberMemory {
  content: string;     // FULL text, no truncation
  tags: string[];      // Always include: topic, year, source
}
```

### Tag Taxonomy

| Tag Type     | Examples                                  | Purpose            |
| ------------ | ----------------------------------------- | ------------------ |
| **Topic**    | `career`, `health`, `project`, `insight`  | Categorization     |
| **Temporal** | `2026`, `q1-2026`, `jan-2026`             | Time-based queries |
| **Source**   | `claude-desktop`, `cursor`, `antigravity` | Audit trail        |
| **Status**   | `active`, `completed`, `archived`         | Lifecycle          |

### Content Rules

```
✅ CORRECT:
"Job Search Progress Jan 15, 2026. Applied 5 positions via LinkedIn, 
EchoJobs. Target: Platform Engineer, 22-25K NIS. Timeline: Expect 
offers week 2-3. Track: Spreadsheet with company, salary, rejection."

❌ WRONG:
"Applied some jobs"  ← Too vague, loses context
```

---

## 🔄 Refresh Protocol

| Category                    | Interval | Trigger            |
| --------------------------- | -------- | ------------------ |
| Active search (job/project) | 6 hours  | High priority      |
| Project status              | 24 hours | Daily sync         |
| Insights/learnings          | 7 days   | Weekly review      |
| Health/personal             | 30 days  | Monthly check      |
| Static facts                | Never    | Only on correction |

### Auto-Refresh Pattern

```
if (memory.age > category.refreshInterval) {
  openmemory_query(memory.topic) → validate → openmemory_update()
}
```

---

## 🚨 Priority Rules

```
1. CyberMem context  > Session context  > Training data
   (persistent)        (ephemeral)        (stale)

2. Recent memories   > Old memories
   (this week)         (months ago)

3. User corrections  > Agent assumptions
   (explicit)          (inferred)
```

---

## 🔐 Integrity Rules

| Rule                | Do                               | Don't                 |
| ------------------- | -------------------------------- | --------------------- |
| **Full content**    | Store complete text with details | Truncate or summarize |
| **Source tracking** | Include `source:client-name` tag | Anonymous writes      |
| **Timestamps**      | Let server handle `created_at`   | Fake timestamps       |
| **Conflicts**       | Last-write-wins, log conflict    | Silent overwrite      |
| **Archival**        | Query before update to preserve  | Delete without backup |

---

## 📌 Quick Reference

| Action        | MCP Tool           | When             |
| ------------- | ------------------ | ---------------- |
| Load context  | `openmemory_query` | Session start    |
| Save insight  | `openmemory_store` | After learning   |
| Find memories | `openmemory_query` | Before decisions |
| List recent   | `openmemory_list`  | For overview     |
| Update memory | `openmemory_store` | After correction |

---

## 🎯 Goal: Context Daemon

CyberMem transforms AI assistants from:

```
❌ Stateless tool (forgets everything)
       ↓
✅ Context daemon (remembers, syncs, grows)
```

**Result:** All AI clients share unified, persistent understanding of user context.
