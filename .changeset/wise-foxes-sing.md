---
"@cybermem/mcp": patch
"@cybermem/dashboard": patch
---

fix(mcp): remove redundant transport.start() call causing SSE crash loop; switch to SSEServerTransport for multi-client support
fix(dashboard): update mcp-config API to support SSE and --allow-http
