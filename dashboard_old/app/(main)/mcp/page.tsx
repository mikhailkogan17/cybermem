"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { Check, Copy, Info, Key, Terminal, RefreshCw } from "lucide-react"
import { useEffect, useState } from "react"

export default function AddClientPage() {
  const [selectedClient, setSelectedClient] = useState("claude")
  const [copied, setCopied] = useState(false)
  const [apiKey, setApiKey] = useState("Loading...")
  const [loading, setLoading] = useState(true)
  const [regenerating, setRegenerating] = useState(false)

  useEffect(() => {
    fetch("/api/config")
      .then(res => res.json())
      .then(data => {
        if (data.apiKey) setApiKey(data.apiKey)
        setLoading(false)
      })
      .catch(err => {
        console.error("Failed to load config:", err)
        setLoading(false)
      })
  }, [])

  const handleRegenerate = async () => {
    setRegenerating(true)
    // Generate a random key for demo purposes
    const newKey = "cm_sk_live_" + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
    
    try {
      await fetch("/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: newKey })
      })
      setApiKey(newKey)
    } catch (err) {
      console.error("Failed to save new API key:", err)
    } finally {
      setRegenerating(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const mcpConfig = {
    "mcpServers": {
      "cybermem": {
        "command": "python3",
        "args": [
          "-m",
          "mcp_server_cybermem",
          "--api-key=" + apiKey
        ]
      }
    }
  }

  const handleCopy = () => {
    copyToClipboard(JSON.stringify(mcpConfig, null, 2))
  }

  const renderInstructions = () => {
    switch (selectedClient) {
      case "claude":
        return (
          <div className="space-y-4 text-white/80">

            <ol className="list-decimal list-inside space-y-2 ml-2">
              <li>Open your Claude Desktop configuration file:
                <div className="relative group mt-2">
                  <div className="p-4 bg-black/30 rounded-xl border border-white/10 font-mono text-sm text-emerald-400 select-all pr-12">
                    ~/Library/Application Support/Claude/claude_desktop_config.json
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="absolute top-2 right-2 text-white/60 hover:text-white hover:bg-white/10"
                    onClick={() => copyToClipboard("~/Library/Application Support/Claude/claude_desktop_config.json")}
                  >
                    {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </li>
              <li>Add the configuration below to the <code className="text-emerald-400">mcpServers</code> object.</li>
              <li>Restart Claude Desktop.</li>
            </ol>
          </div>
        )
      case "claude-code":
        return (
          <div className="space-y-4 text-white/80">
            <p className="ml-2">Run the following command in your terminal:</p>
            <div className="relative group">
              <div className="p-6 bg-black/30 rounded-xl border border-white/10 font-mono text-sm md:text-base text-slate-300 pr-12">
                <span className="select-none text-white/70 mr-3 font-bold">&gt;</span>
                claude mcp add cybermem --command python3 --args "-m mcp_server_cybermem --api-key={apiKey}"
              </div>
              <Button
                size="icon"
                variant="ghost"
                className="absolute top-4 right-4 text-white/60 hover:text-white hover:bg-white/10"
                onClick={() => copyToClipboard(`claude mcp add cybermem --command python3 --args "-m mcp_server_cybermem --api-key=${apiKey}"`)}
              >
                {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        )
      case "chatgpt":
        return (
          <div className="space-y-4 text-white/80">

            <ol className="list-decimal list-inside space-y-2 ml-2">
              <li>Open ChatGPT Settings.</li>
              <li>Navigate to <span className="text-emerald-400 font-medium">Connected Apps</span> (or Developer Settings).</li>
              <li>Add a new MCP server.</li>
              <li>Use the configuration below.</li>
            </ol>
          </div>
        )
      case "cursor":
        return (
          <div className="space-y-4 text-white/80">

            <ol className="list-decimal list-inside space-y-2 ml-2">
              <li>Open Cursor Settings.</li>
              <li>Navigate to <span className="text-emerald-400 font-medium">Features &gt; MCP Servers</span>.</li>
              <li>Click "Add New MCP Server".</li>
              <li>Select "Docker" as the type (if available) or "Stdio".</li>
              <li>Use the configuration values below.</li>
            </ol>
          </div>
        )
      case "vscode":
        return (
          <div className="space-y-4 text-white/80">

            <ol className="list-decimal list-inside space-y-2 ml-2">
              <li>Install the MCP extension in VS Code.</li>
              <li>Open your User Settings (JSON).</li>
              <li>Add the configuration below to the <code className="text-emerald-400">mcpServers</code> object.</li>
              <li>Restart VS Code.</li>
            </ol>
          </div>
        )
      case "antigravity":
        return (
            <div className="space-y-4 text-white/80">

              <ol className="list-decimal list-inside space-y-2 ml-2">
                <li>Open Antigravity Settings.</li>
                <li>Navigate to <span className="text-emerald-400 font-medium">Integrations &gt; MCP</span>.</li>
                <li>Add the configuration below.</li>
              </ol>
            </div>
          )
      case "windsurf":
        return (
            <div className="space-y-4 text-white/80">

              <ol className="list-decimal list-inside space-y-2 ml-2">
                <li>Open Windsurf Settings.</li>
                <li>Navigate to <span className="text-emerald-400 font-medium">MCP Servers</span>.</li>
                <li>Add the configuration below.</li>
              </ol>
            </div>
          )
      case "codex":
        return (
          <div className="space-y-4 text-white/80">

            <ol className="list-decimal list-inside space-y-2 ml-2">
              <li>Open your Codex configuration file.</li>
              <li>Add the configuration block below.</li>
              <li>Restart Codex.</li>
            </ol>
          </div>
        )
      case "warp":
        return (
          <div className="space-y-4 text-white/80">

            <ol className="list-decimal list-inside space-y-2 ml-2">
              <li>Open Warp Settings.</li>
              <li>Navigate to <span className="text-emerald-400 font-medium">Features &gt; MCP</span>.</li>
              <li>Add the configuration below.</li>
            </ol>
          </div>
        )
      case "perplexity":
        return (
            <div className="space-y-4 text-white/80">
              <ol className="list-decimal list-inside space-y-2 ml-2">
                <li>Open Perplexity Settings.</li>
                <li>Navigate to <span className="text-emerald-400 font-medium">Data Sources</span>.</li>
                <li>Add CyberMem as a custom source using the configuration below.</li>
              </ol>
            </div>
          )
      case "other":
        return (
          <div className="space-y-4 text-white/80">
            <p>Use the following configuration for any other MCP-compatible client.</p>
          </div>
        )
      default:
        return <p>Select a client to view integration instructions.</p>
    }
  }

  // Improved syntax highlighting for JSON with high contrast colors
  const highlightJSON = (json: any) => {
    const jsonString = JSON.stringify(json, null, 2)
    return jsonString.replace(
      /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
      (match) => {
        let cls = "text-[#F97316]" // number (Orange)
        if (/^"/.test(match)) {
          if (/:$/.test(match)) {
            cls = "text-[#38BDF8]" // key (Sky Blue)
          } else {
            cls = "text-[#34D399]" // string (Emerald)
          }
        } else if (/true|false/.test(match)) {
          cls = "text-[#60A5FA]" // boolean (Blue)
        } else if (/null/.test(match)) {
          cls = "text-[#94A3B8]" // null (Slate)
        }
        return `<span class="${cls}">${match}</span>`
      }
    )
  }

  const clients = [
    { id: "claude", name: "Claude Desktop", icon: "/icons/claude.png" },
    { id: "claude-code", name: "Claude Code", icon: "/icons/claude-code.png" },
    { id: "chatgpt", name: "ChatGPT (Developer Mode)", icon: "/icons/chatgpt.png" },
    { id: "cursor", name: "Cursor", icon: "/icons/cursor.png" },
    { id: "vscode", name: "VS Code", icon: "/icons/vscode.png" },
    { id: "windsurf", name: "Windsurf", icon: "/icons/windsurf.png" },
    { id: "warp", name: "Warp", icon: "/icons/warp.png" },
    { id: "codex", name: "Codex", icon: "/icons/codex.png" },
    { id: "antigravity", name: "Antigravity", icon: "/icons/antigravity.png" },
    { id: "perplexity", name: "Perplexity", icon: "/icons/perplexity.png" },
    { id: "other", name: "Other", icon: null }, // No icon for Other
  ]

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">MCP</h1>
        <p className="text-slate-400">Connect a new AI client to CyberMem.</p>
      </div>

      {/* Client Selection Grid */}
      <Card className="bg-white/5 border-white/10 backdrop-blur-xl">
        <CardHeader>
          <CardTitle className="text-white">Select Client</CardTitle>
          <CardDescription className="text-slate-400">
            Choose the AI client you want to integrate.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {clients.map((client) => (
              <button
                key={client.id}
                onClick={() => setSelectedClient(client.id)}
                className={`
                  relative group flex flex-col items-center justify-center p-4 rounded-xl transition-all duration-300
                  ${selectedClient === client.id 
                    ? "bg-emerald-500/10 shadow-[0_0_20px_rgba(16,185,129,0.1)]" 
                    : "hover:bg-white/5"
                  }
                `}
              >
                <div className="mb-4 transition-transform duration-300 group-hover:scale-110">
                  {client.icon ? (
                    <img 
                      src={client.icon} 
                      alt={client.name} 
                      className="w-20 h-20 object-contain drop-shadow-lg"
                    />
                  ) : (
                    <div className="w-20 h-20 flex items-center justify-center text-white/50 bg-white/5 rounded-full">
                      <span className="text-3xl">?</span>
                    </div>
                  )}
                </div>
                <span className={`text-sm font-medium transition-colors ${selectedClient === client.id ? "text-emerald-400" : "text-slate-400 group-hover:text-white"}`}>
                  {client.name}
                </span>
                
                {selectedClient === client.id && (
                  <div className="absolute inset-0 border-2 border-emerald-500/50 rounded-xl pointer-events-none" />
                )}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Instructions Card */}
      <Card className="bg-white/5 border-white/10 backdrop-blur-xl">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Terminal className="h-5 w-5 text-emerald-400" />
            {selectedClient === "other" ? "Configuration JSON" : "Integration Instructions"}
          </CardTitle>
          {selectedClient !== "other" && (
            <CardDescription className="text-slate-400">
              Add this configuration to your {clients.find(c => c.id === selectedClient)?.name} settings.
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className="space-y-6">
          {selectedClient === "chatgpt" && (
            <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-sm text-emerald-200 mb-4">
              <p>Requires Developer Mode. <a href="https://platform.openai.com/docs/guides/developer-mode" target="_blank" rel="noopener noreferrer" className="underline hover:text-white">Read OpenAI Documentation</a></p>
            </div>
          )}
          
          {renderInstructions()}

          <div className="relative mt-6">
            {selectedClient !== "claude-code" && (
              <div className="absolute -top-3 left-6 px-3 bg-white/10 backdrop-blur text-sm font-medium text-white border border-white/10 rounded-full z-10">
                {selectedClient === "codex" ? "TOML" : "JSON"}
              </div>
            )}
            <div className={`relative group ${selectedClient === "claude-code" ? "hidden" : ""}`}>
              <div className="relative p-8 rounded-lg bg-black/60 border border-white/10 font-mono text-base text-slate-300 overflow-x-auto">
                <pre>
                  {selectedClient === "codex" ? (
                    `# CyberMem Configuration
[mcp]
server_url = "http://localhost:8000/sse"
api_key = "${apiKey}"`
                  ) : selectedClient === "claude-code" ? (
                    ""
                  ) : (
                    <code dangerouslySetInnerHTML={{ __html: highlightJSON(mcpConfig) }} />
                  )}
                </pre>
              </div>
              <div className="absolute top-6 right-6 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                 <Button
                  size="icon"
                  variant="ghost"
                  className="text-white/60 hover:text-white hover:bg-white/10"
                  onClick={() => copyToClipboard(selectedClient === "codex" ? `# CyberMem Configuration\n[mcp]\nserver_url = "http://localhost:8000/sse"\napi_key = "${apiKey}"` : JSON.stringify(mcpConfig, null, 2))}
                >
                  {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </div>

          <div className="flex items-start gap-3 p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-200 text-sm">
            <Info className="h-5 w-5 shrink-0 text-emerald-400" />
            <p>
              This configuration includes your API key. Keep it secure and do not share it publicly.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
