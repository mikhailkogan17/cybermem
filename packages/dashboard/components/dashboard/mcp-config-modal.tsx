"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useDashboard } from "@/lib/data/dashboard-context";
import {
    Check,
    Copy,
    Eye,
    EyeOff,
    FileCode,
    Info,
    Monitor,
    X,
} from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function MCPConfigModal({ onClose }: { onClose: () => void }) {
  const { clientConfigs } = useDashboard();
  const clients = clientConfigs;
  const [selectedClient, setSelectedClient] = useState("claude");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState("http://localhost:8080");
  const [isLoading, setIsLoading] = useState(true);
  const [isKeyVisible, setIsKeyVisible] = useState(false);
  const [showRegenConfirm, setShowRegenConfirm] = useState(false);
  const [regenInputValue, setRegenInputValue] = useState("");
  const [isManaged, setIsManaged] = useState(false); // local mode (localhost only)
  const [instanceType, setInstanceType] = useState<"local" | "rpi" | "vps">(
    "local",
  );

  useEffect(() => {
    // Try to get key from local storage first (simulating persistence)
    const localKey = localStorage.getItem("om_api_key");
    if (localKey) {
      setApiKey(localKey);
      // We still fetch settings for the endpoint
      fetch("/api/settings")
        .then((res) => res.json())
        .then((data) => {
          let srvEndpoint = data.endpoint;
          if (
            srvEndpoint.includes("localhost") &&
            typeof window !== "undefined" &&
            !window.location.hostname.includes("localhost")
          ) {
            const port = srvEndpoint.split(":").pop()?.split("/")[0] || "8626";
            srvEndpoint = `${window.location.protocol}//${window.location.hostname}:${port}`;
          }
          setBaseUrl(srvEndpoint);
          setIsLoading(false);
        })
        .catch((err) => setIsLoading(false));
    } else {
      fetch("/api/settings")
        .then((res) => res.json())
        .then((data) => {
          setApiKey(data.apiKey !== "not-set" ? data.apiKey : "");
          // True local mode only if the server is running on 'local' hardware
          // and we are accessing it via localhost (isLocal = true)
          setIsManaged(data.isManaged && data.instanceType === "local");
          setInstanceType(data.instanceType || "local");
          let srvEndpoint = data.endpoint;
          // Dynamically detect endpoint if accessed via local network or Tailscale
          if (typeof window !== "undefined") {
            const currentHost = window.location.hostname;
            const currentOrigin = window.location.origin;

            // If the server suggests a Docker internal name or localhost, override it with current origin
            if (srvEndpoint.includes("localhost")) {
              srvEndpoint = `${currentOrigin}/mcp`;
            } else if (
              currentHost.endsWith(".local") ||
              currentHost.includes(".ts.net")
            ) {
              // Ensure we use the correct protocol/host the user is actually using
              srvEndpoint = `${currentOrigin}/mcp`;
            }
          }
          setBaseUrl(srvEndpoint);
          setIsLoading(false);
        })
        .catch((err) => {
          console.error("Failed to fetch settings:", err);
          setIsLoading(false);
        });
    }
  }, []);

  const generateApiKey = () => {
    // Legacy - redirected to confirmRegenerate logic via UI state
  };

  const confirmRegenerate = async () => {
    try {
      const res = await fetch("/api/settings/regenerate", { method: "POST" });
      if (!res.ok) throw new Error("Failed to regenerate key");
      const data = await res.json();

      const newKey = data.apiKey;
      setApiKey(newKey);
      localStorage.setItem("om_api_key", newKey);
      setIsKeyVisible(true);
      setShowRegenConfirm(false);
      setRegenInputValue("");
      toast.success("Token Regenerated!", {
        description: "All existing client connections will need to be updated.",
      });
    } catch (e) {
      console.error(e);
      toast.error("Failed to regenerate token", {
        description: "Please check if the server is running.",
      });
    }
  };

  const getMcpConfig = (clientId: string) => {
    // Local mode: use stdio (command-based) - no server needed, runs via npx
    if (isManaged) {
      return {
        mcpServers: {
          cybermem: {
            command: "npx",
            args: ["@cybermem/mcp"],
          },
        },
      };
    }

    // Remote mode: use stdio with --url and --token
    return {
      mcpServers: {
        cybermem: {
          command: "npx",
          args: [
            "-y",
            "@cybermem/mcp",
            "--url",
            baseUrl,
            "--token",
            apiKey || "sk-your-generated-token",
          ],
        },
      },
    };
  };

  const getConfigContent = (maskKey = false) => {
    const config = (clients as any[]).find((c) => c.id === selectedClient);
    const displayKey = maskKey
      ? "••••••••••••••••"
      : apiKey || "sk-your-generated-token";
    const actualKey = apiKey || "sk-your-generated-token";

    // Handle TOML config (Codex)
    if (config?.configType === "toml") {
      if (isManaged) {
        return `# CyberMem Configuration (Local Mode)\n[mcp]\ncommand = "npx"\nargs = ["@cybermem/mcp"]`;
      }
      return `# CyberMem Configuration (Remote Mode)\n[mcp]\ncommand = "npx"\nargs = ["@cybermem/mcp", "--url", "${baseUrl}", "--token", "${maskKey ? displayKey : actualKey}"]`;
    }

    // Handle command-based configs (Claude Code, Gemini CLI, etc.)
    if (config?.configType === "command" || config?.configType === "cmd") {
      // Select command based on mode
      let cmd = isManaged ? config?.localCommand : config?.remoteCommand;

      // Fallback to legacy 'command' field if new fields not present
      if (!cmd) {
        cmd = config?.command?.replace("http://localhost:8080", baseUrl) || "";
      }

      // Substitute placeholders with actual values
      cmd = cmd.replace("{{ENDPOINT}}", baseUrl);
      cmd = cmd.replace("{{API_KEY}}", maskKey ? displayKey : actualKey);
      cmd = cmd.replace("{{TOKEN}}", maskKey ? displayKey : actualKey);

      return cmd;
    }

    // Default to JSON config
    const jsonConfig = getMcpConfig(selectedClient);
    return JSON.stringify(jsonConfig, null, 2);
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    toast.success("Copied to clipboard!");
  };

  const highlightJSON = (obj: any) => {
    const json = JSON.stringify(obj, null, 2);
    return json.replace(
      /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
      (match) => {
        let cls = "text-orange-300";
        if (/^"/.test(match)) {
          if (/:$/.test(match)) {
            cls = "text-emerald-300";
          } else {
            cls = "text-yellow-200";
          }
        } else if (/true|false/.test(match)) {
          cls = "text-blue-300";
        } else if (/null/.test(match)) {
          cls = "text-gray-400";
        }
        return `<span class="${cls}">${match}</span>`;
      },
    );
  };

  const selectedConfig = (clients as any[]).find(
    (c) => c.id === selectedClient,
  );

  const renderInstructions = () => {
    if (!selectedConfig) return null;

    return (
      <div className="space-y-4 text-sm text-neutral-300">
        <p>{selectedConfig.description}</p>
        {selectedConfig.steps.length > 0 && (
          <ol className="list-decimal list-inside space-y-2 ml-2 text-neutral-400">
            {selectedConfig.steps.map((step: string, i: number) => (
              <li
                key={i}
                dangerouslySetInnerHTML={{
                  __html: step
                    .replace(
                      /\*\*(.*?)\*\*/g,
                      '<span class="text-white font-medium">$1</span>',
                    )
                    .replace(
                      /`([^`]+)`/g,
                      '<code class="text-emerald-400 bg-emerald-500/10 px-1 py-0.5 rounded">$1</code>',
                    ),
                }}
              />
            ))}
          </ol>
        )}
      </div>
    );
  };

  const configContent = getConfigContent();

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
          `,
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-2 flex-none">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/5 rounded-lg border border-white/10 shadow-inner">
              <Image
                src="/icons/mcp.png"
                alt="MCP Logo"
                width={20}
                height={20}
                className="drop-shadow-[0_0_5px_rgba(255,255,255,0.3)]"
              />
            </div>
            <h2 className="text-xl font-semibold text-white text-shadow-sm">
              Integrate MCP Client
            </h2>
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
                      ${
                        selectedClient === client.id
                          ? "bg-emerald-500/10 border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.1)] backdrop-blur-sm"
                          : "bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/20 backdrop-blur-sm"
                      }
                    `}
                >
                  <div className="mb-2 transition-transform duration-300 group-hover:scale-110">
                    {client.icon ? (
                      <Image
                        src={client.icon}
                        alt={client.name}
                        width={32}
                        height={32}
                        className="object-contain drop-shadow-lg"
                      />
                    ) : (
                      <div className="w-8 h-8 flex items-center justify-center text-white/50 bg-white/5 rounded-full border border-white/10 transition-transform duration-300">
                        <span className="text-sm font-bold">?</span>
                      </div>
                    )}
                  </div>
                  <span
                    className={`text-[10px] font-medium text-center transition-colors ${selectedClient === client.id ? "text-emerald-400 text-shadow-emerald" : "text-neutral-400 group-hover:text-white"}`}
                  >
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
              {selectedClient === "codex"
                ? "Configuration"
                : selectedClient === "other"
                  ? "Configuration JSON"
                  : "Integration Instructions"}
            </h3>

            <div className="bg-white/5 border border-white/10 rounded-lg p-5 space-y-4 shadow-[inset_0_0_20px_rgba(255,255,255,0.02)] backdrop-blur-sm">
              {selectedClient === "chatgpt" && (
                <div className="px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-200">
                  <p>
                    Requires Developer Mode.{" "}
                    <a
                      href="https://platform.openai.com/docs/guides/developer-mode"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline hover:text-white"
                    >
                      Read OpenAI Documentation
                    </a>
                  </p>
                </div>
              )}

              {renderInstructions()}

              {/* Hardware / Mode Badge - Show always at the top of integration section */}
              <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-lg p-4 mb-4">
                <div className="flex items-start gap-3">
                  <Info className="h-4 w-4 shrink-0 text-emerald-400 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-emerald-200">
                      {instanceType === "local"
                        ? "Local Mode Active"
                        : "LAN / RPi Mode Active"}
                    </p>
                    <p className="text-xs text-emerald-200/60">
                      {instanceType === "local"
                        ? "No token required since you're on the same machine. Just copy the config below."
                        : "Connect from your laptop using the secure token and RPi endpoint shown below."}
                    </p>
                  </div>
                </div>
              </div>

              {/* API Key Control Row - Only show in remote mode */}
              {!isManaged && (
                <div className="bg-white/5 border border-white/10 rounded-lg p-5 space-y-4 shadow-[inset_0_0_20px_rgba(255,255,255,0.02)] backdrop-blur-sm mb-4">
                  <div className="space-y-2">
                    <Label htmlFor="mcp-api-key" className="text-neutral-200">
                      Security Token
                    </Label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Input
                          id="mcp-api-key"
                          value={apiKey || "sk-not-generated-yet"}
                          readOnly
                          className="bg-black/40 border-white/10 text-white focus-visible:border-emerald-500/30 focus-visible:ring-emerald-500/10 placeholder:text-neutral-600 shadow-inner pr-10 font-mono"
                          type={isKeyVisible ? "text" : "password"}
                        />
                        <button
                          type="button"
                          onClick={() => setIsKeyVisible(!isKeyVisible)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white transition-colors"
                        >
                          {isKeyVisible ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-10 w-10 border border-white/10 bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white"
                        onClick={() => copyToClipboard(apiKey, "apikey")}
                        title="Copy API Key"
                      >
                        {copiedId === "apikey" ? (
                          <Check className="h-4 w-4 text-emerald-400" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>

                    {/* Regeneration Controls */}
                    <div className="flex justify-end pt-2">
                      {showRegenConfirm ? (
                        <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-4 duration-200">
                          <span className="text-xs text-red-400 font-medium">
                            Warning: Disconnects clients.
                          </span>
                          <Input
                            value={regenInputValue}
                            onChange={(e) => setRegenInputValue(e.target.value)}
                            placeholder="Type 'agree'"
                            className="h-8 w-28 bg-red-500/10 border-red-500/30 text-red-200 text-xs placeholder:text-red-500/30 focus-visible:border-red-500/50"
                          />
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 px-3 text-neutral-400 hover:text-white hover:bg-white/10"
                            onClick={() => {
                              setShowRegenConfirm(false);
                              setRegenInputValue("");
                            }}
                          >
                            Cancel
                          </Button>
                          <Button
                            size="sm"
                            disabled={regenInputValue !== "agree"}
                            className="h-8 px-3 bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                            onClick={confirmRegenerate}
                          >
                            Confirm
                          </Button>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 px-2 text-neutral-400 hover:text-white hover:bg-white/10"
                          onClick={() => setShowRegenConfirm(true)}
                        >
                          Regenerate Key
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="relative group">
                <div className="relative pl-5 py-5 pr-24 rounded-lg bg-[#0F161C] border border-white/10 font-mono text-xs md:text-sm text-white overflow-x-auto shadow-[0_0_20px_rgba(0,0,0,0.3)] inset-shadow">
                  <pre className="text-shadow-sm">
                    {(() => {
                      const config = (clients as any[]).find(
                        (c) => c.id === selectedClient,
                      );
                      if (config?.configType === "json") {
                        return (
                          <code
                            dangerouslySetInnerHTML={{
                              __html: highlightJSON(
                                JSON.parse(getConfigContent(!isKeyVisible)),
                              ),
                            }}
                          />
                        );
                      } else {
                        return getConfigContent(!isKeyVisible);
                      }
                    })()}
                  </pre>
                </div>
                <div className="absolute top-5 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 px-3 text-white bg-black/40 backdrop-blur border border-white/5 shadow-[0_0_10px_rgba(255,255,255,0.05)] hover:bg-white/10 hover:text-white font-medium"
                    onClick={() =>
                      copyToClipboard(getConfigContent(false), "config")
                    }
                  >
                    {copiedId === "config" ? (
                      <Check className="h-4 w-4 stroke-[2.5] text-emerald-400 mr-2 drop-shadow-[0_0_5px_rgba(52,211,153,0.5)]" />
                    ) : (
                      <Copy className="h-4 w-4 stroke-[2.5] mr-2 text-white drop-shadow-[0_0_5px_rgba(255,255,255,0.3)]" />
                    )}
                    {copiedId === "config" ? (
                      <span className="text-emerald-400 text-shadow-sm">
                        Copied
                      </span>
                    ) : (
                      <span className="text-white text-shadow-sm">Copy</span>
                    )}
                  </Button>
                </div>
              </div>

              {!isManaged && (
                <div className="flex items-start gap-3 p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/10 text-emerald-200/70 text-xs mt-4">
                  <Info className="h-4 w-4 shrink-0 text-white mt-0.5" />
                  <p>
                    This configuration includes your generated Security Token.
                    Keep it secure and do not share it publicly.
                  </p>
                </div>
              )}
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
            <a href="https://docs.cybermem.dev" target="_blank">
              Read Documentation
            </a>
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
  );
}
