"use client"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { LayoutDashboard, PlusCircle, Settings } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"

export default function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()

  const McpIcon = ({ className }: { className?: string }) => (
    <img src="/icons/mcp.png" alt="MCP" className={className} />
  )

  const navItems = [
    {
      href: "/mcp",
      label: "MCP",
      icon: McpIcon,
    },
    {
      href: "/dashboard",
      label: "Dashboard",
      icon: LayoutDashboard,
    },
    {
      href: "/setup",
      label: "Settings",
      icon: Settings,
    },
  ]

  return (
    <div className="min-h-screen bg-transparent text-white selection:bg-emerald-500/30 relative overflow-hidden">
      {/* Glassy Header */}
      <header className="sticky top-0 z-50 w-full bg-transparent backdrop-blur-sm">
        <div className="w-full px-6 flex h-16 items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/mcp" className="flex items-center gap-3 group transition-all duration-300 hover:scale-105 hover:opacity-80">
              {/* Logo */}
              <div className="relative h-10 w-10 flex items-center justify-center">
                <img
                  src="/logo.png"
                  alt="CyberMem Logo"
                  className="h-10 w-10 object-contain"
                />
              </div>
              <span className="font-bold text-xl tracking-tight text-white transition-colors" style={{ fontFamily: "'Exo 2', sans-serif" }}>
                CyberMem
              </span>
            </Link>

            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href
                return (
                  <Link key={item.href} href={item.href}>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={cn(
                        "gap-2 text-white/60 hover:text-white hover:bg-white/5 transition-all font-medium",
                        isActive && "bg-white/10 text-white"
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      {item.label}
                    </Button>
                  </Link>
                )
              })}
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
              <div className="h-2 w-2 rounded-full bg-emerald-500" />
              <span className="text-xs font-medium text-emerald-400">System Online</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content - Full Width */}
      <main className="w-full py-8 px-6 relative z-10">
        {children}
      </main>
    </div>
  )
}
