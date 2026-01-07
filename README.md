<div align="center">
  <p>
    <a href="https://cybermem.dev"><img src="https://img.shields.io/badge/website-cybermem.dev-10b981?&logoColor=white" alt="website"></a>
    <a href="https://docs.cybermem.dev"><img src="https://img.shields.io/badge/docs-read_now-10b981" alt="docs"></a>
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

## Architecture Overview

```mermaid
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
        Vector["**Vector**<br/>(Log Parsing)"]
        Prom["**Prometheus**<br/>(Metrics)"]
        Dash["**Dashboard**<br/>(Monitoring UI)"]
        OM["**OpenMemory**<br/>(AI Memory Engine)"]
        DB["**SQLite / Postgres**<br/>(Persistence)"]
        
        Traefik -->|Logs| Vector
        Traefik -->|API| OM
        OM --> DB
        Vector --> Prom
        Prom --> Dash
    end

    Compose -.-> Traefik
    Ansible -.-> Traefik
    Helm -.-> Traefik
```

## Project Structure (Monorepo)

```
cybermem/
├── packages/
│   ├── core/                 # AI memory engine (Node.js)
│   │   ├── src/
│   │   └── __tests__/
│   ├── cli/                  # Command-line tool (TypeScript)
│   │   ├── src/              # CLI logic
│   │   ├── templates/        # ⭐ Infrastructure templates
│   │   │   ├── docker-compose.yml
│   │   │   ├── k8s/
│   │   │   │   ├── deployment.yaml
│   │   │   │   ├── service.yaml
│   │   │   │   └── ingress.yaml
│   │   │   └── aws/
│   │   │       └── ecs-task-def.json
│   │   └── e2e/              # ⭐ End-to-end tests
│   │       ├── basic.test.ts         # Smoke test
│   │       ├── k8s.test.ts           # K8s deployment test
│   │       └── docker.test.ts        # Docker test
│   └── docs/                 # Documentation site
├── .github/
│   └── workflows/            # ⭐ CI/CD pipelines
│       ├── test.yml          # Run tests on every PR
│       ├── publish.yml       # Auto-publish on release
│       └── e2e.yml           # E2E tests in CI
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

MIT © [Mikhail Kogan](https://github.com/mikhailkogan17)
