# Quick Start

Get CyberMem running in under 5 minutes.

## Prerequisites

- **Node.js** 18+ (for CLI)
- **Docker** with Docker Compose
- ~2GB free disk space

## Installation

### One-Liner

```bash
npx @cybermem/cli deploy
```

This will:
1. Download and configure Docker containers
2. Start OpenMemory, Traefik, Prometheus, and Dashboard
3. Display access URLs

### Manual Steps

```bash
# Install CLI globally (optional)
npm install -g @cybermem/cli

# Initialize configuration
cybermem init

# Start services
cybermem up
```

## Access Points

After deployment, access your CyberMem instance:

| Service        | URL                       | Description                       |
| -------------- | ------------------------- | --------------------------------- |
| **Dashboard**  | http://localhost:3000     | Monitoring UI (password: `admin`) |
| **MCP API**    | http://localhost:8626/mcp | AI client endpoint                |
| **Prometheus** | http://localhost:9092     | Metrics scraping                  |

## Connect AI Clients

### Claude Desktop / Cursor

Add to your MCP configuration:

```json
{
  "mcpServers": {
    "cybermem": {
      "command": "npx",
      "args": ["-y", "@cybermem/mcp-server"]
    }
  }
}
```

### Verify Connection

After connecting, your AI client can use these tools:
- `add_memory` - Store new memories
- `query_memory` - Semantic search
- `list_memories` - Recent memories
- `delete_memory` - Remove memories

## Next Steps

- [Local Development](./local.md) - Full local setup guide
- [Raspberry Pi](./rpi.md) - Edge deployment
- [Cloud/VPS](./vps.md) - Production deployment
- [MCP Integration](./mcp.md) - Advanced client configuration
