# Refresh MCP Configs

// turbo-all

> [!IMPORTANT]
> Run after regenerating API token or changing deployment URLs.

---

## Step 1: Get Current Token from RPi

```bash
# View token from Settings in browser
open http://raspberrypi.local:3000
# OR via sqlite (masked, don't use):
ssh pi@raspberrypi.local 'sqlite3 ~/.cybermem/data/openmemory.sqlite "SELECT id FROM access_keys LIMIT 1"'
```

---

## Step 2: Update Antigravity Config

```bash
cat > ~/.gemini/antigravity/mcp_config.json << 'EOF'
{
  "mcpServers": {
    "cybermem": {
      "command": "node",
      "args": [
        "/Users/mikhailkogan/cybermem/packages/mcp/dist/index.js",
        "--url", "https://raspberrypi.tail7242ed.ts.net/cybermem",
        "--token", "YOUR_TOKEN_HERE"
      ]
    }
  }
}
EOF
```

---

## Step 3: Update Claude Desktop

```bash
cat > ~/Library/Application\ Support/Claude/claude_desktop_config.json << 'EOF'
{
  "mcpServers": {
    "cybermem": {
      "command": "node",
      "args": [
        "/Users/mikhailkogan/cybermem/packages/mcp/dist/index.js",
        "--url", "https://raspberrypi.tail7242ed.ts.net/cybermem",
        "--token", "YOUR_TOKEN_HERE"
      ]
    }
  }
}
EOF
```

---

## Step 4: Restart Clients

- **Antigravity**: Restart IDE
- **Claude Desktop**: Cmd+Q, reopen
- **Perplexity**: Update in settings

---

## Perplexity JSON (Copy)

```json
{
  "mcpServers": {
    "cybermem": {
      "command": "npx",
      "args": [
        "-y",
        "@cybermem/mcp@latest",
        "--url",
        "https://raspberrypi.tail7242ed.ts.net/cybermem",
        "--token",
        "YOUR_TOKEN_HERE"
      ]
    }
  }
}
```

---

## Verify

```bash
# Test query (after client restart)
# In agent: query_memory("test")
```
