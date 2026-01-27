"use client";

import { Button } from "@/components/ui/button";
import { useDashboard } from "@/lib/data/dashboard-context";
import {
  AlertCircle,
  Book,
  CheckCircle2,
  Loader2,
  Settings,
  XCircle,
} from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";

export default function DashboardHeader({
  onShowMCPConfig,
  onShowSettings,
}: {
  onShowMCPConfig: () => void;
  onShowSettings: () => void;
}) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [showHealthPopup, setShowHealthPopup] = useState(false);
  const [instanceLabel, setInstanceLabel] = useState<string>("Local Machine");
  const { systemHealth } = useDashboard();

  useEffect(() => {
    // Check initial scroll position on mount
    setIsScrolled(window.scrollY > 10);

    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);

    // Fetch identity for subtitle
    fetch("/api/settings")
      .then((res) => res.json())
      .then((data) => {
        const { env, instance, tailscale } = data;
        const tsSuffix =
          instance === "rpi" ? `-${tailscale ? "ts" : "local"}` : "";
        setInstanceLabel(`${instance}-${env}${tsSuffix}`);
      })
      .catch(() => {});

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const getStatusConfig = () => {
    if (!systemHealth) {
      return {
        bg: "bg-neutral-500/10",
        text: "text-neutral-400",
        border: "border-neutral-500/20",
        icon: Loader2,
        label: "Checking...",
      };
    }
    switch (systemHealth.overall) {
      case "ok":
        return {
          bg: "bg-emerald-500/10",
          text: "text-emerald-400",
          border: "border-emerald-500/20",
          icon: CheckCircle2,
          label: "All Systems OK",
        };
      case "degraded":
        return {
          bg: "bg-amber-500/10",
          text: "text-amber-400",
          border: "border-amber-500/20",
          icon: AlertCircle,
          label: "Degraded",
        };
      case "error":
        return {
          bg: "bg-red-500/10",
          text: "text-red-400",
          border: "border-red-500/20",
          icon: XCircle,
          label: "System Error",
        };
    }
  };

  const statusConfig = getStatusConfig();
  const StatusIcon = statusConfig.icon;

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-300 ${
        isScrolled
          ? "border-b border-white/10 backdrop-blur-xl bg-neutral-900/30"
          : "border-b border-transparent bg-transparent"
      }`}
    >
      <div className="px-6 py-5 max-w-7xl mx-auto">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative w-10 h-10 flex-shrink-0">
              <Image
                src="/logo.svg"
                alt="CyberMem Logo"
                width={40}
                height={40}
                className="object-contain"
              />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold tracking-tight text-white leading-none font-exo">
                  CyberMem
                </h1>

                {/* System Health Status Badge with Hover Popup */}
                <div
                  className="relative mt-1.5"
                  onMouseEnter={() => setShowHealthPopup(true)}
                  onMouseLeave={() => setShowHealthPopup(false)}
                >
                  {!systemHealth ? (
                    /* Shimmer loading state */
                    <div className="px-3 py-[2px] rounded-full bg-white/5 border border-white/10 animate-pulse">
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded-full bg-white/10" />
                        <div className="w-16 h-3 rounded bg-white/10" />
                      </div>
                    </div>
                  ) : (
                    <div
                      className={`px-2 py-[2px] rounded-full text-[10px] font-medium flex items-center gap-1 cursor-pointer ${statusConfig.bg} ${statusConfig.text} border ${statusConfig.border}`}
                    >
                      <StatusIcon className="w-3 h-3" />
                      {statusConfig.label}
                    </div>
                  )}

                  {/* Hover Popup */}
                  {showHealthPopup && systemHealth && (
                    <div className="absolute top-full left-0 mt-2 w-64 bg-[#0B1116]/95 border border-white/10 rounded-lg shadow-xl z-50 backdrop-blur-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                      <div className="p-3 border-b border-white/5">
                        <p className="text-xs text-neutral-400">
                          System Health
                        </p>
                        <p className="text-[10px] text-neutral-500 mt-0.5">
                          Updated:{" "}
                          {new Date(
                            systemHealth.timestamp,
                          ).toLocaleTimeString()}
                        </p>
                      </div>
                      <div className="p-2 space-y-1">
                        {systemHealth.services.map((service, i) => (
                          <div
                            key={i}
                            className="flex items-center justify-between px-2 py-1.5 rounded hover:bg-white/5"
                          >
                            <span className="text-xs text-neutral-300">
                              {service.name}
                            </span>
                            <div className="flex items-center gap-2">
                              {service.latencyMs && (
                                <span className="text-[10px] text-neutral-500">
                                  {service.latencyMs}ms
                                </span>
                              )}
                              {service.status === "ok" ? (
                                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                              ) : service.status === "warning" ? (
                                <AlertCircle className="w-3 h-3 text-amber-400" />
                              ) : (
                                <XCircle className="w-3 h-3 text-red-400" />
                              )}
                            </div>
                          </div>
                        ))}
                        {systemHealth.services.some(
                          (s) => s.status !== "ok" && s.message,
                        ) && (
                          <div className="mt-2 p-2 rounded bg-red-500/10 border border-red-500/20">
                            <p className="text-xs text-red-300 font-medium">
                              Issues:
                            </p>
                            {systemHealth.services
                              .filter((s) => s.status !== "ok" && s.message)
                              .map((s, i) => (
                                <p
                                  key={i}
                                  className="text-[10px] text-red-400 mt-1"
                                >
                                  • {s.name}: {s.message}
                                </p>
                              ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <p className="text-sm text-neutral-400 mt-1">
                Memory MCP Server ({instanceLabel})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={onShowMCPConfig}
              className="hidden md:flex h-10 px-4 text-sm font-medium bg-emerald-500/10 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/20 border border-emerald-500/20 hover:border-emerald-500/40 rounded-lg"
            >
              <Image
                src="/icons/mcp.png"
                alt="MCP"
                width={16}
                height={16}
                className="mr-2"
              />
              Connect MCP
            </Button>

            <Button
              variant="ghost"
              size="sm"
              asChild
              className="hidden md:flex h-10 px-4 text-sm font-medium text-neutral-400 hover:text-white bg-white/5 border border-white/10 hover:bg-white/10 rounded-lg"
            >
              <a href="https://docs.cybermem.dev" target="_blank">
                <Book className="w-4 h-4 mr-2" />
                Docs
              </a>
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={onShowSettings}
              className="h-10 w-10 text-neutral-400 hover:text-white bg-white/5 border border-white/10 hover:bg-white/10 rounded-lg"
            >
              <Settings className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
