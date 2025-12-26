
<script setup>
import McpInstructions from './.vitepress/components/McpInstructions.vue'
</script>

# MCP Integration Guide

The Model Context Protocol (MCP) allows AI coding assistants to connect directly to CyberMem. These instructions are synchronized with your dashboard.

<div class="client-header">
  <img src="/icons/claude.png" class="client-icon" />
  <h2 id="claude">Claude Desktop</h2>
</div>
<McpInstructions clientId="claude" />

<div class="client-header">
  <img src="/icons/cursor.png" class="client-icon" />
  <h2 id="cursor">Cursor</h2>
</div>
<McpInstructions clientId="cursor" />

<div class="client-header">
  <img src="/icons/vscode.png" class="client-icon" />
  <h2 id="vscode">VS Code</h2>
</div>
<McpInstructions clientId="vscode" />

<div class="client-header">
  <img src="/icons/windsurf.png" class="client-icon" />
  <h2 id="windsurf">Windsurf</h2>
</div>
<McpInstructions clientId="windsurf" />

<div class="client-header">
  <img src="/icons/warp.png" class="client-icon" />
  <h2 id="warp">Warp</h2>
</div>
<McpInstructions clientId="warp" />

<div class="client-header">
  <img src="/icons/claude-code.png" class="client-icon" />
  <h2 id="claude-code">Claude Code</h2>
</div>
<McpInstructions clientId="claude-code" />

<div class="client-header">
  <img src="/icons/chatgpt.png" class="client-icon" />
  <h2 id="chatgpt">ChatGPT</h2>
</div>
<McpInstructions clientId="chatgpt" />

<div class="client-header">
  <img src="/icons/codex.png" class="client-icon" />
  <h2 id="codex">Codex</h2>
</div>
<McpInstructions clientId="codex" />

<div class="client-header">
  <div class="client-icon-placeholder">?</div>
  <h2 id="other">Other Clients</h2>
</div>
<McpInstructions clientId="other" />

<style>
.client-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-top: 3rem;
  margin-bottom: 1rem;
}

.client-icon {
  width: 40px;
  height: 40px;
  object-fit: contain;
  border-radius: 8px;
}

/* Light Mode: Add background to icons if they are transparent/white */
:root:not(.dark) .client-icon {
  background-color: rgba(0,0,0,0.05);
  padding: 4px;
}

.client-icon-placeholder {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 9999px;
  font-weight: bold;
  font-size: 1.25rem;
  color: white;
}

h2 {
  margin: 0 !important;
  padding: 0 !important;
  border: none !important;
}
</style>
