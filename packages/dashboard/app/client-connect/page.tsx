"use client"

import MCPConfigModal from "@/components/dashboard/mcp-config-modal"
import { useRouter } from "next/navigation"

export default function ClientConnectPage() {
  const router = useRouter()

  const handleClose = () => {
    router.push("/")
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <MCPConfigModal onClose={handleClose} />
    </div>
  )
}
