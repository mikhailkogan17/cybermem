# @cybermem/mcp-server

Official TypeScript MCP Server for CyberMem.

## ⚠️ IMPORTANT: Port Configuration

> [!IMPORTANT]
> **Port 8626** is the canonical MCP endpoint.
> - Local mode: `http://localhost:8626/memory`
> - Remote mode: `http://<your-server>:8626/memory`

## Configuration

### Option A: Local (Standard)
If you are running CyberMem locally on your machine, use `npx` to spawn the MCP server. It will bridge the connection to your local Docker instance.

> [!IMPORTANT]
> **NO API KEY required for local development.**
> When `CYBERMEM_URL` is NOT set, the server runs in local mode with keyless auth.

**Claude Desktop Config (`~/Library/Application Support/Claude/claude_desktop_config.json`):**
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

### Option B: Remote (RPi / Cloud)
If you have deployed CyberMem to a Raspberry Pi or Cloud VPS, **do not use npx**. Instead, connect directly to the remote SSE endpoint.

**Claude Desktop Config:**
```json
{
  "mcpServers": {
    "cybermem-remote": {
      "url": "http://<your-rpi-ip>:8626/mcp",
      "transport": "sse",
      "headers": {
        "x-api-key": "your-api-key"
      },
      "env": {
        "CYBERMEM_URL": "http://<your-rpi-ip>:8626"
      }
    }
  }
}
```

## Environment Variables
| Variable           | Default | Description                                               |
| ------------------ | ------- | --------------------------------------------------------- |
| `CYBERMEM_URL`     | (unset) | **Do NOT set for local.** Set only for remote deployment. |
| `CYBERMEM_API_KEY` | (empty) | API key for remote auth. Not needed locally.              |

## Client Identification
The MCP server identifies itself to CyberMem with `X-Client-Name: cybermem-mcp`. This appears in the dashboard's Last/Top Reader/Writer metrics.
