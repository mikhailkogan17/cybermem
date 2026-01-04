# CyberMem Project Context

## 1. Project Overview
**CyberMem** is a production-grade AI memory system wrapping [OpenMemory](https://github.com/CaviraOSS/OpenMemory) with specific DevOps infrastructure.
- **Goal**: Provide monitoring, observability, and multi-platform support (Local, RPi, VPS) without modifying OpenMemory code.
- **Core Principle**: "No code modifications to OpenMemory" (it's a git submodule). Logic is implemented via sidecars (Vector, Traefik) and database exporters.

## 2. Technology Stack & Architecture
- **App Core**: OpenMemory (Python/FastAPI) as `external/openmemory` submodule.
- **Infrastructure**:
  - **Networking**: Tailscale Funnel (zero-config public HTTPS for RPi/VPS).
  - **Reverse Proxy**: Traefik (handles auth extraction into logs).
  - **Log Processing**: Vector (parses Traefik access logs -> Prometheus metrics).
  - **Metrics**: Prometheus (scrapes Vector + Postgres Exporter).
  - **Visualization**: Grafana (dashboards for writes/reads, latency, errors).
  - **Database**:
    - **VPS (Cloud)**: PostgreSQL (via Helm charts in CLI templates).
    - **Local/RPi**: SQLite.
  - **Embeddings**: OpenAI (VPS) or Ollama (Local/RPi).
  - **Orchestration**: Docker Compose (Local) -> converted to Helm charts via `kompose` (VPS).
- **Monorepo Architecture**:
  - **NPM Workspaces**: Manages `@cybermem/cli`, `@cybermem/dashboard`, and `@cybermem/mcp`.

## 3. Directory Map
- `packages/cli/`: Management CLI (@cybermem/cli)
  - `templates/`: Production-ready configurations (Docker Compose, Helm Charts, Ansible Playbooks, Terraform Modules, Tailscale Funnel).
- `packages/dashboard/`: Monitoring UI (metrics, audit logs) — NOT the public landing page.
- `packages/mcp/`: MCP Server (Python).
- `external/openmemory/`: OpenMemory submodule.
- `tools/`: Utility scripts (load_test.sh, e2e tests).
- `README_assets/`: Assets for project documentation.
