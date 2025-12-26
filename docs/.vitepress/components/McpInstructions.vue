<script setup>
import configs from "../../../dashboard/lib/mcp-config.json";

const renderStep = (step) => {
  return step
    .replace(
      /Settings > Developer > Edit Config/g,
      '<span class="font-medium text-emerald-400">Settings > Developer > Edit Config</span>'
    )
    .replace(
      /Features > MCP/g,
      '<span class="font-medium text-emerald-400">Features > MCP</span>'
    )
    .replace(
      /MCP: Manage Servers/g,
      '<span class="font-medium text-emerald-400">MCP: Manage Servers</span>'
    )
    .replace(
      /claude_desktop_config.json/g,
      '<code class="bg-emerald-500/10 px-1 py-0.5 rounded text-emerald-400">claude_desktop_config.json</code>'
    )
    .replace(/SSE/g, '<span class="font-medium text-white">SSE</span>')
    .replace(
      /X-API-Key/g,
      '<span class="font-medium text-white">X-API-Key</span>'
    );
};
</script>

<template>
  <div class="mcp-instructions">
    <div v-for="client in configs" :key="client.id" :id="client.id" class="client-block">
      <div class="client-header">
        <div class="icon-wrapper">
          <img v-if="client.icon" :src="client.icon" :alt="client.name" class="client-icon" />
          <div v-else class="client-icon-placeholder">?</div>
        </div>
        <h2 class="client-title">{{ client.name }}</h2>
      </div>

      <p class="client-description">{{ client.description }}</p>

      <ol v-if="client.steps.length" class="client-steps">
        <li v-for="(step, i) in client.steps" :key="i" v-html="renderStep(step)"></li>
      </ol>

      <div v-if="client.configType === 'json'" class="config-block">
         <div class="language-json extra-class"><pre class="shiki"><code><span class="line"><span style="color:#A6ACCD">{</span></span>
<span class="line"><span style="color:#A6ACCD">  </span><span style="color:#89DDFF">"mcpServers"</span><span style="color:#A6ACCD">: {</span></span>
<span class="line"><span style="color:#A6ACCD">    </span><span style="color:#89DDFF">"cybermem"</span><span style="color:#A6ACCD">: {</span></span>
<span class="line"><span style="color:#A6ACCD">      </span><span style="color:#89DDFF">"url"</span><span style="color:#A6ACCD">: </span><span style="color:#C3E88D">"http://localhost:8080/mcp"</span><span style="color:#A6ACCD">,</span></span>
<span class="line"><span style="color:#A6ACCD">      </span><span style="color:#89DDFF">"type"</span><span style="color:#A6ACCD">: </span><span style="color:#C3E88D">"sse"</span></span>
<span class="line"><span style="color:#A6ACCD">    }</span></span>
<span class="line"><span style="color:#A6ACCD">  }</span></span>
<span class="line"><span style="color:#A6ACCD">}</span></span></code></pre></div>
      </div>

      <div v-if="client.configType === 'command'" class="config-block">
         <div class="language-bash extra-class"><pre class="shiki"><code><span class="line"><span style="color:#C3E88D">claude mcp add cybermem http://localhost:8080/mcp</span></span></code></pre></div>
      </div>

    </div>
  </div>
</template>

<style scoped>
.mcp-instructions {
  margin-top: 2rem;
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.client-block {
  background-color: rgba(255, 255, 255, 0.05); /* bg-white/5 */
  border: 1px solid rgba(255, 255, 255, 0.1); /* border-white/10 */
  border-radius: 0.75rem; /* rounded-xl */
  padding: 1.5rem; /* p-6 */
  transition: all 0.3s ease;
}

.client-block:hover {
  border-color: rgba(16, 185, 129, 0.4);
  background-color: rgba(255, 255, 255, 0.08);
}

.client-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.icon-wrapper {
  flex-shrink: 0;
}

.client-icon {
  width: 2.5rem; /* w-10 = 40px */
  height: 2.5rem; /* h-10 = 40px */
  object-fit: contain;
}

.client-icon-placeholder {
  width: 2.5rem;
  height: 2.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 9999px;
  font-weight: bold;
  font-size: 1.25rem;
}

.client-title {
  margin: 0 !important;
  font-size: 1.5rem;
  font-weight: 700;
  color: white;
  border: none !important;
  padding: 0 !important;
}

.client-description {
  color: #a3a3a3; /* text-neutral-400 */
  margin-bottom: 1rem;
  font-size: 0.95rem;
}

.client-steps {
  list-style-type: decimal;
  list-style-position: inside;
  padding-left: 0.5rem;
  color: #d4d4d4; /* text-neutral-300 */
  margin: 0;
}

.client-steps li {
  margin-bottom: 0.5rem;
  line-height: 1.6;
}

/* Deep selector for injected HTML content */
.client-steps :deep(.font-medium) {
  font-weight: 500;
}

.client-steps :deep(.text-emerald-400) {
  color: #34d399;
}

.client-steps :deep(code),
.client-steps :deep(.bg-emerald-500\/10) {
  background-color: rgba(16, 185, 129, 0.1);
  padding: 0.125rem 0.375rem;
  border-radius: 0.25rem;
  color: #34d399;
  font-family: monospace;
  font-size: 0.9em;
}

.config-block {
  margin-top: 1rem;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  padding-top: 1rem;
}

.shiki {
  background-color: #0F161C !important;
  padding: 1rem;
  border-radius: 0.5rem;
  overflow-x: auto;
  margin: 0;
}
</style>
