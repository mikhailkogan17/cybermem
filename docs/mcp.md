# Connect your AI

CyberMem exposes a standard **Model Context Protocol (MCP)** endpoint that allows AI assistants like Claude Desktop and Cursor to store and retrieve long-term memories.

## Connection Details

- **Server URL:** `http://localhost:8080/mcp` (or your RPi/VPS IP)
- **Type:** SSE (Server-Sent Events)

## 🤖 Claude Desktop

1. Open **Claude Desktop**.
2. Go to **Settings** → **Developer** → **Edit Config**.
3. Add the following to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "cybermem": {
      "url": "http://localhost:8080/mcp",
      "type": "sse"
    }
  }
}
```

4. Restart Claude Desktop. You should see a generic "Memory" tool icon.

## 💻 Cursor

1. Open **Cursor Settings** (`Cmd + ,`).
2. Navigate to **Features** → **MCP**.
3. Click **Add New MCP Server**.
4. Enter:
   - **Name:** CyberMem
   - **Type:** SSE
   - **URL:** `http://localhost:8080/mcp`
5. Click **Save**.

## 🔑 Authentication

CyberMem requires an API Key for access. 
However, for seamless local use, the MCP server can be configured to auto-authorize requests from localhost.

Check the **Settings** icon in the [Dashboard](/settings) to view or generate your `OM_API_KEY`.
