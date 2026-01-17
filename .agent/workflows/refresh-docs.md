---
description: Check documentation freshness across all CyberMem repos and components
---

# Documentation Freshness Check

// turbo-all

> [!IMPORTANT]
> Run this workflow after major changes to ensure all docs are in sync.

---

## Quick Reference

| Component | Location                       | Purpose                      |
| --------- | ------------------------------ | ---------------------------- |
| Landing   | `cybermem-landing/app/`        | Homepage cybermem.dev        |
| Docs      | `cybermem/docs/`               | Docusaurus docs.cybermem.dev |
| Dashboard | `cybermem/packages/dashboard/` | Admin UI                     |
| README    | `cybermem/README.md`           | Main repo readme             |
| GEMINI.md | `cybermem/GEMINI.md`           | Agent context                |

---

## Step 1: Sync Submodule

```bash
cd ~/cybermem-landing
git submodule update --remote vendor/cybermem
git diff vendor/cybermem
# If changes: git add vendor/cybermem && git commit -m "chore: sync cybermem submodule"
```

---

## Step 2: Check Landing (cybermem.dev)

```bash
cd ~/cybermem-landing/app
```

**Verify:**

- [ ] Homepage features match current capabilities
- [ ] Installation commands are correct (`npx @cybermem/cli init`)
- [ ] Screenshots match current UI

---

## Step 3: Check Docusaurus Docs

```bash
cd ~/cybermem/docs
ls -la
```

**Verify each doc:**

| File            | Check                          |
| --------------- | ------------------------------ |
| `quickstart.md` | Install commands, flow diagram |
| `local.md`      | Docker compose, ports          |
| `rpi.md`        | Tailscale setup, deployment    |
| `mcp.md`        | MCP config, tool list          |
| `dashboard.md`  | Features, screenshots          |

```bash
# Check for broken links
cd ~/cybermem-landing
npm run build 2>&1 | grep -i "broken\|error"
```

---

## Step 4: Check Dashboard Components

```bash
cd ~/cybermem/packages/dashboard
```

**Verify documented:**

- [ ] Header buttons (Connect MCP, Docs, Settings)
- [ ] Settings Modal sections
- [ ] MCP Config Modal
- [ ] Metric cards and charts

```bash
# List UI components
ls -la components/dashboard/
```

---

## Step 5: Check README.md

```bash
cd ~/cybermem
cat README.md | head -100
```

**Verify:**

- [ ] Quick Start commands work
- [ ] Feature list is current
- [ ] Architecture diagram matches reality
- [ ] Badge links work

---

## Step 6: Check GEMINI.md

```bash
cd ~/cybermem
cat GEMINI.md | head -200
```

**Verify:**

- [ ] Port configuration table correct
- [ ] Environment variables list current
- [ ] Test workflows documented
- [ ] No outdated instructions

---

## Step 7: Generate Report

**Documentation Status:**

| Component | Status | Notes |
| --------- | ------ | ----- |
| Landing   | ✅/❌    |       |
| Docs      | ✅/❌    |       |
| Dashboard | ✅/❌    |       |
| README    | ✅/❌    |       |
| GEMINI.md | ✅/❌    |       |

**Action Items:**

1. ...
2. ...

---

## Common Issues

| Issue                  | Fix                                |
| ---------------------- | ---------------------------------- |
| Submodule out of sync  | `git submodule update --remote`    |
| Broken doc links       | Check file exists in `docs/`       |
| Outdated screenshots   | Retake with browser tool           |
| Wrong install commands | Update to `npx @cybermem/cli init` |
