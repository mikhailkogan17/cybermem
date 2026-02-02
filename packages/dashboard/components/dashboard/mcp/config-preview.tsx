"use client";

import { Button } from "@/components/ui/button";
import { Check, Copy, Eye, EyeOff, Terminal } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

interface ConfigPreviewProps {
  selectedConfig: any | undefined;
  configContent: string;
  configType: string;
  isManaged: boolean;
  isKeyVisible: boolean;
  onToggleKeyVisibility: () => void;
  onClose: () => void;
}

export default function ConfigPreview({
  selectedConfig,
  configContent,
  configType,
  isManaged,
  isKeyVisible,
  onToggleKeyVisibility,
  onClose,
}: ConfigPreviewProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const highlightJSON = (jsonStr: string) => {
    try {
      const obj = JSON.parse(jsonStr);
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
    } catch (e) {
      return jsonStr;
    }
  };

  if (!selectedConfig) return null;

  return (
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
                  ].includes(selectedConfig.id)
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
              {/* Vertical Line */}
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
          <div className="relative rounded-t-lg bg-[#05100F] px-4 py-4 flex items-center justify-between border-b border-transparent">
            <div className="flex items-center gap-4">
              <div className="text-sm text-white font-semibold pl-2">
                {(() => {
                  if (["claude-code", "gemini-cli"].includes(selectedConfig.id))
                    return "Terminal";
                  if (selectedConfig.filename) return selectedConfig.filename;
                  if (configType === "command" || configType === "cmd")
                    return "Terminal";
                  return "mcp.json";
                })()}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {!isManaged && (
                <button
                  type="button"
                  onClick={onToggleKeyVisibility}
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
                        isKeyVisible ? "translate-x-3.5" : "translate-x-0.5"
                      }`}
                    />
                  </div>
                </button>
              )}

              <button
                onClick={() => copyToClipboard(configContent, "config")}
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

          <div className="relative">
            <div
              className={`relative rounded-b-lg bg-[#05100F] font-mono text-xs md:text-sm text-white overflow-x-auto ${
                configType === "command" || configType === "cmd"
                  ? "px-4 py-3"
                  : "pl-5 py-5 pr-5"
              }`}
            >
              <pre className="text-shadow-sm">
                {configType === "json" ? (
                  <code
                    dangerouslySetInnerHTML={{
                      __html: highlightJSON(configContent),
                    }}
                  />
                ) : (
                  <code className="whitespace-pre-wrap break-all flex items-start gap-2">
                    {(configType === "command" || configType === "cmd") && (
                      <Terminal className="w-4 h-4 mt-0.5 flex-shrink-0 text-emerald-400" />
                    )}
                    <span>{configContent}</span>
                  </code>
                )}
              </pre>
            </div>
          </div>
        </div>
      </div>

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
  );
}
