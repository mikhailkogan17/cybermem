<script setup>
import { computed } from "vue";
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
  <div class="mcp-instructions space-y-8 mt-8">
    <div
      v-for="client in configs"
      :key="client.id"
      :id="client.id"
      class="client-block bg-white/5 border border-white/10 rounded-xl p-6"
    >
      <div class="flex items-center gap-4 mb-4">
        <img
          v-if="client.icon"
          :src="client.icon"
          :alt="client.name"
          class="w-10 h-10 object-contain"
        />
        <div
          v-else
          class="w-10 h-10 flex items-center justify-center bg-white/5 rounded-full border border-white/10 text-xl font-bold"
        >
          ?
        </div>
        <h3 class="text-xl font-bold text-white m-0">{{ client.name }}</h3>
      </div>

      <p class="text-neutral-400 mb-4">{{ client.description }}</p>

      <ol
        v-if="client.steps.length"
        class="list-decimal list-inside space-y-2 ml-2 text-neutral-300"
      >
        <li
          v-for="(step, i) in client.steps"
          :key="i"
          v-html="renderStep(step)"
        ></li>
      </ol>

      <div
        v-if="client.configType === 'json'"
        class="mt-4 pt-4 border-t border-white/10"
      >
        <div class="language-json extra-class">
          <pre
            class="shiki bg-[#0F161C] p-4 rounded-lg overflow-x-auto"
          ><code><span class="line"><span style="color:#A6ACCD">{</span></span>
<span class="line"><span style="color:#A6ACCD">  </span><span style="color:#89DDFF">"mcpServers"</span><span style="color:#A6ACCD">: {</span></span>
<span class="line"><span style="color:#A6ACCD">    </span><span style="color:#89DDFF">"cybermem"</span><span style="color:#A6ACCD">: {</span></span>
<span class="line"><span style="color:#A6ACCD">      </span><span style="color:#89DDFF">"url"</span><span style="color:#A6ACCD">: </span><span style="color:#C3E88D">"http://localhost:8080/mcp"</span><span style="color:#A6ACCD">,</span></span>
<span class="line"><span style="color:#A6ACCD">      </span><span style="color:#89DDFF">"type"</span><span style="color:#A6ACCD">: </span><span style="color:#C3E88D">"sse"</span></span>
<span class="line"><span style="color:#A6ACCD">    }</span></span>
<span class="line"><span style="color:#A6ACCD">  }</span></span>
<span class="line"><span style="color:#A6ACCD">}</span></span></code></pre>
        </div>
      </div>

      <div
        v-if="client.configType === 'command'"
        class="mt-4 pt-4 border-t border-white/10"
      >
        <div class="language-bash extra-class">
          <pre
            class="shiki bg-[#0F161C] p-4 rounded-lg overflow-x-auto"
          ><code><span class="line"><span style="color:#C3E88D">claude mcp add cybermem http://localhost:8080/mcp</span></span></code></pre>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.client-block:hover {
  border-color: rgba(16, 185, 129, 0.3);
  box-shadow: 0 0 20px rgba(16, 185, 129, 0.05);
}
</style>
