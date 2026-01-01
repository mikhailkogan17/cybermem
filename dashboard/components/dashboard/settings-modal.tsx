"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useDashboard } from "@/lib/data/dashboard-context"
import { Check, Copy, Eye, EyeOff, Key, Save, Server, Settings, Shield, X } from "lucide-react"
import { useEffect, useState } from "react"

export default function SettingsModal({ onClose }: { onClose: () => void }) {
  const [apiKey, setApiKey] = useState("")
  const [endpoint, setEndpoint] = useState("")
  const [adminPassword, setAdminPassword] = useState(localStorage.getItem("adminPassword") || "admin")
  const [isLoading, setIsLoading] = useState(true)

  const { isDemo, toggleDemo } = useDashboard()
  const [showApiKey, setShowApiKey] = useState(false)
  const [showAdminPassword, setShowAdminPassword] = useState(false)
  /* Demo mode controlled by context now */

  const [showRegenConfirm, setShowRegenConfirm] = useState(false)
  const [regenInputValue, setRegenInputValue] = useState("")
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  // Fetch settings from server
  useEffect(() => {
    // Try to get key from local storage first (simulating persistence)
    const localKey = localStorage.getItem("om_api_key")
    if (localKey) {
        setApiKey(localKey)
        fetch("/api/settings")
            .then(res => res.json())
            .then(data => {
                let srvEndpoint = data.endpoint
                if (srvEndpoint.includes('localhost') && typeof window !== "undefined" && !window.location.hostname.includes('localhost')) {
                   srvEndpoint = `${window.location.protocol}//${window.location.hostname}:8080`
                }
                setEndpoint(srvEndpoint)
                setIsLoading(false)
            })
            .catch(err => setIsLoading(false))
    } else {
        fetch("/api/settings")
          .then(res => res.json())
          .then(data => {
            setApiKey(data.apiKey !== 'not-set' ? data.apiKey : '')
            let srvEndpoint = data.endpoint
            if (srvEndpoint.includes('localhost') && typeof window !== "undefined" && !window.location.hostname.includes('localhost')) {
               srvEndpoint = `${window.location.protocol}//${window.location.hostname}:8080`
            }
            setEndpoint(srvEndpoint)
            setIsLoading(false)
          })
          .catch(err => {
            console.error("Failed to fetch settings:", err)
            setIsLoading(false)
          })
    }
  }, [])

  const generateApiKey = () => {
    // Legacy direct generation - now just triggers the confirmation flow if button linked here
    // But the button in UI calls setShowRegenConfirm(true) directly.
    // We can keep this empty or redirect.
  }

  const confirmRegenerate = async () => {
    try {
        const res = await fetch('/api/settings/regenerate', { method: 'POST' })
        if (!res.ok) throw new Error('Failed to regenerate key')
        const data = await res.json()

        const newKey = data.apiKey
        setApiKey(newKey)
        localStorage.setItem("om_api_key", newKey)
        setShowApiKey(true)
        setShowRegenConfirm(false)
        setRegenInputValue("")
    } catch (e) {
        console.error(e)
        alert("Failed to regenerate key on server.")
    }
  }

  const [saved, setSaved] = useState(false)

  const handleSave = () => {
    // Save admin password to localStorage
    localStorage.setItem("adminPassword", adminPassword)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div
        className="bg-[#0B1116]/80 backdrop-blur-xl border border-emerald-500/20 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto relative overflow-hidden"
        style={{
          backgroundImage: `
            radial-gradient(circle at 0% 0%, oklch(0.7 0 0 / 0.05) 0%, transparent 50%),
            radial-gradient(circle at 100% 0%, oklch(0.6 0 0 / 0.05) 0%, transparent 50%),
            radial-gradient(circle at 100% 100%, oklch(0.65 0 0 / 0.05) 0%, transparent 50%),
            radial-gradient(circle at 0% 100%, oklch(0.6 0 0 / 0.05) 0%, transparent 50%)
          `
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-2">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/5 rounded-lg border border-white/10 shadow-inner">
              <Settings className="w-5 h-5 text-white drop-shadow-[0_0_5px_rgba(255,255,255,0.3)]" />
            </div>
            <h2 className="text-xl font-semibold text-white text-shadow-sm">Settings</h2>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-neutral-400 hover:text-white hover:bg-white/10 rounded-full"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Security */}
          <section>
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2 text-shadow-sm">
              <Shield className="w-5 h-5 text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]" />
              Security
            </h3>
            <div className="bg-white/5 border border-white/10 rounded-lg p-5 space-y-4 shadow-[inset_0_0_20px_rgba(255,255,255,0.02)] backdrop-blur-sm">
              <div className="space-y-2">
                <Label htmlFor="admin-password" className="text-neutral-200">Admin Password</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      id="admin-password"
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      className="bg-black/40 border-white/10 text-white focus-visible:border-emerald-500/30 focus-visible:ring-emerald-500/10 placeholder:text-neutral-600 shadow-inner pr-10"
                      type={showAdminPassword ? "text" : "password"}
                    />
                    <button
                      type="button"
                      onClick={() => setShowAdminPassword(!showAdminPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white transition-colors"
                    >
                      {showAdminPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <p className="text-xs text-neutral-500">Used to access the dashboard</p>
              </div>
            </div>
          </section>

          {/* API Configuration */}
          <section>
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2 text-shadow-sm">
              <Key className="w-5 h-5 text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]" />
              API Configuration
            </h3>
            <div className="bg-white/5 border border-white/10 rounded-lg p-5 space-y-4 shadow-[inset_0_0_20px_rgba(255,255,255,0.02)] backdrop-blur-sm">
              <div className="space-y-2">
                <Label htmlFor="api-key" className="text-neutral-200">Master API Key</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      id="api-key"
                      value={apiKey || "sk-not-generated-yet"}
                      readOnly
                      className="bg-black/40 border-white/10 text-white focus-visible:border-emerald-500/30 focus-visible:ring-emerald-500/10 placeholder:text-neutral-600 shadow-inner pr-10 font-mono"
                      type={showApiKey ? "text" : "password"}
                    />
                     <button
                        type="button"
                        onClick={() => setShowApiKey(!showApiKey)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white transition-colors"
                      >
                        {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <Button
                      size="icon"
                      variant="ghost"
                      className="h-10 w-10 border border-white/10 bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white"
                      onClick={() => copyToClipboard(apiKey, "apikey")}
                      title="Copy API Key"
                    >
                      {copiedId === "apikey" ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>

                {/* Regeneration Controls */}
                <div className="flex justify-end pt-2">
                   {showRegenConfirm ? (
                       <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-4 duration-200">
                           <span className="text-xs text-red-400 font-medium">Warning: This will disconnect all existing clients.</span>
                           <Input
                                value={regenInputValue}
                                onChange={(e) => setRegenInputValue(e.target.value)}
                                placeholder="Type 'agree'"
                                className="h-8 w-28 bg-red-500/10 border-red-500/30 text-red-200 text-xs placeholder:text-red-500/30 focus-visible:border-red-500/50"
                           />
                           <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 px-3 text-neutral-400 hover:text-white hover:bg-white/10"
                                onClick={() => {
                                    setShowRegenConfirm(false)
                                    setRegenInputValue("")
                                }}
                           >
                               Cancel
                           </Button>
                           <Button
                                size="sm"
                                disabled={regenInputValue !== 'agree'}
                                className="h-8 px-3 bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                                onClick={confirmRegenerate}
                           >
                               Confirm
                           </Button>
                       </div>
                   ) : (
                        <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 px-2 text-neutral-400 hover:text-white hover:bg-white/10"
                            onClick={() => setShowRegenConfirm(true)}
                        >
                            Regenerate Key
                        </Button>
                   )}
                </div>
                <p className="text-xs text-neutral-500">Your master secret key for all MCP clients</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="endpoint" className="text-neutral-200">Server Endpoint</Label>
                <div className="flex gap-2">
                  <Input
                    id="endpoint"
                    value={endpoint}
                    onChange={(e) => setEndpoint(e.target.value)}
                    className="bg-black/40 border-white/10 text-white focus-visible:border-emerald-500/30 focus-visible:ring-emerald-500/10 placeholder:text-neutral-600 shadow-inner"
                  />
                </div>
                <p className="text-xs text-neutral-500">URL of the OpenMemory backend instance</p>
              </div>

              <div className="pt-2 border-t border-white/10">
                  <Button
                    variant="destructive"
                    className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20"
                    onClick={async () => {
                        if(!confirm("Are you sure you want to restart the OpenMemory server?")) return;
                        try {
                            const res = await fetch('/api/system/restart', { method: 'POST' })
                            if(res.ok) alert("Server restarting... Please wait a moment.")
                            else alert("Failed to restart server")
                        } catch(e) {
                            alert("Error triggering restart")
                        }
                    }}
                  >
                      Restart Server
                  </Button>
              </div>
            </div>
          </section>

          {/* System Info */}
          <section>
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2 text-shadow-sm">
              <Server className="w-5 h-5 text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]" />
              System
            </h3>
            <div className="bg-white/5 border border-white/10 rounded-lg p-5 shadow-[inset_0_0_20px_rgba(255,255,255,0.02)] backdrop-blur-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                    <span className="text-xs uppercase tracking-wider text-neutral-500 font-semibold">Version</span>
                    <p className="text-neutral-200 font-mono mt-1">v0.1.0-beta</p>
                </div>
                <div>
                    <span className="text-xs uppercase tracking-wider text-neutral-500 font-semibold">Environment</span>
                    <p className="text-emerald-400 font-mono mt-1 text-shadow-emerald">Production</p>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between">
                 <div>
                    <label htmlFor="demo-mode" className="text-neutral-200 font-medium block">Demo Mode</label>
                    <p className="text-xs text-neutral-500 mt-1">Generate simulated traffic for demonstration</p>
                 </div>
                 <div className="relative inline-block w-12 h-6 transition duration-200 ease-in-out rounded-full border border-white/10">
                     <input
                        type="checkbox"
                        id="demo-mode"
                        className="peer absolute w-0 h-0 opacity-0"
                        checked={isDemo}
                        onChange={toggleDemo}
                    />
                    <label
                        htmlFor="demo-mode"
                        className={`block w-full h-full rounded-full cursor-pointer transition-colors duration-300 ${isDemo ? "bg-emerald-500/30" : "bg-black/40"}`}
                    ></label>
                    <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-md transform transition-transform duration-300 ${isDemo ? "translate-x-6 bg-emerald-100" : "translate-x-0 bg-neutral-400"}`}></div>
                 </div>
              </div>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-[#0B1116]/80 backdrop-blur-md border-t border-emerald-500/20 px-6 py-4 flex justify-end gap-3 z-10">
          <Button
            onClick={onClose}
            className="bg-white/5 hover:bg-white/10 border border-white/10 text-neutral-300 transition-colors"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            className={`border font-medium transition-colors gap-2 ${
              saved
                ? "bg-emerald-500/30 border-emerald-500/30 text-emerald-300"
                : "bg-emerald-500/20 hover:bg-emerald-500/30 border-emerald-500/20 text-emerald-400"
            }`}
          >
            <Save className="w-4 h-4" />
            {saved ? "Saved!" : "Save Changes"}
          </Button>
        </div>
      </div>
    </div>
  )
}
