<div align="center">
  <p>
    <a href="https://cybermem.dev"><img src="https://img.shields.io/badge/website-cybermem.dev-10b981?&logoColor=white" alt="website"></a>
    <a href="https://docs.cybermem.dev"><img src="https://img.shields.io/badge/docs-read_now-10b981" alt="docs"></a>
    <a href="https://github.com/mikhailkogan17/cybermem/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/mikhailkogan17/cybermem/ci.yml?label=CI" alt="CI"></a>
    <a href="https://www.npmjs.com/package/@cybermem/mcp"><img src="https://img.shields.io/npm/v/@cybermem/mcp?color=10b981&label=npm&" alt="npm"></a>
    <img src="https://img.shields.io/badge/license-MIT-10b981" alt="license">
  </p>
  
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="README_assets/logo-dark.svg" width="490">
    <source media="(prefers-color-scheme: light)" srcset="README_assets/logo-light.svg" width="490">
    <img alt="CyberMem Logo" src="README_assets/logo-light.svg" width="490">
  </picture>

  <h3>Your AI Memory — Deploy Anywhere</h3>
  <p><em>Platform Engineering MCP Server for DevOps & AI Teams</em></p>

---

  <p><strong>Production-grade MCP Server</strong><br>
  <strong>Docker Compose</strong> • <strong>Helm Charts</strong> • <strong>Ansible Playbooks</strong> • <strong>SQLite</strong> • <strong>Traefik</strong></p>
</div>

## Features

| Feature                    | Description                                                                    |
| -------------------------- | ------------------------------------------------------------------------------ |
| **Model Context Protocol** | Native Model Context Protocol support for Claude, Cursor, and other AI clients |
| **Multi-Platform**         | Deploy on Mac, Raspberry Pi, or Cloud VPS with one command                     |
| **Infrastructure as Code** | Production-ready **Docker Compose**, **Helm Charts**, **Ansible Playbooks**    |
| **Observability**          | Built-in SQLite activity metrics, beautiful time-series charts, audit logs     |
| **Security**               | Traefik reverse proxy, Tailscale Funnel for zero-config HTTPS                  |

## Try It Out!

To try CyberMem on your local machine, run:

```bash
npx @cybermem/cli init
```

and follow the instructions in terminal.

**Full Quick Start guide for every platform is available at [cybermem.dev/#quickstart](https://cybermem.dev/#quickstart).**

## Why CyberMem?

> **Problem:** Your AI tools (Claude, Cursor, Antigravity) don't share memory. Each session starts fresh.
>
> **Solution:** CyberMem gives them a shared, persistent memory layer.

| Without CyberMem                      | With CyberMem                        |
| ------------------------------------- | ------------------------------------ |
| Claude forgets your project context   | All tools remember your preferences  |
| Cursor doesn't know your coding style | Context persists across sessions     |
| Each tool has separate knowledge      | One unified memory for all AI agents |

**For Platform Engineers:** CyberMem also demonstrates Infrastructure as Code practices — CLI generates Docker Compose, Ansible Playbooks, or Helm Charts depending on your target platform.

## Architecture Overview

```mermaid
---
config:
  theme: base
  wrappingWidth: 290
  fontSize: 11
---
graph TD
    subgraph Gen["🏗️ Platform Engineering Engine"]
        CLI["**CLI**"]
        Templates["**Infrastructure Templates**"]
        CLI --> Templates

        Compose["**Docker Compose**<br/>(Local)"]
        Ansible["**Ansible**<br/>(IoT/Edge)"]
        Helm["**Helm Charts**<br/>(Cloud/K8s)"]

        Templates --> Compose
        Templates --> Ansible
        Templates --> Helm
    end

    subgraph Runtime["⚙️ CyberMem Runtime"]
        Traefik["**Traefik**<br/>(Reverse Proxy)"]
        LE["**Log Exporter**<br/>(Access Logs)"]
        DBE["**DB Exporter**<br/>(SQLite Metrics)"]
        Dash["**Dashboard**<br/>(Monitoring UI)"]
        OM["**Core API**<br/>(Memory Engine)"]
        DB["**SQLite / Postgres**<br/>(Persistence)"]

        Traefik -->|Logs| LE
        Traefik -->|API| OM
        OM --> DB
        LE --> DB
        DB --> DBE
        DBE --> Dash
    end

    Compose -.-> Traefik
    Ansible -.-> Traefik
    Helm -.-> Traefik
```

## Project Structure (Monorepo)

```
cybermem/
├── packages/
│   ├── cli/                  # Command-line tool (TypeScript)
│   │   ├── src/              # CLI logic
│   │   └── templates/        # ⭐ Infrastructure templates
│   ├── mcp/                  # MCP Server & Core Engine (TypeScript)
│   │   └── src/              # Tooling & Memory Logic
│   └── dashboard/            # Monitoring UI (Next.js)
├── docs/                     # Documentation sources
├── .github/
│   └── workflows/            # ⭐ CI/CD pipelines
└── README.md
```

**Key innovation:** `packages/cli/templates/` contains the **infrastructure-as-code templates**.
The CLI reads these, interpolates variables, and generates production configs.

## Documentation

Full documentation available at **[docs.cybermem.dev](https://docs.cybermem.dev)**:

| Guide                                            | Description                       |
| :----------------------------------------------- | :-------------------------------- |
| [Local Setup](https://docs.cybermem.dev/local)   | Mac/Linux development environment |
| [Raspberry Pi](https://docs.cybermem.dev/rpi)    | Edge deployment with Tailscale    |
| [Cloud/VPS](https://docs.cybermem.dev/vps)       | Production Kubernetes deployment  |
| [MCP Integration](https://docs.cybermem.dev/mcp) | Connect Claude, Cursor, and more  |

## Contributing

Contributions are welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup and guidelines.

## License

MIT

Created by [Mikhail Kogan](https://github.com/mikhailkogan17) | [LinkedIn](https://linkedin.com/in/mikhail-kogan-platform)
