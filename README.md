
<div align="center">
  <p>
    <a href="https://github.com/mikhailkogan17/cybermem/actions/workflows/ci.yml"><img src="https://github.com/mikhailkogan17/cybermem/actions/workflows/ci.yml/badge.svg" alt="CI Status"></a>
    <img src="https://img.shields.io/badge/version-1.0.0-%23099270" alt="Version">
    <img src="https://img.shields.io/badge/MCP-Ready-%23099270?logo=modelcontextprotocol" alt="MCP Ready">
    <img src="https://img.shields.io/badge/license-MIT-%23099270" alt="License">
  </p>
  
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/assets/logo-dark.svg">
    <source media="(prefers-color-scheme: light)" srcset="docs/assets/logo-light.svg">
    <img alt="CyberMem Logo" src="docs/assets/logo-light.svg" width="600">
  </picture>

  <h1>CyberMem</h1>
  <p><strong>Universal Long-Term Memory for any AI Agent.</strong></p>
  <p>Based on <a href="https://github.com/CaviraOSS/OpenMemory">OpenMemory</a>.</p>
</div>

---

## Why CyberMem?

- **Easy to Install**: Get started in seconds with a single command. No complex setup required.
- **Universal**: Runs smoothy on your Mac, Raspberry Pi, or high-performance Cloud VPS.
- **Secure & Controlled**: Enterprise-grade monitoring and full sovereignty over your memory data.

## 🚀 Installation

### Desktop (Mac/Linux)
```bash
curl -fsSL https://raw.githubusercontent.com/mikhailkogan17/cybermem/main/scripts/install.sh | bash
```

### Raspberry Pi (Cluster)
```bash
curl -fsSL https://raw.githubusercontent.com/mikhailkogan17/cybermem/main/scripts/install.sh | bash -s -- --target rpi
```

### Cloud VPS (Kubernetes)
```bash
curl -fsSL https://raw.githubusercontent.com/mikhailkogan17/cybermem/main/scripts/install.sh | bash -s -- --target vps
```

## 📊 Dashboard

Manage your agents' memories with a beautiful, real-time interface.

![Dashboard Preview](docs/assets/dashboard_preview.png)
*(Replace with actual screenshot link)*

- **Real-time Metrics**: Throughput, latency, and error rates.
- **Memory Inspector**: View and edit stored memories.
- **Documentation**: Full guides available at `/docs`.

## 🏗 Architecture

```mermaid
graph TD
    Client["Client (Claude/Cursor)"] -->|MCP Protocol| Traefik
    Traefik -->|Load Balance| OM[OpenMemory API]
    Traefik -->|Logs| Vector
    OM -->|Store| DB[(PostgreSQL/SQLite)]
    Vector -->|Metrics| Prometheus
    Prometheus -->|Data| Grafana
    Prometheus -->|Data| Dashboard
```

## License

MIT © [Mikhail Kogan](https://github.com/mikhailkogan17)
