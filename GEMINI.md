# CyberMem - GEMINI.md

> [!CAUTION]
> **STRICT PROHIBITION: NO AUTO-RELEASE**
> It is **STRICTLY FORBIDDEN** to trigger a release (`gh workflow run publish.yml`) without:
> 1.   explicit user command: "RELEASE" or "DEPLOY".
> 2.   **AND** explicit user confirmation phrase: "I CONFIRM RELEASE" or "Я ПОДТВЕРЖДАЮ".
> 3.   **AND** the current branch MUST be `main`.
> 
> *Constraint*: The Agent MUST notify the user "Ready to release?" and WAIT. Never assume consent from "looks good" or "fix this".
>
> FAILURE TO FOLLOW THIS PROTOCOL WILL BE BLOCKED BY BRANCH PROTECTION.

## 1. CyberMem Project Overview

**CyberMem** is a production-grade AI memory system that provides persistent context for AI agents.

**Goal**: Provide monitoring, observability, and multi-platform support (Local, RPi, VPS) with an integrated, high-performance architecture.

### Landing and Documentation

- **Landing**: [https://cybermem.dev](https://cybermem.dev)
- **Documentation**: [https://docs.cybermem.dev](https://docs.cybermem.dev)
- **Source Code**: [https://github.com/mikhailkogan17/cybermem](https://github.com/mikhailkogan17/cybermem)
- **Readme**: [https://github.com/mikhailkogan17/cybermem/blob/main/README.md](https://github.com/mikhailkogan17/cybermem/blob/main/README.md)

## Table of Contents
1. [Project Overview](#1-cybermem-project-overview)
2. [Agile Roles](#12-agile-roles--responsibilities)
3. [Sprint Lifecycle](#13-sprint-lifecycle-tokens-optimization)
4. [Lethal Laws](#14-lethal-laws-of-agent-behavior-non-negotiable)
5. [Agent Protocol](#15-mandatory-agent-protocol-ci--dangerjs)
6. [Architecture](#2-terminology-stack--architecture)
7. [Directory Map](#3-directory-map)
8. [Environment Classification](#-environment-classification-critical)
9. [Development Config](#-important-local-development-configuration)
10. [Maintenance](#11-maintenance-workflows)

> [!CAUTION]
> **It is FORBIDDEN to:**
>
> - Ignore linting rules
> - Ignore GEMINI.md rules
> - Skip workflow steps and/or required Playwright runs
> - Force a commit without fixing a cause (linting, gitleaks, etc)
> - [ ] **Commit without running local tests first (`npm run test:e2e`)**

## 1.2 AGILE ROLES & RESPONSIBILITIES

> [!NOTE]
> **Strict Role Separation for Velocity & Quality**

| Role                                | Who        | Responsibilities                                                                   |
| :---------------------------------- | :--------- | :--------------------------------------------------------------------------------- |
| **Business Aim & Delivery Manager** | **User**   | Defines *What* (Business Aim), Approves Plans, Reviews PRs (TL), Accepts Delivery. |
| **Tech Lead & Implementer**         | **Agent**  | Defines *How* (Tech Plan), Implements Code, Refactors, Fixes Bugs.                 |
| **QA & SDET**                       | **Agent**  | Writes/Runs E2E Tests, Ensures Quality Matrix, Proves Verification (Screenshots).  |
| **CI/CD Automation**                | **GitHub** | Enforces Quality Gates, Publishes Releases, Deploys to Prod.                       |

## 1.3 SPRINT LIFECYCLE (Tokens Optimization)

To Ensure "Always Availability" and shorter token usage, follow this strict cycle:

1.  **Planning (High Context / Low Token)**:
    - User gives Business Aim.
    - Agent checks `task.md` & `GEMINI.md`.
    - Agent creates/updates `implementation_plan.md`.
    - User Approves. **(STOP if not approved)**.

2.  **Implementation (High Token / Deep Work)**:
    - Agent enters EXECUTION mode.
    - Strict adherence to Plan. No side-quests.
    - Atomic commits.

3.  **Testing (Local / Zero Cost)**:
    - Agent runs `npm run test:e2e`.
    - Agent fixes bugs locally.

4.  **Publication (Automated)**:
    - Agent opens PR (via **GitHub MCP**).
    - CI/CD runs Verification Matrix.
    - **Double Gatekeeping**: Both **Agent** (locally) AND **CI** (remotely) must run the E2E matrix before release.
    - User merges.
    - CD deploys to RPi.

## 1.3.1 RELEASE SSoT STRATEGY

> [!IMPORTANT]
> **Source of Truth for Release Verification**

- **release-reports/**: Detailed Proof of Work (Screenshots + Checklists). The absolute SSoT for *verification*.
- **CHANGELOG.md**: Executive Summary. MUST link to the specific Release Report.
- **GitHub Release**: Artifact distribution. Inherits content from CHANGELOG.

## 1.4 LETHAL LAWS OF AGENT BEHAVIOR (Non-Negotiable)

> [!CAUTION]
> **Strict Rules for Agent Autonomy & Identity**

### Core Behavior
1.  **Zero Trust**: Never assume; Verify.
2.  **No Kanban Changes**: Agent MUST NOT change process columns/types without User Consent.
3.  **Strict E2E**: Never skip `e2e.ts` before PR.

### Identity & Privacy (Technologically Enforced)
1. **NO HARDCODED X-CLIENT-NAME**: Use dynamic variables/constants.
2. **MANDATORY IDENTIFICATION**: Every request MUST send `X-Client-Name`.
3. **NO ENV LEAKAGE**: Public MCP config MUST NOT use internal Docker envs.
4. **ARGS > ENVS**: High-level config passed via CLI args.
5. **IDENTITY LAW**: `X-Client-Name` MUST be strictly `antigravity` or `antigravity-client`.
6. **CLI-ONLY DEPLOYMENT**: Deploy via `@cybermem/cli`.
7. **MANDATORY ENV TAGGING**: `CYBERMEM_ENV`, `CYBERMEM_INSTANCE` must be set.
8. **ZERO DIRECT PORT EXPOSURE**: All access via Traefik (8625/8626).
9. **NO TOKENS IN ENVS**: Use Docker Secrets.

## 1.5 MANDATORY AGENT PROTOCOL (CI & DangerJS)

> [!IMPORTANT]
> **We use Automated Quality Gates via CI and DangerJS.**

1.  **Local Verification**: The pre-commit hook (automatically installed from `.hooks/pre-commit`) runs linting checks before each commit. Run `npm run test:e2e` for full E2E verification BEFORE pushing.
2.  **Pull Request**: All changes must go through a PR (no direct commits to `main`).
3.  **Danger Checks**:
    - **Docs**: Must be updated if code changes.
    - **Evidence**: Screenshots recommended in PR description.
4.  **Merge**: Only possible after CI passes and Tech Lead approves.

## 1.5.1 PR TEMPLATE SELECTION & GITHUB MCP

> [!IMPORTANT]
> **Agents MUST strictly map branches to PR templates before creation.**

| PR Title Prefix | Template Path                              | Requirement                                        |
| :-------------- | :----------------------------------------- | :------------------------------------------------- |
| `feat`          | `.github/PULL_REQUEST_TEMPLATE/feature.md` | Must include Decomposition & Verification headers. |
| `fix`           | `.github/PULL_REQUEST_TEMPLATE/bugfix.md`  | Must include Analysis & Root Cause headers.        |

1.  **Work**: Agent commits to `feat/*` or `chore/*` branches with `Antigravity Agent` git config.
2.  **Template Verification**: BEFORE calling GitHub MCP, Agent MUST verify that the PR body contains all headers from the required template.
3.  **PR Creation**: Agent uses `mcp_github-mcp-server_create_pull_request` to open the PR.
4.  **Review**: User (Tech Lead) reviews the PR and merges.



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

### Strict Environment Table (Source of Truth)

### Strict Environment Table (Source of Truth)

> [!IMPORTANT]
> **STRICT ENVIRONMENT MAPPING**
> 
> | Environment         | URL                                |
> | ------------------- | ---------------------------------- |
> | **LOCALHOST-STG**   | `http://localhost:8625`            |
> | **LOCALHOST-PROD**  | `http://localhost:8626`            |
> | **RPI-LAN-STG**     | `http://raspberrypi.local:8625`    |
> | **RPI-LAN-PROD**    | `http://raspberrypi.local:8626`    |
> | **RPI-TS-STG**      | `https://raspberrypi.ts.net/cybermem-staging` |
> | **RPI-TS-PROD**     | `https://raspberrypi.ts.net/cybermem` |
> | **K3D-STAGING**     | `http://localhost:8627`            |           |

> [!ATTENTION] it is FORBIDDEN to change:
> - base URL of any environment
> - any path of any environment
> - any port of any environment

<br>

### Test Workflow Rules

| Workflow                     | Local                 | RPi                     |
| ---------------------------- | --------------------- | ----------------------- |
| `npm run test:e2e` (local)   | ✅ Full CRUD + DB wipe | ❌ Never run             |
| `npm run test:e2e` (RPi)     | ❌ N/A                 | ✅ Read-only checks only |
| `tools/test-backup-restore`  | ✅ Restore TO local    | ❌ Backup FROM RPi only  |
| `scripts/rpi-sync-build.sh`  | ✅ Receive data        | ❌ Source only (read)    |

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

### Lethal Laws of UI (Verification)

> [!CAUTION]
> **1. NO /settings PATH**: It is STRICTLY FORBIDDEN to use or link to a `/settings` URL. Settings MUST be a Modal triggered by the Gear Icon on the Dashboard.
> **2. MANDATORY EYE-ICON**: Release reports MUST show the API token made visible via the "eye" icon in the Settings modal.
> **3. NO LOCAL SUBPATHS**: Localhost environments (`127.0.0.1`, `localhost`) MUST ALWAYS serve the Dashboard at the root (`/`). Subpaths like `/cybermem-staging` are EXCLUSIVE to Tailscale/Remote environments.

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
    Dash->>DBE: GET /api/metrics
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
> Run `npm run test:e2e` weekly or before demos/interviews to verify all systems.

### Core Workflows

| Workflow                  | Purpose                          | Environment    |
| ------------------------- | -------------------------------- | -------------- |
| `npm run test:e2e`        | Complete E2E system verification | All            |
| `.hooks/pre-commit`       | Linting checks (auto-installed)  | Local          |
| `npm run release`         | Publish npm packages             | Local/CI       |
| `gh workflow run publish.yml` | Trigger GitHub release workflow | GitHub Actions |
| `.agent/workflows/publish.md` | Agent release workflow       | Agent          |
| `.agent/workflows/commit.md`  | Agent commit workflow        | Agent          |

### Weekly Maintenance

1. Run `npm run test:e2e` to verify all systems
2. Check npm versions match local packages
3. Sync landing submodule if behind (manual process)
4. Review audit logs on dashboard

### Release Process

1. Ensure clean git state
2. Run `gh workflow run publish.yml --field version_type=patch`
3. Monitor with `gh run view --watch`
4. Deploy to RPi: `ansible-playbook -i inventory/hosts.ini playbooks/deploy-cybermem.yml`

> [!CAUTION]
> **ANSIBLE-ONLY DEPLOYMENT**: It is STRICTLY FORBIDDEN to use `docker-compose pull` or raw SSH commands for RPi updates. Use Ansible to ensure idempotent state and automated health checks.
> [!NOTE]
> **We use Linear via MCP for all task tracking.**

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

### 5. Staging E2E Auth Failure (Feb 2026)
- **Problem**: E2E tests failed on RPi (Tailscale staging) with 401 Unauthorized for `/add`, `/api/metrics`, and 404 for root `/`.
- **Cause**: 
  1. Tailscale staging environments use subpaths (e.g., `/cybermem-staging`) and enforce token-based authentication via `auth-sidecar`.
  2. The E2E test runner (GitHub Action) was sending requests to the root `/` and missing the required `Authorization: Bearer <token>` header.
- **Fix**: 
  1. Updated `publish.yml` to generate a dedicated `staging-e2e` token and pass it to both Ansible (for environment setup) and Playwright.
  2. Implemented `getHeaders()` helper in E2E tests to automatically include the token on non-localhost environments.
  3. Added conditional `test.skip()` for routing tests that are specific to root-level deployments.

---

## 1.7 VERIFICATION STANDARD (The 16-Screen Rule)

> [!IMPORTANT]
> **Every release MUST prove stability across 4 environments with 4 distinct screenshots each (16 total).**

### Required Screenshots per Environment:
1.  **Dashboard Home**: Validates UI load and Data presence (0 or N records).
2.  **Health Check**: `/health` (JSON) validates API baseline.
3.  **Stats/Identity**: `/api/metrics` (JSON) or Dashboard Card proves `Last Writer: antigravity-client`.
4.  **Auth State**:
    - **Local/RPi**: Direct Dashboard access (No Login).
    - **Zero Trust**: Login Page (Redirect) or Authenticated view.

### Environments:
1.  **Local** (`localhost:8626`)
2.  **Kubernetes** (`k3d`, `localhost:8626`)
3.  **RPi Local** (`raspberrypi.local:8626`)
4.  **Zero Trust** (`https://raspberrypi...ts.net`)

## 1.8 AGENTIC QUALITY GATES & DECOMPOSITION

> [!IMPORTANT]
> **Agent Responsibility Protocol**
> The Agent guarantees quality. The User provides the "What", the Agent ensures the "How" meets all standards.
> Before writing code, the Agent MUST internally decompose the feature using this strict template:

### Feature Decomposition Standard
1.  **Requirements**: List explicit user needs.
2.  **Existing Patterns**: Identify similar features in `path/to/existing` to maintain consistency.
3.  **Edge Cases**: Identify at least 2 failure modes (e.g., Network Down, Auth Expired, Read-only FS).
4.  **Acceptance Criteria**:
    - 100% Test Coverage for new modules.
    - E2E Tests pass on Local & RPi.
    - No regression in startup time or auth flow.

## 1.9 Linear MCP BOARD CONFIGURATION (Reference)

> [!NOTE]
> **Source of Truth for Automation IDs**

| entity      | Name               | ID                               |
| :---------- | :----------------- | :------------------------------- |
| **Project** | **CyberMem Board** | `1` (Owner: `mikhailkogan17`)    |
| **Field**   | **Status**         | `PVTSSF_lAHOBd5jG84BN0uLzg8tZsc` |
| **Field**   | **FixVersion**     | `PVTF_lAHOBd5jG84BN0uLzg8tZtI`   |

### Status Options (Column IDs)
| Column               | Option ID  | Verified Transition   |
| :------------------- | :--------- | :-------------------- |
| **Backlog**          | (Default)  | Issue Open            |
| **Ready to Develop** | `5df6f87a` | Issue Assigned        |
| **In Progress**      | `c8b647cc` | PR Open               |
| **Review**           | `c09104c6` | PR Ready              |
| **Done**             | `c773af5`  | PR Merged             |
| **Released**         | `e6d10f39` | `publish.yml` Success |

## 1.10 TASK MANAGEMENT (Linear MCP)

> [!NOTE]
> **We use Linear via MCP for all task tracking.**

### Core Workflow
1.  **List Tasks**: Use `mcp_linear-mcp-server_list_issues` to see active work.
2.  **View Task**: Use `mcp_linear-mcp-server_get_issue(id="CM-X")` to read requirements.
3.  **Update**: Use `mcp_linear-mcp-server_create_comment` to add proofs/updates.

### Convention
- **CM-XXX**: Identifier for all tasks.
- **Title**: Must be descriptive.
- **Description**: Contains "Environment", "Component", and acceptance criteria.

## 1.11 TASK TEMPLATES (Agile)

> [!TIP]
> **Use these templates for high-fidelity agent context.**

- **Feature**: `.agent/templates/linear-feature.md`
- **Bug**: `.agent/templates/linear-bug.md`

When creating tasks via MCP or UI, strictly adhere to these structures to ensure the Agent has sufficient context to execute without "halting for clarification".

