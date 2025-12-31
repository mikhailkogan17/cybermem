# Connect your AI

CyberMem exposes a standard **Model Context Protocol (MCP)** endpoint that allows AI assistants like Claude Desktop and Cursor to store and retrieve long-term memories.

## Connection Basics

- **Server URL:** `http://raspberrypi.local:8080/mcp` (or `http://localhost:8080/mcp`)
- **Transport:** SSE (Server-Sent Events)
- **Authentication:** HTTP Headers (`x-api-key`)

## 🔑 Getting Your API Key

When you first install CyberMem, a secure API Key is automatically generated.
You can find it in:
1.  The installation output (console).
2.  The `.env` file on your server (`OM_API_KEY`).
3.  The **Dashboard Settings**.

---

## 🤖 Claude Desktop

1. Open **Claude Desktop**.
2. Go to **Settings** → **Developer** → **Edit Config**.
3. Add the following to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "cybermem": {
      "url": "http://raspberrypi.local:8080/mcp",
      "type": "sse",
      "headers": {
        "x-api-key": "sk-your-generated-key"
      }
    }
  }
}
```

*Note: If your version of Claude Desktop does not support headers in config, you may need to use an auth-proxy or wait for an update. Localhost connections (no auth) work out of the box.*

---

## 💻 Cursor

1. Open **Settings** (`Cmd + ,`) → **Features** → **MCP**.
2. Click **Add New MCP Server**.
3. Enter:
   - **Name:** CyberMem
   - **Type:** SSE
   - **URL:** `http://raspberrypi.local:8080/mcp`
4. Click **Save**.

*Note: Cursor currently has limited support for custom headers in the UI. If connection fails due to Auth, consider using the "Antigravity" JSON config method below if applicable, or run CyberMem locally without auth.*

---

## 🧠 Antigravity (Agent Config)

If you are configuring an Agent manually via JSON (e.g., `mcp_config.json`):

```json
{
  "mcpServers": {
    "cybermem": {
      "serverUrl": "http://raspberrypi.local:8080/mcp",
      "headers": {
        "x-api-key": "sk-your-generated-key"
      }
    }
  }
}
```
*Use `serverUrl` instead of `url` for this client.*

---

## Remote vs Local

- **Local (Docker):** Auth is optional but recommended. `http://localhost:8080/mcp`.
- **RPi / Cloud:** Auth is **Required**. Always use `x-api-key`.
