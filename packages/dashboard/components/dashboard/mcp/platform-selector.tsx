"use client";

import Image from "next/image";

interface PlatformSelectorProps {
  clients: any[];
  selectedClient: string;
  onSelect: (id: string) => void;
}

export default function PlatformSelector({
  clients,
  selectedClient,
  onSelect,
}: PlatformSelectorProps) {
  return (
    <div className="w-80 border-r-[0.5px] border-white/10 flex-none overflow-y-auto overscroll-none bg-white/[0.015] rounded-l-3xl">
      <div className="p-6">
        <div className="flex items-center gap-2 mb-3">
          <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
          <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
            Clients
          </h3>
        </div>
        <h2 className="text-2xl font-bold text-white mb-6">Integrations</h2>
        <div className="space-y-2">
          {clients.map((client) => (
            <button
              key={client.id}
              onClick={() => onSelect(client.id)}
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
  );
}
