# CyberMem - GEMINI.md

## 1. CyberMem Project Overview

**CyberMem** is a production-grade AI memory system that provides persistent context for AI agents.

**Goal**: Provide monitoring, observability, and multi-platform support (Local, RPi, VPS) with an integrated, high-performance architecture.

### Landing and Documentation

- **Landing**: [https://cybermem.dev](https://cybermem.dev)
- **Documentation**: [https://docs.cybermem.dev](https://docs.cybermem.dev)
- **Source Code**: [https://github.com/mikhailkogan17/cybermem](https://github.com/mikhailkogan17/cybermem)
- **Readme**: [https://github.com/mikhailkogan17/cybermem/blob/main/README.md](https://github.com/mikhailkogan17/cybermem/blob/main/README.md)

> [!CAUTION]
> **It is FORBIDDEN to:**
>
> - Ignore linting rules
> - Ignore GEMINI.md rules
> - Skip workflow steps and/or required Playwright runs
> - Force a commit without fixing a cause (linting, gitleaks, etc)
> - [ ] **Commit without running local tests first (`npm run test:e2e`)**

## 1.5 MANDATORY AGENT PROTOCOL (Gatekeeper)

> [!IMPORTANT]
> **EVERY AGENT (Antigravity, Claude Code, Opus) MUST follow this workflow before ANY push or publish:**

1.  **Run Pre-commit**: Execute `/pre_commit` or `./.hooks/pre-commit` locally.
2.  **Full E2E suite**: Run `npm run test:e2e local` in `packages/cli` AND verify dashboard health.
3.  **Docs Sync**: Run `/refresh-docs` to ensure documentation and landing are consistent.
4.  **Create Release Report**: Every non-trivial change MUST have a verified report in `release-reports/` based on `TEMPLATE.md`.
5.  **MCP Verification**: Specifically verify both **Local SDK** and **Remote Proxy** modes to prevent protocol regressions.

FAILURE TO FOLLOW THIS PROTOCOL IS UNACCEPTABLE AND CAUSES PRODUCTION DOWN-TIME.

## 1.6 LETHAL LAWS OF IDENTITY (Non-Negotiable)

> [!CAUTION]
> **Strict Identification & Privacy Rules**
>
> 1. **NO HARDCODED X-CLIENT-NAME**: It is STRICTLY FORBIDDEN to hardcode string literals like `X-Client-Name: dashboard` or `curl` in source code or scripts. Use dynamic variables or project constants.
> 2. **MANDATORY IDENTIFICATION**: Every request from a tool (pre-commit), script (load_test), or sub-component MUST send a valid `X-Client-Name`.
> 3. **NO ENV LEAKAGE**: Public MCP configuration (suggested JSON/TOML) MUST NEVER use internal Docker environment variables (e.g., `mcp-server:8080`). Use dynamic URL detection based on the request origin.
> 4. **ARGS > ENVS**: High-level configuration MUST be passed via command line arguments (`--url`, `--token`) to the MCP server, never solely through implicitly inherited environment variables in the public-facing documentation.

---

## 2. Terminology Stack & Architecture

- **App Core**: CyberMem Core (TypeScript/SQLite).
- **Infrastructure**:
  - **Networking**: Tailscale Funnel (zero-config public HTTPS for RPi/VPS).
  - **Reverse Proxy**: Traefik (handles auth extraction into logs).
  - **Metrics**: Built-in Dashboard stats (SQLite-based, no Prometheus needed).
  - **Visualization**: Integrated Charts (Canvas/ECharts).
  - **Database**:
    - **VPS (Cloud)**: PostgreSQL (via Helm charts in CLI templates).
    - **Local/RPi**: SQLite (Standard Single Source of Truth).
  - **Embeddings**: OpenAI (VPS) or Ollama (Local/RPi).
  - **Orchestration**: Docker Compose (Local) -> converted to Helm charts via `kompose` (VPS).
- **Monorepo Architecture**:
  - **NPM Workspaces**: Manages `@cybermem/cli`, `@cybermem/dashboard`, and `@cybermem/mcp`.

## 3. Directory Map

- `packages/cli/`: Management CLI (@cybermem/cli)
  - `templates/`: Production-ready configurations (Docker Compose, Helm Charts, Ansible Playbooks, Terraform Modules, Tailscale Funnel).
- `packages/dashboard/`: Monitoring UI (metrics, audit logs) — NOT the public landing page.
- `packages/mcp/`: MCP Server (TypeScript, published as @cybermem/mcp).
- `docs/`: **All documentation** (quickstart, local, rpi, vps, mcp guides).
- `tools/`: Utility scripts (load_test.sh, e2e tests).
- `README_assets/`: Assets for project documentation.

## 3.1 Documentation Rules

> [!CAUTION]
> **ALL new markdown documentation MUST be placed in `/docs/`.**
>
> Allowed `.md` files outside `/docs/`:
>
> - `README.md` (project root only)
> - `CONTRIBUTING.md`
> - `GEMINI.md`
> - `.agent/workflows/*.md` (agent workflows)
>
> DO NOT create new `.md` files in other locations. Documentation on docs.cybermem.dev is generated from `/docs/` via submodule.

---

## ⚠️ Environment Classification (CRITICAL)

> [!CAUTION]
> **Local = DEV, RPi = PROD**
>
| >                     | Environment | Type                                                     | Data Safety |
| --------------------- | ----------- | -------------------------------------------------------- |
| **localhost**         | DEV         | Can wipe, reset, test freely                             |
| **raspberrypi.local** | PROD        | **STRICT READ-ONLY**. Never wipe/modify without consent. |

### Test Workflow Rules

| Workflow               | Local                 | RPi                     |
| ---------------------- | --------------------- | ----------------------- |
| `/test-local`          | ✅ Full CRUD + DB wipe | ❌ Never run             |
| `/test-rpi`            | ❌ N/A                 | ✅ Read-only checks only |
| `/test-backup-restore` | ✅ Restore TO local    | ❌ Backup FROM RPi only  |
| `/sync-from-rpi`       | ✅ Receive data        | ❌ Source only (read)    |

---

## ⚠️ IMPORTANT: Local Development Configuration

### Port Configuration

> [!IMPORTANT]
> **Port 8626** is the canonical MCP endpoint for local development.
>
> - Traefik listens on `8626` and routes to CyberMem Core internally.
> - Dashboard health checks use `localhost:8626/health`.
> - MCP Server defaults to `localhost:8626/mcp`.

| Service               | Local Port | Purpose                       |
| --------------------- | ---------- | ----------------------------- |
| **Traefik (MCP/API)** | 8626       | Main API endpoint, MCP access |
| **DB Exporter**       | 8000       | SQLite metrics                |
| **Dashboard**         | 3000       | Monitoring UI                 |

### Authentication

> [!IMPORTANT]
> **Token-Based Auth (v0.7.7+)**
>
> - **Local/raspberrypi.local**: No auth required (bypass)
> - **Remote (Tailscale/VPS)**: Cookie-based auth via `cybermem-cli login`

**Auth Flow:**

```
cybermem-cli login     → Opens cybermem.dev/auth/signin → GitHub OAuth → JWT token saved
cybermem-cli dashboard → Opens dashboard with ?token=xxx → Sets cookie → Works
```

**No env vars required for dashboard auth.** Public key (RS256) is embedded in:

- `packages/dashboard/lib/auth.ts`
- `packages/cli/templates/auth-sidecar/server.js`

---

## 4. Environment Variables

| Variable         | Default               | Description                    |
| ---------------- | --------------------- | ------------------------------ |
| `CYBERMEM_URL`   | (unset for local)     | Set ONLY for remote deployment |
| `CYBERMEM_TOKEN` | (empty for local)     | Security Token for remote auth |
| `OLLAMA_URL`     | `http://ollama:11434` | Local embeddings               |

## 5. Quick Start Commands

```bash
# Start local stack
npx @cybermem/cli init
npx @cybermem/cli up

# Run dashboard in dev mode
cd packages/dashboard && npm run dev
```

## 6. Testing

### CRUD

For happy path do NOT use curl, mocking, etc.
Use ONLY mcp-cli or Antigravity.

> [!CAUTION]
> **CURL ALLOWED ONLY FOR DEBUGGING.**
> ALWAYS use `npx` in your MCPs JSON config.

### Dashboard

The dashboard tracks MCP client activity through db-exporter (SQLite) and visualizes it via the Metrics API.

> [!IMPORTANT]
> **Dashboard uses SQLite as the Single Source of Truth (SSoT):**
>
> - **Stat Cards**: SQLite directly.
> - **Time Series Charts**: Beautiful Linear Sampling algorithm.

---

## 8. CLI Commands

### Management Commands

| Command     | Description                                        |
| ----------- | -------------------------------------------------- |
| `init`      | Initialize CyberMem configuration and templates    |
| `up`        | Start the full Docker stack (Traefik, Core, etc.)  |
| `dashboard` | Checks ports (3000) and opens the local dashboard. |
| `update`    | Upgrade images and pull latest changes             |
| `reset`     | Wipe database (DESTRUCTIVE)                        |

### Memory Tools (MCP)

| Tool            | Implementation                                                     |
| --------------- | ------------------------------------------------------------------ |
| `add_memory`    | Store new memory with tags                                         |
| `query_memory`  | Semantic search                                                    |
| `list_memories` | Pagination and list                                                |
| `delete_memory` | Direct SQLite Scrub (Transactional delete from all related tables) |

---

## 9. CRUD Happy Path Test Flow

### Pipeline Overview

```mermaid
sequenceDiagram
    participant Test as E2E Test
    participant Traefik as Traefik:8626
    participant CM as CyberMem Core
    participant DB as SQLite
    participant DBE as db-exporter
    participant Dash as Dashboard

    Test->>Traefik: POST /mcp (X-Client-Name: e2e-crud-xxx)
    Traefik->>CM: Forward request
    CM-->>Traefik: Response (CRUD result)
    Traefik-->>Test: HTTP 200
    CM->>DB: Store access log
    Dash->>DBE: GET /api/stats
    DBE->>DB: Query SQLite
    DBE-->>Dash: Return normalized stats
    Dash-->>Test: Display "Last Writer: Antigravity"
```

---

## 10. Architectural Decision Records (ADR)

### ADR-001: Beautiful Local Charts (v0.7.2)

- **Problem**: Raw event-based charts caused "uneven scale" or "metamorphoses" when events were irregular.
- **Solution**: Implemented **Beautiful Linear Sampling**. Instead of plotting raw timestamps, we generate 60 fixed buckets on a timeline.
- **Benefit**: Smooth, Grafana-level charts using direct SQLite aggregation. No external metrics servers required.

### ADR-002: Direct SQLite Scrub (v0.7.0)

- **Problem**: Standard SDK did not support hard deletion across all tables.
- **Solution**: Implemented direct SQLite manipulation in the MCP server sidecar.
- **Scope**: Deletes from `memories`, `vectors`, and `waypoints` tables using transactions.

### ADR-003: Port 8626 Canonicalization

- **Problem**: Port conflicts with default 8080/4000/3000.
- **Solution**: Port **8626** is the dedicated entry point for Traefik, which routes all MCP and API traffic.

---

## 11. Maintenance Workflows

> [!IMPORTANT]
> Run `/health-check` weekly or before demos/interviews.

### Core Workflows

| Workflow        | Purpose                      | Environment    |
| --------------- | ---------------------------- | -------------- |
| `/health-check` | Complete system verification | All            |
| `/pre_commit`   | Run before any commit        | Local          |
| `/release`      | Publish npm packages         | GitHub Actions |
| `/refresh-docs` | Sync landing + docs          | Local          |
| `/test-local`   | E2E tests on localhost       | Local only     |
| `/test-rpi`     | Read-only RPi validation     | RPi (prod)     |

### Weekly Maintenance

1. Run `/health-check` to verify all systems
2. Check npm versions match local packages
3. Sync landing submodule if behind
4. Review audit logs on dashboard

### Release Process

1. Ensure clean git state
2. Run `gh workflow run release.yml --field version_type=patch`
3. Monitor with `gh run view --watch`
4. Deploy to RPi: `ansible-playbook -i inventory/hosts.ini playbooks/deploy-cybermem.yml`

> [!CAUTION]
> **ANSIBLE-ONLY DEPLOYMENT**: It is STRICTLY FORBIDDEN to use `docker-compose pull` or raw SSH commands for RPi updates. Use Ansible to ensure idempotent state and automated health checks.

### Disaster Recovery

| Issue         | Recovery                                                            |
| ------------- | ------------------------------------------------------------------- |
| RPi down      | `ssh pi@raspberrypi.local 'cd ~/.cybermem && docker-compose up -d'` |
| Auth broken   | Check auth-sidecar logs: `docker logs cybermem-auth-sidecar`        |
| MCP 404       | Verify Tailscale funnel: `sudo tailscale funnel status`             |
| Dashboard 401 | Clear cookie or run `cybermem-cli login`                            |

---

# 🔴 Important Findings (Tech Audit)

### 1. SQLite Binding Crisis (Jan 2026)
- **Problem**: `auth-sidecar` and `dashboard` containers crashed with "Cannot find module 'sqlite3'" or "Could not locate bindings file" on RPi (ARM64/Alpine).
- **Cause**: Minimal Dockerfiles didn't install `python3`, `make`, `g++` required to build native `sqlite3` for Alpine. Additionally, Next.js standalone's pre-bundled `node_modules` often contained the wrong binary for the target architecture.
- **Fix (The Isolated Native-Builder Pattern)**: 
  1. Use a dedicated `native-builder` stage to install dependencies in a fresh `/native` directory.
  2. For Dashboard (Next.js), specifically copy only the required packages (`sqlite3`, `sqlite`) into the final image's `node_modules`.
  3. This avoids directory/file conflicts (`cannot copy to non-directory`) while guaranteeing correct ARM64 binaries.

### 2. SQLITE_READONLY & Volume Permissions
- **Problem**: `auth-sidecar` failed to auto-initialize the `access_keys` table with `SQLITE_READONLY: attempt to write a readonly database`.
- **Cause**: 
  1. The database file on the RPi host was owned by `root`.
  2. The `docker-compose.yml` template had the volume mounted as `:ro` (read-only) for `auth-sidecar`.
  3. SQLite needs write access to the *parent directory* to create journal/WAL files.
- **Fix**: Changed host file ownership to `pi` user, updated `docker-compose.yml` to allow read-write access, and set directory permissions to `777` temporarily on the host.

### 3. Traefik Routing & Prefix Simplification (v0.9.2)
- **Problem**: Complex routing with `/cybermem` prefix caused 404s for the Dashboard and environment API due to Traefik `ForwardAuth` path mismatches.
- **Cause**: `auth-sidecar` expected the root path `/` while Traefik was sending `/auth`.
- **Fix**: Removed the `/cybermem` prefix project-wide. Dashboard is now the root service at port 8626. Consolidated all authenticated routes directly under `/mcp` and `/sse`. Added a Traefik regex redirect to handle legacy `/cybermem` requests for backwards compatibility.

### 4. RPi 32-bit Userland Platform Mismatch (CRITICAL)
- **Problem**: RPi OS 11 (Bullseye) may have a 64-bit kernel (`aarch64`) but 32-bit userspace (`linux/arm/v7`). Standard `apt install docker-ce` installs the 32-bit version. Running 64-bit Alpine containers on a 32-bit `dockerd` causes `SIGSEGV` (exit code 159) during `apk add`.
- **Cause**: 32-bit Docker daemon cannot properly manage 64-bit seccomp profiles or system calls for 64-bit containers on some RPi configurations.
- **Fix (v0.11.2)**: 
  1. Purge all 32-bit Docker packages (`docker-ce`, `docker-ce-cli`).
  2. Install 64-bit static Docker binaries (`dockerd`, `docker`) from Docker's download site.
  3. Configure a custom `systemd` service for the 64-bit static `dockerd`.
- **Verification**: `docker version` must show `OS/Arch: linux/arm64` for BOTH Client and Server.

# 💀 Postmortem: The "Missing Memories" Incident

- **Date**: 2026-01-25
- **Status**: Resolved (Data Wiped per user request)
- **What happened**: User reported "memories are gone" on RPi. Investigation showed RPi was running stale v0.7.5 images and the DB file was from Jan 14. 
- **Root Cause**: 
  1. No build/publish was triggered for previous UX changes, so RPi update pulled nothing new.
  2. Local Macbook DB had 0 records (likely due to a `/reset` or E2E test wipe). 
  3. `auth-sidecar` 401 masked the true state of the DB.
- **Action Items**: 
  - [ ] Implement `pre-deploy` check to verify if images in GHCR match current `main` branch.
  - [ ] Add "Production Warning" when running `npx @cybermem/cli reset` on local macbook if it detects an RPi on the network.

# 💀 Postmortem: The "mcp-server" Leak

- **Date**: 2026-01-26
- **Status**: Resolved (v0.11.4)
- **What happened**: RPi dashboard incorrectly suggested `http://mcp-server:8080` in the MCP integration modal.
- **Root Cause**: 
  1. The `docker-compose.yml` template used `CYBERMEM_URL=http://mcp-server:8080` for the dashboard service to perform internal health checks.
  2. The `settings` API picked up this environment variable as a "public" override, leaking the internal Docker hostname to the user interface.
- **Fix**: Renamed internal variable to `INTERNAL_MCP_URL` and pivoted to using `window.location.origin` for dynamic client-side suggestions.

# 💀 Postmortem: The "Mozilla/curl" Stats Noise

- **Date**: 2026-01-26
- **Status**: Resolved (v0.11.4)
- **What happened**: Dashboard "Top/Last Writer" cards were polluted with `Mozilla` and `curl` entries.
- **Root Cause**:
  1. The `log-exporter` had a legacy fallback that parsed `User-Agent` if the `X-Client-Name` header was missing.
  2. The dashboard's own background health checks and metrics fetching (performed by the browser or server-side fetch) did not send an identity header.
  3. The `pre-commit` gatekeeper and `curl` tests also missed the mandatory identity header.
- **Fix**: 
  1. Mandated `X-Client-Name: antigravity-client` for ALL internal system calls (Dashboard, Health, Gatekeeper).
  2. Updated `log-exporter` to prioritize verified identities and stop opportunistic UA parsing for stats aggregation.
