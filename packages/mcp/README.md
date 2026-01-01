# @cybermem/mcp

Official TypeScript MCP Server for CyberMem.

## Configuration

### Option A: Local (Standard)
If you are running CyberMem locally on your machine, use `npx` to spawn the MCP server. It will bridge the connection to your local Docker instance.

**Claude Desktop Config (`~/Library/Application Support/Claude/claude_desktop_config.json`):**
```json
{
  "mcpServers": {
    "cybermem": {
      "command": "npx",
      "args": [
        "-y",
        "@cybermem/mcp"
      ],
      "env": {
        "CYBERMEM_URL": "http://localhost:8080/memory",
        "CYBERMEM_API_KEY": "your-api-key"
      }
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
      "url": "http://<your-rpi-ip>:8080/mcp",
      "transport": "sse",
      "headers": {
        "x-api-key": "your-api-key"
      }
    }
  }
}
```

## Environment Variables
- `CYBERMEM_URL`: URL to the OpenMemory API (default: `http://localhost:8080/memory`)
- `CYBERMEM_API_KEY`: Your API Key (found in `~/.cybermem/.env`)
