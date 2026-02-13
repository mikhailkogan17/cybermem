# MCP Integration

Connect AI clients to CyberMem using the Model Context Protocol.

## Overview

CyberMem provides an MCP server that allows AI clients (Claude, Cursor, etc.) to store and retrieve long-term memories.

## Supported Clients

| Client         | Transport | Configuration      |
| -------------- | --------- | ------------------ |
| Claude Desktop | stdio     | MCP config file    |
| Cursor         | stdio     | MCP config file    |
| VS Code        | stdio     | Extension settings |
| Custom         | HTTP      | Streamable HTTP    |

## Local Configuration

For local CyberMem (localhost:8626):

### Claude Desktop / Cursor

Add to `~/.config/claude/mcp.json` or Cursor MCP settings:

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

### VS Code

Install the CyberMem extension or configure manually:

```json
{
  "mcp.servers": {
    "cybermem": {
      "command": "npx",
      "args": ["-y", "@cybermem/mcp"]
    }
  }
}
```

## Remote Configuration

For remote CyberMem (RPi, VPS), use **mcp-remote** — the standard stdio-to-HTTP bridge:

### Using mcp-remote (Recommended)

```json
{
  "mcpServers": {
    "cybermem-remote": {
      "command": "npx",
      "args": [
        "-y",
        "mcp-remote",
        "https://your-server.com:8626/mcp",
        "--header",
        "X-API-Key:${CYBERMEM_TOKEN}"
      ]
    }
  }
}
```

### Why mcp-remote?

- **Standard tool** — maintained by the MCP community (geelen/mcp-remote)
- **OAuth support** — built-in authentication flow
- **Transport bridging** — stdio↔HTTP/SSE↔Streamable HTTP
- **Zero CyberMem-specific code** — works with any MCP server

### mcp-remote Arguments

| Argument                      | Description                        |
| ----------------------------- | ---------------------------------- |
| `<url>`                       | Remote MCP endpoint URL            |
| `--header "Key:Value"`        | Add custom headers (e.g., API key) |
| `--transport sse\|streamable` | Force specific transport           |

## Available Tools

Once connected, your AI client can use:

### `add_memory`

Store a new memory:

```typescript
{
  content: string,    // Required: The memory content
  tags?: string[]     // Optional: Categorization tags
}
```

### `query_memory`

Semantic search for relevant memories:

```typescript
{
  query: string,  // Required: Search query
  k?: number      // Optional: Number of results (default: 5)
}
```

### `update_memory`

Update an existing memory (HIGH COST — re-embeds):

```typescript
{
  id: string,           // Required: Memory ID
  content?: string,     // Optional: New content
  tags?: string[]       // Optional: New tags
}
```

### `reinforce_memory`

Metabolic boost (LOW COST — prevents decay):

```typescript
{
  id: string,       // Required: Memory ID
  boost?: number    // Optional: Boost amount (default: 0.1)
}
```

### `delete_memory`

Remove a memory by ID:

```typescript
{
  id: string  // Required: Memory ID
}
```

## Client Identification

CyberMem tracks which client made each request via the `X-Client-Name` header.

### Automatic (stdio)

The MCP server automatically identifies the client from the handshake.

### Manual (HTTP)

Include the header in your requests:

```bash
curl -H "X-Client-Name: my-custom-client" \
     -H "X-API-Key: sk-..." \
     https://your-server.com:8626/mcp
```

## Debugging & Development Tools

### MCP Inspector

Interactive debugging tool for MCP server development:

> **Note**: Requires Node.js 22.7.5 or later. On Node 20, inspector is skipped during install.

```bash
# Start inspector with local dev server (requires Docker stack running)
cd packages/mcp
npm run inspect

# Or inspect the built server
npm run inspect:built
```

The inspector provides an interactive UI for testing tools, inspecting requests/responses, and verifying protocol compliance.

### Test Connection

```bash
# Local
curl http://localhost:8626/health

# Remote
curl -H "X-API-Key: sk-..." https://your-server.com:8626/health
```

### View Logs

```bash
# MCP server logs
docker logs cybermem-mcp -f

# Dashboard shows client activity
open http://localhost:3000
```

### Common Issues

**401 Unauthorized**

- Check security token is correct
- For local: ensure no `CYBERMEM_URL` is set (enables keyless mode)

**Connection Refused**

- Verify services are running: `docker ps`
- Check firewall allows port 8626

**SSE Timeout**

- Increase client timeout settings
- Check network latency to server

## Ecosystem & Recommended Tools

| Tool                                                                                   | Purpose                                     | Install                                  |
| -------------------------------------------------------------------------------------- | ------------------------------------------- | ---------------------------------------- |
| [`mcp-remote`](https://github.com/geelen/mcp-remote)                                   | Connect stdio clients to remote MCP servers | `npx -y mcp-remote <url>`                |
| [`@modelcontextprotocol/inspector`](https://github.com/modelcontextprotocol/inspector) | Interactive MCP protocol debugger           | `npx -y @modelcontextprotocol/inspector` |
| [`fastmcp`](https://github.com/punkpeye/fastmcp)                                       | Higher-level MCP server framework (TS)      | `npm i fastmcp`                          |
| [`mcp-proxy`](https://github.com/sparfenyuk/mcp-proxy)                                 | Bidirectional stdio↔HTTP proxy              | `npx -y mcp-proxy`                       |

## Next Steps

- [Local Setup](./local.md) - Development environment
- [Raspberry Pi](./rpi.md) - Edge deployment
- [Cloud/VPS](./vps.md) - Production deployment
