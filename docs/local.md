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
npx @cybermem/cli init
```

That's it! The CLI handles everything automatically.

## Architecture

```
┌────────────────────────────────────────────────────────┐
│                    localhost                           │
├────────────────────────────────────────────────────────┤
│  :3000 Dashboard    :8626 Traefik    :8000 Exporter    │
│         ↓              ↓                  ↓            │
│     Next.js        OpenMemory         SQLite Metrics   │
│         └──────────────┴──────────────────┘            │
│                        ↓                               │
│                   SQLite + Ollama                      │
└────────────────────────────────────────────────────────┘
```

## Services

| Service         | Port     | Description                 |
| --------------- | -------- | --------------------------- |
| **Traefik**     | 8626     | Reverse proxy, MCP routing  |
| **Core API**    | internal | Memory engine (via Traefik) |
| **Dashboard**   | 3000     | Monitoring UI               |
| **DB Exporter** | 8000     | SQLite metrics API          |
| **Ollama**      | 11434    | Local embeddings            |

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
npx @cybermem/cli init

# Stop services
cd ~/.cybermem && docker-compose down

# View logs
cd ~/.cybermem && docker-compose logs -f

# Reset database
rm -rf ~/.cybermem/data && npx @cybermem/cli init
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
      - "8627:80" # Change from 8626
```

### Database Permissions

```bash
# Fix permissions if container crashes
docker run --rm -v cybermem-core-data:/data alpine \
  sh -c 'chown -R 1001:1001 /data && chmod 777 /data'
```

## Next Steps

- [MCP Integration](./mcp.md) - Connect AI clients
- [Raspberry Pi](./rpi.md) - Deploy to edge
