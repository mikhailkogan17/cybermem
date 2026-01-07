<div align="center">
  <p>
    <a href="https://cybermem.dev"><img src="https://img.shields.io/badge/website-cybermem.dev-10b981?&logoColor=white" alt="website"></a>
    <a href="https://cybermem.dev/docs"><img src="https://img.shields.io/badge/docs-read_now-10b981" alt="docs"></a>
    <a href="https://www.npmjs.com/package/@cybermem/mcp-server"><img src="https://img.shields.io/npm/v/@cybermem/mcp-server?color=10b981&label=npm&" alt="npm"></a>
    <a href="https://github.com/mikhailkogan17/cybermem/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/mikhailkogan17/cybermem/ci.yml?label=CI&color=10b981" alt="CI"></a>
    <img src="https://img.shields.io/badge/license-MIT-10b981" alt="license">
  </p>
  
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="README_assets/logo-dark.svg" width="490">
    <source media="(prefers-color-scheme: light)" srcset="README_assets/logo-light.svg" width="490">
    <img alt="CyberMem Logo" src="README_assets/logo-light.svg" width="490">
  </picture>

  <h3>Universal Long-Term Memory for AI Agents</h3>

  ---

  <p><strong>Production-grade MCP Server</strong><br>
  Docker Compose • Helm Charts • Ansible Playbooks • Prometheus • Traefik • Based on <a href="https://github.com/CaviraOSS/OpenMemory">CaviraOSS/OpenMemory</a></p>
</div>

## Features

| Feature                    | Description                                                                    |
| -------------------------- | ------------------------------------------------------------------------------ |
| **Model Context Protocol** | Native Model Context Protocol support for Claude, Cursor, and other AI clients |
| **Multi-Platform**         | Deploy on Mac, Raspberry Pi, or Cloud VPS with one command                     |
| **Infrastructure as Code** | Production-ready Docker Compose, Helm Charts, Ansible Playbooks                |
| **Observability**          | Built-in Prometheus metrics, Grafana dashboards, audit logs                    |
| **Security**               | Traefik reverse proxy, Tailscale Funnel for zero-config HTTPS                  |

## Try It Out!

To try CyberMem on your local machine, run:
```bash
npx @cybermem/mcp
```
and follow the instructions in terminal.

**Full Quick Start guide for every platform is available at [cybermem.dev/#quickstart](https://cybermem.dev/#quickstart).**

## Architecture

> **What makes CyberMem different?** It wraps [OpenMemory](https://github.com/CaviraOSS/OpenMemory) with production infrastructure — per-client audit logging, observability, and multi-platform deployment. No code changes to OpenMemory required.

```mermaid
graph LR
    subgraph Clients["🤖 AI Clients"]
        Claude["Claude"]
        Cursor["Cursor"]
        Antigravity["Antigravity"]
    end

    subgraph Infra["⚙️ CyberMem Infrastructure"]
        Traefik["🔀 Traefik<br/>Auth + Routing"]
        Vector["📊 Vector<br/>Log Parsing"]
        Prometheus["📈 Prometheus<br/>Metrics"]
    end

    subgraph Core["🧠 Memory Engine"]
        OpenMemory["OpenMemory<br/>Graph + Embeddings"]
        DB["💾 SQLite/Postgres"]
    end

    subgraph UI["📱 Dashboard"]
        Dashboard["Monitoring<br/>Audit Logs"]
    end

    Claude -->|MCP| Traefik
    Cursor -->|MCP| Traefik
    Antigravity -->|MCP| Traefik
    
    Traefik --> OpenMemory
    Traefik --> Vector
    OpenMemory --> DB
    Vector --> Prometheus
    Prometheus --> Dashboard
```

| Component      | Purpose                                                 |
| -------------- | ------------------------------------------------------- |
| **OpenMemory** | Graph-based memory engine with Ollama/OpenAI embeddings |
| **Traefik**    | Reverse proxy with auth extraction and access logging   |
| **Vector**     | Parses Traefik logs into per-client metrics             |
| **Prometheus** | Time-series storage for audit and observability         |
| **Dashboard**  | Real-time monitoring, client activity, audit logs       |

## Repository Structure

```
cybermem/
├── packages/
│   ├── cli/          # @cybermem/cli - Deployment CLI
│   ├── mcp/          # @cybermem/mcp-server - MCP Server
│   └── dashboard/    # @cybermem/dashboard - Monitoring UI
├── docs/             # Documentation
├── external/
│   └── openmemory/   # OpenMemory submodule
└── patches/          # OpenMemory customizations
```

## Documentation

Full documentation available at **[cybermem.dev/docs](https://cybermem.dev/docs)** (or browse links below):

| Guide                                                                               | Description                       |
| :---------------------------------------------------------------------------------- | :-------------------------------- |
| [Local Setup](https://github.com/mikhailkogan17/cybermem/blob/main/docs/local.md)   | Mac/Linux development environment |
| [Raspberry Pi](https://github.com/mikhailkogan17/cybermem/blob/main/docs/rpi.md)    | Edge deployment with Tailscale    |
| [Cloud/VPS](https://github.com/mikhailkogan17/cybermem/blob/main/docs/vps.md)       | Production Kubernetes deployment  |
| [MCP Integration](https://github.com/mikhailkogan17/cybermem/blob/main/docs/mcp.md) | Connect Claude, Cursor, and more  |

## Contributing

Contributions are welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup and guidelines.

## License

MIT © [Mikhail Kogan](https://github.com/mikhailkogan17)
