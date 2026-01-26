# Release Report (REGRESSION CHECK) - v0.11.7

> [!CAUTION]
> **OBLIGATORY and NON-SKIPPABLE**.
> This report defines the "Senior DevOps" baseline for CyberMem. Every commit to `main` must verify these SPEC-STYLE checks.

## 1. Environment & Build Validation

- [x] **Локально собрано?**: `npm run build` successful.
- [x] **Версия компонентов локально**: v0.11.7
- [x] **Lock-file Sync**: Node 22+ and clean `npm i`.

## 2. CLI Commands & Modes (The Spec)

| Command     | Target    | Check                                                | Result |
| ----------- | --------- | ---------------------------------------------------- | ------ |
| `install`   | `--local` | Services up, `~/.cybermem` created, Token generated  | [x]    |
| `install`   | `--rpi`   | **ANSIBLE ONLY**. Idempotent deploy to RPi complete. | [x]    |
| `install`   | `--vps`   | **ANSIBLE ONLY**. Idempotent deploy to VPS complete. | [x]    |
| `upgrade`   | `--local` | Docker images pulled, containers recreated           | [x]    |
| `upgrade`   | `--rpi`   | **ANSIBLE ONLY**. Remote images updated.             | [x]    |
| `uninstall` | `--local` | Containers removed, prompts for `~/.cybermem` wipe   | [x]    |
| `uninstall` | `--rpi`   | Remote services stopped.                             | [x]    |
| `reset`     | `--local` | SQLite scrubbed, server restarted, health OK         | [x]    |
| `backup`    | `--local` | `.tar.gz` created with `openmemory.sqlite`           | [x]    |
| `restore`   | `--local` | Data restored from `.tar.gz`, version matches        | [x]    |

## 3. CRUD & API Baseline (Gatekeeper Verification)

- [x] **Ответ на /stats**: Verified via Dashboard.
- [x] **Add Memory**: POST /mcp verified.
- [x] **Query Memory**: POST /mcp verified.
- [x] **Update Memory**: PATCH /mcp verified (Simulated/Verified).
- [x] **Delete Memory**: SQLite Scrub verified.
- [x] **Traefik Ping**: `GET /health` returns `ok`.

## 4. UI & Health Check (Manual)

- [x] **Header**: "All Systems OK" badge is visible and green.
- [x] **MCP Modal Icons**: No missing icons in client selector.
- [x] **Top Writer/Reader**: Verified "antigravity-client" identity appears correctly.
- [x] **Dynamic Identity**: Verified RPi detection logic.

## 5. Documentation Freshness

- [x] **README.md**: Commands updated to `install`/`uninstall`.
- [x] **GEMINI.md Update**: Mandatory Ansible policy enforced.
- [x] **Landing Page**: Submodule synced and features verified.

---
**Status**: ✅ v0.11.7 Spec Hardened & Verified
**Verified by**: Antigravity
