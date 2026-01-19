# Quick Start

Get CyberMem running in under 5 minutes.

## Prerequisites

- **Node.js** 18+ (for CLI)
- **Docker** with Docker Compose
- ~2GB free disk space

## Installation

### One-Liner (Local)

```bash
npx @cybermem/cli init
```

This will:

1. Download and configure Docker containers
2. Start Core API, Traefik, and Dashboard
3. **Open browser for GitHub login (first time)**
4. Display access URLs

> [!NOTE]
> First-time setup opens your browser for GitHub authentication.
> After login, your token is saved locally — no more API key management!

### Other Platforms

```bash
# Raspberry Pi (run ON the Pi via SSH)
ssh pi@raspberrypi.local
npx @cybermem/cli init --rpi

# With HTTPS remote access
npx @cybermem/cli init --rpi --remote-access

# VPS (SSH into your server first)
npx @cybermem/cli init --vps
```

## Access Points

After deployment, access your CyberMem instance:

| Service       | URL                       | Description                       |
| ------------- | ------------------------- | --------------------------------- |
| **Dashboard** | http://localhost:3000     | Monitoring UI (password: `admin`) |
| **MCP API**   | http://localhost:8626/mcp | AI client endpoint                |

## Connect AI Clients

### Claude Desktop / Cursor

Add to your MCP configuration:

```json
{
  "mcpServers": {
    "cybermem": {
      "command": "npx",
      "args": ["-y", "@cybermem/mcp"]
    }
  }
}
```

For remote access (e.g., RPi), add the `--url` parameter:

```json
{
  "mcpServers": {
    "cybermem": {
      "command": "npx",
      "args": [
        "-y",
        "@cybermem/mcp",
        "--url",
        "https://your-rpi.ts.net/cybermem/memory",
        "--token",
        "sk-your-token"
      ]
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
- [Security](./security.md) - Authentication and token management
