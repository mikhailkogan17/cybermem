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
| Custom         | SSE       | HTTP endpoint      |

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

For remote CyberMem (RPi, VPS):

### Stdio with URL (Recommended)

Universal configuration that works with all MCP clients:

```json
{
  "mcpServers": {
    "cybermem-remote": {
      "command": "npx",
      "args": [
        "-y", "@cybermem/mcp",
        "--url", "https://your-server.com:8626",
        "--api-key", "sk-your-api-key",
        "--client-name", "cursor"
      ]
    }
  }
}
```

### CLI Arguments

| Argument        | Description                                    |
| --------------- | ---------------------------------------------- |
| `--url`         | Remote CyberMem endpoint (required for remote) |
| `--api-key`     | API key for authentication                     |
| `--client-name` | Client identifier for dashboard tracking       |

## Available Tools

Once connected, your AI client can use:

### `add_memory`

Store a new memory:

```typescript
{
  content: string,    // Required: The memory content
  user_id?: string,   // Optional: User identifier
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

### `list_memories`

List recent memories:

```typescript
{
  limit?: number  // Optional: Max results (default: 10)
}
```

### `delete_memory`

Remove a memory by ID:

```typescript
{
  id: string  // Required: Memory ID
}
```

### `update_memory`

Update an existing memory:

```typescript
{
  id: string,           // Required: Memory ID
  content?: string,     // Optional: New content
  tags?: string[],      // Optional: New tags
  metadata?: object     // Optional: Additional metadata
}
```

## Client Identification

CyberMem tracks which client made each request via the `X-Client-Name` header.

### Automatic (stdio)

The MCP server automatically identifies the client from the process.

### Manual (SSE)

Include the header in your requests:

```bash
curl -H "X-Client-Name: my-custom-client" \
     -H "x-api-key: sk-..." \
     https://your-server.com:8626/mcp
```

## Debugging

### Test Connection

```bash
# Local
curl http://localhost:8626/health

# Remote
curl -H "x-api-key: sk-..." https://your-server.com:8626/health
```

### View Logs

```bash
# MCP server logs
docker logs cybermem-openmemory -f

# Dashboard shows client activity
open http://localhost:3000
```

### Common Issues

**401 Unauthorized**
- Check API key is correct
- For local: ensure no `CYBERMEM_URL` is set (enables keyless mode)

**Connection Refused**
- Verify services are running: `docker ps`
- Check firewall allows port 8626

**SSE Timeout**
- Increase client timeout settings
- Check network latency to server

## Next Steps

- [Local Setup](./local.md) - Development environment
- [Raspberry Pi](./rpi.md) - Edge deployment
- [Cloud/VPS](./vps.md) - Production deployment
