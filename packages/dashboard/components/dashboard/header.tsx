"use client"

import { Button } from "@/components/ui/button";
import { Book, Settings } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";

export default function DashboardHeader({
  onShowMCPConfig,
  onShowSettings,
}: {
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
              <Image src="/logo.svg" alt="CyberMem Logo" width={40} height={40} className="object-contain" />
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
              <Image src="/icons/mcp.png" alt="MCP" width={16} height={16} className="mr-2" />
              Connect MCP
            </Button>

            <Button
              variant="ghost"
              size="sm"
              asChild
              className="hidden md:flex h-10 px-4 text-sm font-medium text-neutral-400 hover:text-white bg-white/5 border border-white/10 hover:bg-white/10 rounded-lg"
            >
              <a href="https://cybermem.dev/docs" target="_blank">
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
  )
}

