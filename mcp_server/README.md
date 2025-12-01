# OpenMemory MCP Server

MCP (Model Context Protocol) server that exposes OpenMemory functionality to Claude Code and other MCP clients.

## Features

Provides three tools for managing persistent memory:

1. **add_memory** - Store information in long-term memory
   - Input: `content` (string), `metadata` (object, optional)
   - Output: Memory ID, chunks count, sectors

2. **search_memory** - Search through stored memories
   - Input: `query` (string), `limit` (number, default: 5)
   - Output: Relevant memories with relevance scores

3. **list_memories** - List recent memories
   - Input: `limit` (number, default: 10)
   - Output: List of recent memories

## Setup

### 1. Install Dependencies

```bash
cd mcp_server
uv venv --python 3.11
uv pip install mcp httpx
```

### 2. Configure MCP in Claude Code

The `.mcp.json` file is already configured in the project root:

```json
{
  "mcpServers": {
    "openmemory": {
      "command": "/Users/mikhailkogan/cybermem/mcp_server/.venv/bin/python",
      "args": [
        "/Users/mikhailkogan/cybermem/mcp_server/openmemory_mcp.py"
      ],
      "env": {
        "OPENMEMORY_URL": "http://localhost/memory",
        "OPENMEMORY_API_KEY": "dev-secret-key"
      }
    }
  }
}
```

### 3. Restart Claude Code

After configuration, restart Claude Code to load the MCP server.

## Usage in Claude Code

Once configured, Claude Code will have access to memory management tools:

```
User: Remember that our API key for production is xyz-123-prod

Claude: [Uses add_memory tool]
✅ Stored in memory!
```

```
User: What's our production API key?

Claude: [Uses search_memory tool]
Found: "API key for production is xyz-123-prod"
```

## Testing

Run the test script to verify MCP server functionality:

```bash
python test_mcp.py
```

## Architecture

```
Claude Code <--MCP--> OpenMemory MCP Server <--HTTP--> OpenMemory API
                             ↓
                    Traefik → OpenMemory Container
```

## Environment Variables

- `OPENMEMORY_URL` - OpenMemory API endpoint (default: http://localhost/memory)
- `OPENMEMORY_API_KEY` - API key for authentication (default: dev-secret-key)

## Monitoring

All requests to OpenMemory are logged through Traefik and visible in Grafana dashboard:
- http://localhost:3000/d/cybermem-memory

You can see:
- Which clients (MCP server) accessed memories
- Search queries performed
- Response times
- Success/failure rates
