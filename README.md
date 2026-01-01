
<div align="center">
  <p>
    <a href="https://github.com/mikhailkogan17/cybermem/actions/workflows/ci.yml"><img src="https://github.com/mikhailkogan17/cybermem/actions/workflows/ci.yml/badge.svg" alt="CI Status"></a>
    <img src="https://img.shields.io/badge/version-1.0.0-%23099270" alt="Version">
    <img src="https://img.shields.io/badge/MCP-Ready-%23099270?logo=modelcontextprotocol" alt="MCP Ready">
    <img src="https://img.shields.io/badge/license-MIT-%23099270" alt="License">
  </p>
  
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="README_assets/images/logo-dark.svg">
    <source media="(prefers-color-scheme: light)" srcset="README_assets/images/logo-light.svg">
    <img alt="CyberMem Logo" src="README_assets/images/logo-light.svg" width="600">
  </picture>

  <p><strong>Universal Long-Term Memory for any AI Agent.</strong></p>
  <p>Based on <a href="https://github.com/CaviraOSS/OpenMemory">OpenMemory</a>.</p>
</div>

## Why CyberMem?

- **Easy to Install**: Get started in seconds with a single command. No complex setup required.
- **Universal**: Runs smoothy on your Mac, Raspberry Pi, or high-performance Cloud VPS.
- **Secure & Controlled**: Enterprise-grade monitoring and full sovereignty over your memory data.

## 🚀 Installation

### Desktop (Mac/Linux)
```bash
# Install and deploy in one command
npm install -g @cybermem/cli && cybermem deploy
```

### Raspberry Pi (Cluster)
```bash
curl -fsSL https://cybermem.dev/rpi | bash
```

### Cloud VPS (Kubernetes)
```bash
curl -fsSL https://cybermem.dev/cloud | bash
```

## 📊 Dashboard

Manage your agents' memories with a beautiful, real-time interface.

<!--
<img src="README_assets/images/dashboard1.png" width="49%"></img>
<img src="README_assets/images/dashboard2.png" width="49%"></img>
<img src="README_assets/images/dashboard3.png" width="49%"></img>
<img src="README_assets/images/dashboard4.png" width="49%"></img>
-->

- **Real-time Metrics**: Throughput, latency, and error rates.
- **Memory Inspector**: View and edit stored memories.
- **Documentation**: Visit [cybermem.dev/docs](https://cybermem.dev/docs) for full guides.

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
