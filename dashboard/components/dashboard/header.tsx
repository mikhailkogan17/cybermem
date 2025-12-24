"use client"

import { Button } from "@/components/ui/button";
import { ChevronDown, Settings } from "lucide-react";
import { useEffect, useState } from "react";

const periods = [
  { value: "1h", label: "1 Hour" },
  { value: "24h", label: "24 Hours" },
  { value: "7d", label: "7 Days" },
  { value: "30d", label: "30 Days" },
  { value: "90d", label: "90 Days" },
]

export default function DashboardHeader({
  period,
  onPeriodChange,
  onShowMCPConfig,
  onShowSettings,
}: {
  period: string;
  onPeriodChange: (p: string) => void;
  onShowMCPConfig: () => void;
  onShowSettings: () => void;
}) {
  const [isScrolled, setIsScrolled] = useState(false)

  useEffect(() => {
    // Check initial scroll position on mount
    setIsScrolled(window.scrollY > 10)
    
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10)
    }
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  return (
    <header className={`sticky top-0 z-50 transition-all duration-300 ${
      isScrolled
        ? "border-b border-white/10 backdrop-blur-xl bg-neutral-900/30"
        : "border-b border-transparent bg-transparent"
    }`}>
      <div className="px-6 py-5 max-w-7xl mx-auto">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative w-10 h-10 flex-shrink-0">
              <img src="/logo.svg" alt="CyberMem Logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-white leading-none font-exo">CyberMem</h1>
              <p className="text-sm text-neutral-400 mt-1">Memory MCP Server</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={onShowMCPConfig}
              className="hidden md:flex h-10 px-4 text-sm font-medium bg-emerald-500/10 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/20 border border-emerald-500/20 hover:border-emerald-500/40 rounded-lg"
            >
              <img src="/icons/mcp.png" alt="MCP" className="w-4 h-4 mr-2" />
              Configure MCP
            </Button>

            {/* Period Selector (Grafana-style) */}
            <div className="relative group">
              <button className="h-10 px-4 rounded-lg bg-white/5 border border-white/10 hover:border-emerald-500/50 text-white text-sm font-medium flex items-center gap-2 transition-all hover:bg-white/10">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                {periods.find((p) => p.value === period)?.label}
                <ChevronDown className="w-4 h-4" />
              </button>

              {/* Dropdown Menu */}
              <div className="absolute right-0 mt-2 w-48 bg-[#0B1116]/95 border border-white/10 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10 backdrop-blur-xl overflow-hidden">
                {periods.map((p) => (
                  <button
                    key={p.value}
                    onClick={() => onPeriodChange(p.value)}
                    className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                      period === p.value
                        ? "bg-emerald-500/20 text-emerald-400 font-medium"
                        : "text-neutral-300 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

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
  )
}
