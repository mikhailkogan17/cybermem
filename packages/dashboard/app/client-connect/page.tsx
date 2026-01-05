"use client"

import LoginModal from "@/components/dashboard/login-modal"
import MCPConfigModal from "@/components/dashboard/mcp-config-modal"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

export default function ClientConnectPage() {
  const router = useRouter()
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)

  // Check auth on mount
  useEffect(() => {
    const auth = sessionStorage.getItem("authenticated")
    setIsAuthenticated(auth === "true")
  }, [])

  const handleLogin = () => {
    sessionStorage.setItem("authenticated", "true")
    setIsAuthenticated(true)
    // Mark that we came from /client-connect for first-run experience
    sessionStorage.setItem("fromClientConnect", "true")
  }

  const handleClose = () => {
    router.push("/")
  }

  // Loading state
  if (isAuthenticated === null) {
    return <div className="min-h-screen bg-[#0a0a0a]" />
  }

  // Not authenticated - show login
  if (!isAuthenticated) {
    return <LoginModal onLogin={handleLogin} />
  }

  // Authenticated - show MCP modal
  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <MCPConfigModal onClose={handleClose} />
    </div>
  )
}
