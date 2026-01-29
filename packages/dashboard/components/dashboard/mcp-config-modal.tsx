"use client";

import { Button } from "@/components/ui/button";
import { useDashboard } from "@/lib/data/dashboard-context";
import { Check, Copy, Eye, EyeOff, Terminal, X } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";

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
  const [isManaged, setIsManaged] = useState(false);

  useEffect(() => {
    const localKey = localStorage.getItem("om_api_key");
    if (localKey) {
      setApiKey(localKey);
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
          setIsManaged(data.isManaged || false);
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
        .catch((err) => {
          console.error("Failed to fetch settings:", err);
          setIsLoading(false);
        });
    }
  }, []);

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
    } catch (e) {
      console.error(e);
      alert("Failed to regenerate key on server.");
    }
  };

  const getMcpConfig = (clientId: string) => {
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

    if (config?.configType === "toml") {
      if (isManaged) {
        return `# CyberMem Configuration (Local Mode)\n[mcp]\ncommand = "npx"\nargs = ["@cybermem/mcp"]`;
      }
      return `# CyberMem Configuration (Remote Mode)\n[mcp]\ncommand = "npx"\nargs = ["@cybermem/mcp", "--url", "${baseUrl}", "--token", "${maskKey ? displayKey : actualKey}"]`;
    }

    if (config?.configType === "command" || config?.configType === "cmd") {
      let cmd = isManaged ? config?.localCommand : config?.remoteCommand;

      if (!cmd) {
        cmd = config?.command?.replace("http://localhost:8080", baseUrl) || "";
      }

      cmd = cmd.replace("{{ENDPOINT}}", baseUrl);
      cmd = cmd.replace("{{API_KEY}}", maskKey ? displayKey : actualKey);
      cmd = cmd.replace("{{TOKEN}}", maskKey ? displayKey : actualKey);

      return cmd;
    }

    const jsonConfig = getMcpConfig(selectedClient);
    if (!isManaged && maskKey) {
      const args = (jsonConfig.mcpServers.cybermem as any).args;
      const tokenIdx = args.indexOf("--token");
      if (tokenIdx !== -1 && args[tokenIdx + 1]) {
        args[tokenIdx + 1] = displayKey;
      }
    }
    return JSON.stringify(jsonConfig, null, 2);
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
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
        className="w-full max-w-6xl bg-[#05100F] backdrop-blur-xl border-[0.5px] border-white/10 rounded-3xl shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh] relative overflow-hidden"
        style={{
          backgroundImage: `
            radial-gradient(circle at 0% 0%, oklch(0.7 0 0 / 0.05) 0%, transparent 50%),
            radial-gradient(circle at 100% 0%, oklch(0.6 0 0 / 0.05) 0%, transparent 50%),
            radial-gradient(circle at 100% 100%, oklch(0.65 0 0 / 0.05) 0%, transparent 50%),
            radial-gradient(circle at 0% 100%, oklch(0.6 0 0 / 0.05) 0%, transparent 50%)
          `,
        }}
      >
        {/* Close Button (Top Right) */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="absolute top-6 right-6 z-10 text-neutral-400 hover:text-white hover:bg-white/10 rounded-full"
        >
          <X className="w-5 h-5" />
        </Button>

        {/* Master-Details Layout */}
        <div className="flex flex-1 min-h-0">
          {/* Master: Client List (Left Sidebar) */}
          <div className="w-80 border-r-[0.5px] border-white/10 flex-none overflow-y-auto overscroll-none bg-white/[0.015] rounded-l-3xl">
            <div className="p-6">
              <div className="flex items-center gap-2 mb-3">
                <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                  Clients
                </h3>
              </div>
              <h2 className="text-2xl font-bold text-white mb-6">
                Integrations
              </h2>
              <div className="space-y-2">
                {clients.map((client) => (
                  <button
                    key={client.id}
                    onClick={() => setSelectedClient(client.id)}
                    className={`
                      w-full flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all duration-200 relative
                      ${
                        selectedClient === client.id
                          ? "bg-white/[0.03] border-[0.5px] border-white/[0.05]"
                          : "hover:bg-white/5"
                      }
                    `}
                  >
                    {selectedClient === client.id && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
                    )}
                    {client.icon ? (
                      <div
                        className={`w-10 h-10 flex-shrink-0 relative overflow-hidden rounded-lg border border-white/5 ${
                          [
                            "claude-desktop",
                            "claude-code",
                            "chatgpt",
                            "gemini-cli",
                            "perplexity",
                          ].includes(client.id)
                            ? ""
                            : "bg-white/5 p-1.5"
                        }`}
                      >
                        <Image
                          src={client.icon}
                          alt={client.name}
                          fill
                          className={`
                            ${
                              [
                                "claude-desktop",
                                "claude-code",
                                "chatgpt",
                                "gemini-cli",
                                "perplexity",
                              ].includes(client.id)
                                ? "object-cover"
                                : "object-contain"
                            } ${selectedClient === client.id ? "opacity-100" : "opacity-50 grayscale"}
                          `}
                        />
                      </div>
                    ) : (
                      <div className="w-7 h-7 flex items-center justify-center text-white/50 bg-white/5 rounded-full border border-white/10 flex-shrink-0">
                        <span className="text-xs font-bold">?</span>
                      </div>
                    )}
                    <span
                      className={`text-sm font-medium truncate ${
                        selectedClient === client.id
                          ? "text-white"
                          : "text-neutral-400"
                      }`}
                    >
                      {client.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Details: Configuration Steps (Right Panel) */}
          <div className="flex-1 flex flex-col bg-white/[0.032]">
            <div className="flex-1 overflow-y-auto overscroll-none p-8 space-y-4">
              {/* Client Header */}
              <div className="flex items-center gap-4">
                {selectedConfig?.icon && (
                  <div className="w-14 h-14 flex-shrink-0 relative overflow-hidden">
                    <Image
                      src={selectedConfig.icon}
                      alt={selectedConfig.name}
                      fill
                      className={
                        [
                          "claude-desktop",
                          "claude-code",
                          "chatgpt",
                          "gemini-cli",
                          "perplexity",
                        ].includes(selectedClient)
                          ? "object-cover"
                          : "object-contain"
                      }
                    />
                  </div>
                )}
                <div>
                  <h3 className="text-2xl font-bold text-white">
                    {selectedConfig?.name}
                  </h3>
                  <p className="text-sm text-neutral-400 uppercase tracking-wider">
                    Integrate MCP Client
                  </p>
                </div>
              </div>

              <div className="space-y-0 pt-2">
                {selectedConfig?.steps?.map((step: string, index: number) => (
                  <div
                    key={index}
                    className="relative flex items-start gap-4 pb-4 group/step"
                  >
                    {/* Vertical Line - Digit to Digit */}
                    {index < (selectedConfig?.steps?.length || 0) - 1 && (
                      <div className="absolute top-6 bottom-0 left-[11.5px] w-px bg-emerald-500/20" />
                    )}

                    {/* Step Number */}
                    <div className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-500/50 text-emerald-400 text-xs font-bold z-10">
                      {index + 1}
                    </div>

                    {/* Step Text */}
                    <div
                      className="flex-1 text-sm text-neutral-300 leading-relaxed"
                      dangerouslySetInnerHTML={{
                        __html: step
                          .replace(
                            /\*\*(.+?)\*\*/g,
                            '<strong class="text-white font-semibold">$1</strong>',
                          )
                          .replace(
                            /`(.+?)`/g,
                            '<code class="px-1.5 py-0.5 rounded bg-white/10 text-emerald-400 font-mono text-xs">$1</code>',
                          ),
                      }}
                    />
                  </div>
                ))}
              </div>

              {/* Config Code Block */}
              <div className="relative group w-full overflow-hidden border border-white/10 rounded-lg shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
                {/* macOS-style Window Chrome (Finder style) */}
                <div className="relative rounded-t-lg bg-[#05100F] px-4 py-4 flex items-center justify-between border-b border-transparent">
                  <div className="flex items-center gap-4">
                    {/* Title */}
                    <div className="text-sm text-white font-semibold pl-2">
                      {(() => {
                        const config = (clients as any[]).find(
                          (c) => c.id === selectedClient,
                        );
                        if (
                          ["claude-code", "gemini-cli"].includes(selectedClient)
                        )
                          return "Terminal";
                        if (config?.filename) return config.filename;
                        if (
                          config?.configType === "command" ||
                          config?.configType === "cmd"
                        )
                          return "Terminal";
                        return "mcp.json";
                      })()}
                    </div>
                  </div>

                  {/* Header Controls (Finder style) */}
                  <div className="flex items-center gap-2">
                    {/* Unhide Token Button */}
                    {!isManaged && (
                      <button
                        type="button"
                        onClick={() => setIsKeyVisible(!isKeyVisible)}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-all text-xs font-medium text-neutral-300 hover:text-white"
                        title="Unhide Token"
                      >
                        {isKeyVisible ? (
                          <EyeOff className="w-3.5 h-3.5" />
                        ) : (
                          <Eye className="w-3.5 h-3.5" />
                        )}
                        <span>Unhide Token</span>
                        <div
                          className={`relative inline-flex h-3.5 w-6.5 items-center rounded-full transition-colors ml-1 ${
                            isKeyVisible ? "bg-emerald-500" : "bg-neutral-600"
                          }`}
                        >
                          <span
                            className={`inline-block h-2.5 w-2.5 transform rounded-full bg-white transition-transform ${
                              isKeyVisible
                                ? "translate-x-3.5"
                                : "translate-x-0.5"
                            }`}
                          />
                        </div>
                      </button>
                    )}

                    {/* Copy Button */}
                    <button
                      onClick={() =>
                        copyToClipboard(getConfigContent(false), "config")
                      }
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-all text-xs font-medium text-neutral-300 hover:text-white"
                      title="Copy"
                    >
                      {copiedId === "config" ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-400">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Code Block Content */}
                <div className="relative">
                  <div
                    className={`relative rounded-b-lg bg-[#05100F] font-mono text-xs md:text-sm text-white overflow-x-auto ${(() => {
                      const config = (clients as any[]).find(
                        (c) => c.id === selectedClient,
                      );
                      return config?.configType === "command" ||
                        config?.configType === "cmd"
                        ? "px-4 py-3"
                        : "pl-5 py-5 pr-5";
                    })()}`}
                  >
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
                          const config = (clients as any[]).find(
                            (c) => c.id === selectedClient,
                          );
                          const isCommand =
                            config?.configType === "command" ||
                            config?.configType === "cmd";

                          return (
                            <code className="whitespace-pre-wrap break-all flex items-start gap-2">
                              {isCommand && (
                                <Terminal className="w-4 h-4 mt-0.5 flex-shrink-0 text-emerald-400" />
                              )}
                              <span>{getConfigContent(!isKeyVisible)}</span>
                            </code>
                          );
                        }
                      })()}
                    </pre>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer - Pinned in details column */}
            <div className="border-t-[0.5px] border-white/10 px-8 py-4 flex justify-end gap-3 flex-none">
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
      </div>
    </div>
  );
}
