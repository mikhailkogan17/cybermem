"use client";

import { TintButton } from "@/components/ui/tint-button";
import { Loader2, RotateCcw, Server } from "lucide-react";

interface SystemInfoSectionProps {
  settings: any;
  handleRestart: () => void;
  isRestarting: boolean;
}

export default function SystemInfoSection({
  settings,
  handleRestart,
  isRestarting,
}: SystemInfoSectionProps) {
  return (
    <section className="pb-4">
      <h3 className="text-sm font-medium text-neutral-400 uppercase tracking-widest mb-4 flex items-center gap-2">
        <Server className="w-4 h-4" />
        System Information
      </h3>
      <div className="bg-white/[0.032] border-[0.5px] border-white/10 rounded-2xl p-6 space-y-6">
        <div className="grid grid-cols-2 gap-12">
          <div className="space-y-4">
            <span className="text-[10px] uppercase text-neutral-500 font-bold tracking-[0.2em] block mb-2">
              Versions
            </span>
            <div className="space-y-3">
              <div className="flex justify-between items-center group/version">
                <span className="text-xs text-neutral-400 group-hover/version:text-neutral-300 transition-colors">
                  Dashboard
                </span>
                <code className="text-[13px] font-mono text-neutral-200 bg-white/5 px-2 py-0.5 rounded border border-white/10 group-hover/version:border-emerald-500/30 group-hover/version:text-emerald-400 transition-all">
                  {settings?.dashboardVersion || "v0.7.5"}
                </code>
              </div>
              <div className="flex justify-between items-center group/version">
                <span className="text-xs text-neutral-400 group-hover/version:text-neutral-300 transition-colors">
                  MCP Server
                </span>
                <code className="text-[13px] font-mono text-neutral-200 bg-white/5 px-2 py-0.5 rounded border border-white/10 group-hover/version:border-emerald-500/30 group-hover/version:text-emerald-400 transition-all">
                  {settings?.mcpVersion || "v0.7.5"}
                </code>
              </div>
            </div>
          </div>
          <div className="border-l border-white/5 pl-8">
            <span className="text-[10px] uppercase text-neutral-500 font-bold tracking-[0.2em] block mb-2">
              Environment
            </span>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs text-neutral-400">Status</span>
                <code
                  className={`text-[13px] font-mono px-2 py-0.5 rounded border ${
                    settings?.env === "staging"
                      ? "text-yellow-400 bg-yellow-500/10 border-yellow-500/20"
                      : "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
                  }`}
                >
                  {settings?.env === "staging" ? "Staging" : "Production"}
                </code>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-neutral-400">Instance</span>
                <code className="text-[13px] font-mono text-neutral-200 bg-white/5 px-2 py-0.5 rounded border border-white/10">
                  {settings?.instanceType === "rpi"
                    ? "Raspberry Pi"
                    : settings?.instanceType === "vps"
                      ? "Cloud / VPS"
                      : "Local Machine"}
                </code>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-2 border-t border-white/5">
          <TintButton
            tint="sky"
            variant="solid"
            className="w-full h-10"
            onClick={handleRestart}
            disabled={isRestarting}
          >
            {isRestarting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RotateCcw className="w-4 h-4" />
            )}
            {isRestarting ? "Restarting..." : "Restart Service"}
          </TintButton>
        </div>
      </div>
    </section>
  );
}
