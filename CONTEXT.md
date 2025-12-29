# CyberMem Project Context

## 1. Project Overview
**CyberMem** is a production-grade AI memory system wrapping [OpenMemory](https://github.com/CaviraOSS/OpenMemory) with specific DevOps infrastructure.
- **Goal**: Provide monitoring, observability, and multi-platform support (Local, RPi, VPS) without modifying OpenMemory code.
- **Core Principle**: "No code modifications to OpenMemory" (it's a git submodule). Logic is implemented via sidecars (Vector, Traefik) and database exporters.

## 2. Technology Stack & Architecture
- **App Core**: OpenMemory (Python/FastAPI) as `external/openmemory` submodule.
- **Infrastructure**:
  - **Reverse Proxy**: Traefik (handles auth extraction into logs).
  - **Log Processing**: Vector (parses Traefik access logs -> Prometheus metrics).
  - **Metrics**: Prometheus (scrapes Vector + Postgres Exporter).
  - **Visualization**: Grafana (dashboards for writes/reads, latency, errors).
  - **Database**:
    - **VPS (Cloud)**: PostgreSQL (via Helm).
    - **Local/RPi**: SQLite.
  - **Embeddings**: OpenAI (VPS) or Ollama (Local/RPi).
  - **Orchestration**: Docker Compose (Local) -> converted to Helm charts via `kompose` (VPS).

## 3. Directory Map
- `dashboard/`: Next.js Dashboard
- `mcp/`: MCP Server (Python)
- `external/openmemory/`: OpenMemory submodule
- `monitoring/`: Configs for Traefik, Vector, Prometheus
- `deploy.sh`: Main deployment script
- `charts/cybermem`: Kubernetes Helm charts
