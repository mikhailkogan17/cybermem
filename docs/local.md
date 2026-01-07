# Local Development

Complete guide for running CyberMem on your local machine (Mac/Linux).

## Overview

Local deployment uses:
- **SQLite** for storage (no external database needed)
- **Ollama** for embeddings (or synthetic fallback)
- **Docker Compose** for orchestration
- **Keyless localhost access** (no API key required)

## Prerequisites

- Docker Desktop or Docker Engine
- Node.js 18+
- 4GB RAM minimum
- 5GB disk space

## Quick Setup

```bash
# Deploy local stack
npx @cybermem/cli deploy --target local

# Or step by step
npx @cybermem/cli init
npx @cybermem/cli up
```

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                    localhost                         │
├─────────────────────────────────────────────────────┤
│  :3000 Dashboard    :8626 Traefik    :9092 Prometheus│
│         ↓              ↓                  ↓          │
│     Next.js        OpenMemory         Metrics        │
│         └──────────────┴──────────────────┘          │
│                        ↓                             │
│                   SQLite + Ollama                    │
└─────────────────────────────────────────────────────┘
```

## Services

| Service        | Port     | Description                |
| -------------- | -------- | -------------------------- |
| **Traefik**    | 8626     | Reverse proxy, MCP routing |
| **OpenMemory** | internal | Memory API (via Traefik)   |
| **Dashboard**  | 3000     | Monitoring UI              |
| **Prometheus** | 9092     | Metrics collection         |
| **Ollama**     | 11434    | Local embeddings           |

## Configuration

Configuration is stored in `~/.cybermem/.env`:

```bash
# Embedding provider (ollama for local)
EMBEDDING_PROVIDER=ollama
OLLAMA_URL=http://ollama:11434

# Optional: Use OpenAI instead of Ollama
# OPENAI_API_KEY=sk-...
# EMBEDDING_PROVIDER=openai
```

## Commands

```bash
# Start services
cybermem-cli up

# Stop services
cybermem-cli down

# View logs
cybermem-cli logs

# Reset database
cybermem-cli reset
```

## Troubleshooting

### Ollama Not Starting

```bash
# Check if Ollama is running
docker logs cybermem-ollama

# Pull embedding model manually
docker exec cybermem-ollama ollama pull nomic-embed-text
```

### Port Conflicts

If ports are in use, modify `~/.cybermem/docker-compose.yml`:

```yaml
services:
  traefik:
    ports:
      - "8627:80"  # Change from 8626
```

### SQLite Permissions

```bash
# Fix permissions if container crashes
docker run --rm -v cybermem-openmemory-data:/data alpine \
  sh -c 'chown -R 1001:1001 /data && chmod 777 /data'
```

## Next Steps

- [MCP Integration](./mcp.md) - Connect AI clients
- [Raspberry Pi](./rpi.md) - Deploy to edge
