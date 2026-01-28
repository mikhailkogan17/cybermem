"use client";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useDashboard } from "@/lib/data/dashboard-context";
import { cn } from "@/lib/utils";
import { Activity, Book, Loader2, Settings, Shield, Zap } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";

export interface HeaderProps {
  onShowMCPConfig: () => void;
  onShowSettings: () => void;
  memoryCount?: number;
}

export default function Header({
  onShowMCPConfig,
  onShowSettings,
  memoryCount = 0,
}: HeaderProps) {
  const { systemHealth } = useDashboard();
  const [isScrolled, setIsScrolled] = useState(false);
  const [instanceLabel, setInstanceLabel] = useState<string>("checking...");

  useEffect(() => {
    // Initial check
    setIsScrolled(window.scrollY > 10);

    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);

    fetch("/api/settings")
      .then((res) => res.json())
      .then((data) => {
        const { env, instance, tailscale } = data;
        let prefix = instance || "local";
        if (instance === "local") prefix = "localhost";
        else if (instance === "rpi") prefix = tailscale ? "rpi-ts" : "rpi-lan";
        else if (instance === "vps") prefix = "vps";
        setInstanceLabel(`${prefix}-${env || "prod"}`);
      })
      .catch(() => {});

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const getStatusConfig = () => {
    if (!systemHealth) {
      return {
        text: "text-zinc-400",
        icon: Loader2,
        label: "probing",
      };
    }
    if (systemHealth.overall === "ok") {
      return {
        text: "text-emerald-400",
        icon: Zap,
        label: "healthy",
      };
    }
    return {
      text: "text-red-400",
      icon: Zap,
      label: "degraded",
    };
  };

  const status = getStatusConfig();
  const StatusIcon = status.icon;

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        isScrolled
          ? "border-b border-white/10 backdrop-blur-xl bg-neutral-900/30 shadow-2xl"
          : "border-b border-transparent bg-transparent",
      )}
    >
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        {/* Left Section: Logo & Integrated Info/Status */}
        <div className="flex items-center gap-6">
          <div className="h-10 w-10 relative">
            <Image
              src="/logo.png"
              alt="CyberMem"
              fill
              className="object-contain opacity-80"
            />
          </div>
          <div className="flex flex-col">
            <h1 className="text-2xl font-bold tracking-tighter text-white font-[family-name:var(--font-exo2)]">
              CyberMem
            </h1>

            <div className="flex items-center gap-2 text-[12px] font-normal tracking-normal text-white">
              <span className="opacity-90 lowercase">{instanceLabel}</span>
              <span className="opacity-50 text-[10px]">•</span>

              <Popover>
                <PopoverTrigger asChild>
                  <button
                    className={cn(
                      "flex items-center gap-1 transition-colors hover:opacity-80 active:opacity-100",
                      status.text,
                    )}
                  >
                    <StatusIcon
                      className={cn(
                        "h-3.5 w-3.5 flex-shrink-0",
                        status.label === "probing" && "animate-spin",
                      )}
                    />
                    <span className="font-normal lowercase truncate">
                      {status.label}
                    </span>
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-80 bg-zinc-950/95 backdrop-blur-2xl border-white/10 p-6 rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.5)] animate-in slide-in-from-top-2">
                  <div className="space-y-6">
                    <div className="flex items-center justify-between pb-4 border-b border-white/5">
                      <h4 className="text-xs font-black uppercase tracking-widest text-zinc-400">
                        System Health
                      </h4>
                      <Activity className="h-4 w-4 text-emerald-400" />
                    </div>
                    {systemHealth?.services ? (
                      <div className="space-y-4">
                        {systemHealth.services.map((service, i) => (
                          <div
                            key={i}
                            className="flex items-center justify-between group"
                          >
                            <div className="flex items-center gap-3">
                              <div
                                className={cn(
                                  "h-2 w-2 rounded-full",
                                  service.status === "ok"
                                    ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]"
                                    : "bg-red-500",
                                )}
                              />
                              <span className="text-[11px] font-bold text-zinc-300 group-hover:text-white transition-colors">
                                {service.name}
                              </span>
                            </div>
                            <span className="text-[10px] font-black text-zinc-600 uppercase tracking-tighter">
                              {service.latencyMs
                                ? `${service.latencyMs}ms`
                                : service.status === "ok"
                                  ? "Online"
                                  : "Error"}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 text-zinc-500">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="text-xs font-bold">
                          Synchronizing telemetry...
                        </span>
                      </div>
                    )}
                    <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                      <span className="text-[9px] font-black text-zinc-600 uppercase">
                        Latency: Minimal
                      </span>
                      <span className="text-[10px] font-medium opacity-40 ml-auto mr-2">
                        {memoryCount} memories
                      </span>
                      <Shield className="h-3 w-3 text-zinc-700" />
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </div>

        {/* Right Section: Actions */}
        <div className="flex items-center gap-3">
          <Button
            onClick={onShowMCPConfig}
            className="bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/20 text-emerald-400 text-sm font-medium transition-colors h-9 px-3 rounded-lg flex items-center gap-2"
          >
            <div className="relative h-4 w-4">
              <Image
                src="/icons/mcp.png"
                alt="MCP"
                fill
                className="object-contain"
              />
            </div>
            Connect MCP
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="text-white/50 hover:text-white hover:bg-white/5 transition-all h-9 px-4 rounded-lg group/docs border border-transparent hover:border-white/10"
            asChild
          >
            <a
              href="https://docs.cybermem.dev"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center"
            >
              <Book className="h-4 w-4 mr-2 opacity-50 group-hover/docs:opacity-100 transition-opacity" />
              Docs
            </a>
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={onShowSettings}
            className="text-white/50 hover:text-white hover:bg-white/10 transition-all h-9 w-9 rounded-lg border border-transparent hover:border-white/10"
            title="Settings"
          >
            <Settings className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </header>
  );
}
