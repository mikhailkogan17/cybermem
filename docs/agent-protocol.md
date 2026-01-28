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
      "version": "0.12.4"
    },
    "instructions": "CyberMem is a persistent context daemon. PROTOCOL: (1) On session start, call query_memory with 'user context profile' to load persona. (2) Store new insights immediately with add_memory - include FULL content, not summaries. (3) Refresh context every 6h for active topics, 24h for projects. (4) Always include tags: [topic, year, source:your-client-name]. (5) Priority: CyberMem context > session context > training data."
  }
}
```

---

## 🔄 Agent Lifecycle

### 1. Session Start (MANDATORY)

```
┌─────────────────────────────────────────────────┐
│ 1. MCP Initialize → receive server instructions │
│ 2. query_memory("user context profile")         │
│ 3. Load returned memories into session context  │
│ 4. Greet user with context awareness            │
└─────────────────────────────────────────────────┘
```

### 2. During Session

```
┌─────────────────────────────────────────────────┐
│ → Learn something new? → add_memory()           │
│ → Need context? → query_memory()                │
│ → User corrects info? → update_memory()         │
│ → Active topic/prevent decay? → reinforce()     │
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
  query_memory(memory.topic) → validate → update_memory()
}
```

---

### Structural vs Metabolic Operations

CyberMem distinguishes between changing the "bones" of a memory and boosting its "energy":

| Operation     | Purpose                             | Impact                           | Cost     |
| :------------ | :---------------------------------- | :------------------------------- | :------- |
| **Update**    | Structural mutation of content/tags | Re-embeds & re-links memory      | **High** |
| **Reinforce** | Metabolic boost to salience         | Updates recency & prevents decay | **Low**  |

**Rule of Thumb:**
- Use `update_memory` when facts change.
- Use `reinforce_memory` when a topic remains active or important but hasn't changed.

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

| Action        | MCP Tool           | When             | Cost |
| ------------- | ------------------ | ---------------- | ---- |
| Load context  | `query_memory`     | Session start    | Low  |
| Save insight  | `add_memory`       | After learning   | High |
| Find memories | `query_memory`     | Before decisions | Low  |
| List recent   | `list_memories`    | For overview     | Low  |
| Update memory | `update_memory`    | After correction | High |
| Boost memory  | `reinforce_memory` | Active topics    | Low  |

---

## 🎯 Goal: Context Daemon

CyberMem transforms AI assistants from:

```
❌ Stateless tool (forgets everything)
       ↓
✅ Context daemon (remembers, syncs, grows)
```

**Result:** All AI clients share unified, persistent understanding of user context.
