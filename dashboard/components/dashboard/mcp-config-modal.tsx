"use client"

import { Button } from "@/components/ui/button"
import { Check, Copy, FileCode, Info, Monitor, Terminal, X } from "lucide-react"
import { useEffect, useState } from "react"

const clients = [
  { id: "claude", name: "Claude Desktop", icon: "/icons/claude.png" },
  { id: "cursor", name: "Cursor", icon: "/icons/cursor.png" },
  { id: "vscode", name: "VS Code", icon: "/icons/vscode.png" },
  { id: "windsurf", name: "Windsurf", icon: "/icons/windsurf.png" },
  { id: "warp", name: "Warp", icon: "/icons/warp.png" },
  { id: "claude-code", name: "Claude Code", icon: "/icons/claude-code.png" },
  { id: "chatgpt", name: "ChatGPT", icon: "/icons/chatgpt.png" },
  { id: "codex", name: "Codex", icon: "/icons/codex.png" },
  { id: "other", name: "Other", icon: null },
]

export default function MCPConfigModal({ onClose }: { onClose: () => void }) {
  const [selectedClient, setSelectedClient] = useState("claude")
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [apiKey] = useState("sk-cybermem-master-key-8f7a2b9c")

  const [baseUrl, setBaseUrl] = useState("http://localhost:8080")
  const [hostname, setHostname] = useState("localhost")

  useEffect(() => {
    if (typeof window !== "undefined") {
      const host = window.location.hostname
      setHostname(host)
      setBaseUrl(`http://${host}:8080`)
    }
  }, [])

  const mcpConfig = {
    mcpServers: {
      cybermem: {
        url: `${baseUrl}/mcp`,
        type: "sse"
      }
    }
  }

  const getConfigContent = () => {
    if (selectedClient === "codex") {
      return `# CyberMem Configuration\n[mcp]\nserver_url = "${baseUrl}/mcp"\napi_key = "${apiKey}"`
    }
    return JSON.stringify(mcpConfig, null, 2)
  }

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const highlightJSON = (obj: any) => {
    const json = JSON.stringify(obj, null, 2)
    return json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, (match) => {
      let cls = "text-orange-300"
      if (/^"/.test(match)) {
        if (/:$/.test(match)) {
          cls = "text-emerald-300"
        } else {
          cls = "text-yellow-200"
        }
      } else if (/true|false/.test(match)) {
        cls = "text-blue-300"
      } else if (/null/.test(match)) {
        cls = "text-gray-400"
      }
      return `<span class="${cls}">${match}</span>`
    })
  }

  const renderInstructions = () => {
    switch (selectedClient) {
      case "claude":
        return (
          <div className="space-y-4 text-sm text-neutral-300">
            <p>To use CyberMem with Claude Desktop, you need to edit your configuration file.</p>
            <ol className="list-decimal list-inside space-y-2 ml-2 text-neutral-400">
              <li>Open Claude Desktop</li>
              <li>Go to <span className="text-white font-medium">Settings &gt; Developer &gt; Edit Config</span></li>
              <li>Add the configuration block below to your <code className="text-emerald-400 bg-emerald-500/10 px-1 py-0.5 rounded">claude_desktop_config.json</code></li>
              <li>Restart Claude Desktop to apply changes</li>
            </ol>
          </div>
        )
      case "cursor":
        return (
          <div className="space-y-4 text-sm text-neutral-300">
             <p>Cursor fully supports MCP. Configure it in the settings.</p>
             <ol className="list-decimal list-inside space-y-2 ml-2 text-neutral-400">
               <li>Open Cursor Settings (Cmd+,)</li>
               <li>Navigate to <span className="text-white font-medium">Features &gt; MCP</span></li>
               <li>Click "Add New Server"</li>
               <li>Select "SSE" type and enter the URL below</li>
             </ol>
          </div>
        )
      case "vscode":
        return (
          <div className="space-y-4 text-sm text-neutral-300">
             <p>Use the MCP Extension for VS Code.</p>
             <ol className="list-decimal list-inside space-y-2 ml-2 text-neutral-400">
               <li>Install the "MCP" extension</li>
               <li>Open Command Palette (Cmd+Shift+P)</li>
               <li>Run <span className="text-white font-medium">MCP: Manage Servers</span></li>
               <li>Add the configuration JSON below</li>
             </ol>
          </div>
        )
      case "claude-code":
        return (
          <div className="space-y-4 text-sm text-neutral-300">
             <p>Add the server directly via the command line.</p>
             <div className="relative group">
                <div className="relative pl-5 py-5 pr-24 rounded-lg bg-[#0F161C] border border-white/10 font-mono text-xs md:text-sm text-white overflow-x-auto shadow-[0_0_20px_rgba(0,0,0,0.3)] inset-shadow">
                  <div className="flex items-center gap-3">
                    <Terminal className="w-4 h-4 text-white stroke-[2.5] shrink-0" />
                    <code className="text-white text-shadow-sm">claude mcp add cybermem {baseUrl}/mcp</code>
                  </div>
                </div>
                <div className="absolute top-1/2 -translate-y-1/2 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 px-3 text-white bg-black/40 backdrop-blur border border-white/5 shadow-[0_0_10px_rgba(255,255,255,0.05)] hover:bg-white/10 hover:text-white font-medium"
                    onClick={() => copyToClipboard(`claude mcp add cybermem ${baseUrl}/mcp`, "cmd")}
                  >
                    {copiedId === "cmd" ? <Check className="h-4 w-4 stroke-[2.5] text-emerald-400 mr-2 drop-shadow-[0_0_5px_rgba(52,211,153,0.5)]" /> : <Copy className="h-4 w-4 stroke-[2.5] mr-2 text-white drop-shadow-[0_0_5px_rgba(255,255,255,0.3)]" />}
                    {copiedId === "cmd" ? <span className="text-emerald-400 text-shadow-sm">Copied</span> : <span className="text-white text-shadow-sm">Copy</span>}
                  </Button>
                </div>
             </div>
          </div>
        )
      case "codex":
        return (
          <div className="space-y-4 text-sm text-neutral-300">
            <p>Use this TOML configuration for Codex.</p>
            <ul className="list-disc list-inside space-y-2 ml-2 text-neutral-400">
              <li>Endpoint Type: <span className="text-white font-medium">SSE</span></li>
              <li>URL: <code className="text-emerald-400">{baseUrl}/mcp</code></li>
              <li>Copy the TOML block below</li>
            </ul>
          </div>
        )
      default:
        return (
          <div className="space-y-4 text-sm text-neutral-300">
            <p>For generic MCP clients, use the SSE endpoint details below.</p>
            <ul className="list-disc list-inside space-y-2 ml-2 text-neutral-400">
              <li>Endpoint Type: <span className="text-white font-medium">SSE (Server-Sent Events)</span></li>
              <li>URL: <code className="text-emerald-400">{baseUrl}/mcp</code></li>
              <li>Auth: <span className="text-white font-medium">X-API-Key</span> header</li>
            </ul>
          </div>
        )
    }
  }

  const configContent = getConfigContent()

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-4xl bg-[#0B1116]/80 backdrop-blur-xl border border-emerald-500/20 rounded-2xl shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[85vh] relative overflow-hidden"
        style={{
          backgroundImage: `
            radial-gradient(circle at 0% 0%, oklch(0.7 0 0 / 0.05) 0%, transparent 50%),
            radial-gradient(circle at 100% 0%, oklch(0.6 0 0 / 0.05) 0%, transparent 50%),
            radial-gradient(circle at 100% 100%, oklch(0.65 0 0 / 0.05) 0%, transparent 50%),
            radial-gradient(circle at 0% 100%, oklch(0.6 0 0 / 0.05) 0%, transparent 50%)
          `
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-2 flex-none">
          <div className="flex items-center gap-3">
              <div className="p-2 bg-white/5 rounded-lg border border-white/10 shadow-inner">
                <img src="/icons/mcp.png" alt="MCP Logo" className="w-5 h-5 drop-shadow-[0_0_5px_rgba(255,255,255,0.3)]" />
              </div>
              <h2 className="text-xl font-semibold text-white text-shadow-sm">Configure MCP Server</h2>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-neutral-400 hover:text-white hover:bg-white/10 rounded-full"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1 min-h-0">

          {/* Client Selector */}
          <section>
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2 text-shadow-sm">
                <Monitor className="w-5 h-5 text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]" />
                Select Client
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {clients.map((client) => (
                <button
                    key={client.id}
                    onClick={() => setSelectedClient(client.id)}
                    className={`
                      relative group flex flex-col items-center justify-center p-3 rounded-xl transition-all duration-300 border
                      ${selectedClient === client.id
                        ? "bg-emerald-500/10 border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.1)] backdrop-blur-sm"
                        : "bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/20 backdrop-blur-sm"
                      }
                    `}
                  >
                    <div className="mb-2 transition-transform duration-300 group-hover:scale-110">
                       {client.icon ? (
                         <img src={client.icon} alt={client.name} className="w-8 h-8 object-contain drop-shadow-lg" />
                       ) : (
                         <div className="w-8 h-8 flex items-center justify-center text-white/50 bg-white/5 rounded-full border border-white/10 transition-transform duration-300">
                           <span className="text-sm font-bold">?</span>
                         </div>
                       )}
                    </div>
                    <span className={`text-[10px] font-medium text-center transition-colors ${selectedClient === client.id ? "text-emerald-400 text-shadow-emerald" : "text-neutral-400 group-hover:text-white"}`}>
                      {client.name}
                    </span>
                </button>
              ))}
            </div>
          </section>

          {/* Instructions */}
          <section>
             <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2 text-shadow-sm">
                 <FileCode className="w-5 h-5 text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]" />
                 {selectedClient === "codex" ? "Configuration" : (selectedClient === "other" ? "Configuration JSON" : "Integration Instructions")}
             </h3>

             <div className="bg-white/5 border border-white/10 rounded-lg p-5 space-y-4 shadow-[inset_0_0_20px_rgba(255,255,255,0.02)] backdrop-blur-sm">
                {selectedClient === "chatgpt" && (
                    <div className="px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-200">
                    <p>Requires Developer Mode. <a href="https://platform.openai.com/docs/guides/developer-mode" target="_blank" rel="noopener noreferrer" className="underline hover:text-white">Read OpenAI Documentation</a></p>
                    </div>
                )}

                {renderInstructions()}

                {selectedClient !== "claude-code" && (
                  <div className="relative group">
                    <div className="relative pl-5 py-5 pr-24 rounded-lg bg-[#0F161C] border border-white/10 font-mono text-xs md:text-sm text-white overflow-x-auto shadow-[0_0_20px_rgba(0,0,0,0.3)] inset-shadow">
                      <pre className="text-shadow-sm">
                        {selectedClient === "codex" ? (
                          configContent
                        ) : (
                          <code dangerouslySetInnerHTML={{ __html: highlightJSON(mcpConfig) }} />
                        )}
                      </pre>
                    </div>
                    <div className="absolute top-5 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 px-3 text-white bg-black/40 backdrop-blur border border-white/5 shadow-[0_0_10px_rgba(255,255,255,0.05)] hover:bg-white/10 hover:text-white font-medium"
                        onClick={() => copyToClipboard(configContent, "config")}
                      >
                        {copiedId === "config" ? <Check className="h-4 w-4 stroke-[2.5] text-emerald-400 mr-2 drop-shadow-[0_0_5px_rgba(52,211,153,0.5)]" /> : <Copy className="h-4 w-4 stroke-[2.5] mr-2 text-white drop-shadow-[0_0_5px_rgba(255,255,255,0.3)]" />}
                        {copiedId === "config" ? <span className="text-emerald-400 text-shadow-sm">Copied</span> : <span className="text-white text-shadow-sm">Copy</span>}
                      </Button>
                    </div>
                  </div>
                )}

                <div className="flex items-start gap-3 p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/10 text-emerald-200/70 text-xs">
                  <Info className="h-4 w-4 shrink-0 text-white mt-0.5" />
                  <p>
                    This configuration includes your generated API key. Keep it secure and do not share it publicly.
                  </p>
                </div>
             </div>
          </section>
        </div>

        {/* Footer */}
        <div className="border-t border-emerald-500/20 px-6 py-4 flex justify-end gap-3 flex-none bg-[#0B1116]/30">
          <Button
            asChild
            variant="ghost"
            className="bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 hover:text-emerald-300 mr-auto"
          >
            <a href="/docs" target="_blank">Read Documentation</a>
          </Button>
          <Button
            onClick={onClose}
            className="bg-white/5 hover:bg-white/10 border border-white/10 text-neutral-300 transition-colors"
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  )
}
