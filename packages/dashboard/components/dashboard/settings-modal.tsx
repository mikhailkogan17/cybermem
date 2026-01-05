"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useDashboard } from "@/lib/data/dashboard-context"
import { Check, Copy, Eye, EyeOff, Key, Server, Settings, Shield, X } from "lucide-react"
import { useEffect, useState } from "react"

export default function SettingsModal({ onClose }: { onClose: () => void }) {
  const [apiKey, setApiKey] = useState("")
  const [endpoint, setEndpoint] = useState("")
  const [isManaged, setIsManaged] = useState(false)
  const [adminPassword, setAdminPassword] = useState(localStorage.getItem("adminPassword") || "admin")
  const [isLoading, setIsLoading] = useState(true)

  const { isDemo, toggleDemo } = useDashboard()
  const [showApiKey, setShowApiKey] = useState(false)
  const [showAdminPassword, setShowAdminPassword] = useState(false)

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
    setIsLoading(true)
    const localKey = localStorage.getItem("om_api_key")

    fetch("/api/settings")
      .then(res => res.json())
      .then(data => {
        // Enforce Local Mode if server says so
        setIsManaged(data.isManaged || false)

        if (localKey && !data.isManaged) {
            setApiKey(localKey)
        } else {
            setApiKey(data.apiKey !== 'not-set' ? data.apiKey : '')
        }

        let srvEndpoint = data.endpoint
        if (srvEndpoint.includes('localhost') && typeof window !== "undefined" && !window.location.hostname.includes('localhost')) {
            const port = srvEndpoint.split(':').pop()?.split('/')[0] || '8626'
            srvEndpoint = `${window.location.protocol}//${window.location.hostname}:${port}/mcp`
        }
        setEndpoint(srvEndpoint)
        setIsLoading(false)
      })
      .catch(err => {
        console.error("Failed to fetch settings:", err)
        setIsLoading(false)
      })
  }, [])

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
    localStorage.setItem("adminPassword", adminPassword)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#0B1116]/80 backdrop-blur-xl border border-emerald-500/20 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto relative overflow-hidden"
           style={{ backgroundImage: `radial-gradient(circle at 0% 0%, oklch(0.7 0 0 / 0.05) 0%, transparent 50%), radial-gradient(circle at 100% 0%, oklch(0.6 0 0 / 0.05) 0%, transparent 50%), radial-gradient(circle at 100% 100%, oklch(0.65 0 0 / 0.05) 0%, transparent 50%), radial-gradient(circle at 0% 100%, oklch(0.6 0 0 / 0.05) 0%, transparent 50%)` }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-2">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/5 rounded-lg border border-white/10 shadow-inner">
              <Settings className="w-5 h-5 text-white shadow-lg" />
            </div>
            <h2 className="text-xl font-semibold text-white">Settings</h2>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="text-neutral-400 hover:text-white rounded-full">
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Security */}
          <section>
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Security
            </h3>
            <div className="bg-white/5 border border-white/10 rounded-lg p-5 space-y-4 shadow-[inset_0_0_20px_rgba(255,255,255,0.02)] backdrop-blur-sm">
              <div className="space-y-2">
                <Label htmlFor="admin-password">Admin Password</Label>
                <div className="relative">
                  <Input id="admin-password" value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} className="bg-black/40 border-white/10 text-white" type={showAdminPassword ? "text" : "password"} />
                  <button onClick={() => setShowAdminPassword(!showAdminPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white">
                    {showAdminPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* API Configuration */}
          {!isManaged ? (
          <section>
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Key className="w-5 h-5" />
              API Configuration
            </h3>
            <div className="bg-white/5 border border-white/10 rounded-lg p-5 space-y-4 shadow-[inset_0_0_20px_rgba(255,255,255,0.02)] backdrop-blur-sm">
              <div className="space-y-2">
                <Label htmlFor="api-key">Master API Key</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input id="api-key" value={apiKey || "sk-not-generated-yet"} readOnly className="bg-black/40 border-white/10 text-white font-mono" type={showApiKey ? "text" : "password"} />
                    <button onClick={() => setShowApiKey(!showApiKey)} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white">
                      {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <Button size="icon" variant="ghost" onClick={() => copyToClipboard(apiKey, "apikey")}>
                    {copiedId === "apikey" ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
                <div className="flex justify-end pt-2">
                  {showRegenConfirm ? (
                    <div className="flex items-center gap-2">
                      <Input value={regenInputValue} onChange={(e) => setRegenInputValue(e.target.value)} placeholder="Type 'agree'" className="h-8 w-24 text-xs" />
                      <Button size="sm" variant="ghost" onClick={() => setShowRegenConfirm(false)}>Cancel</Button>
                      <Button size="sm" disabled={regenInputValue !== 'agree'} onClick={confirmRegenerate}>Confirm</Button>
                    </div>
                  ) : (
                    <Button size="sm" variant="ghost" onClick={() => setShowRegenConfirm(true)}>Regenerate Key</Button>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="endpoint">Server Endpoint</Label>
                <Input id="endpoint" value={endpoint} onChange={(e) => setEndpoint(e.target.value)} className="bg-black/40 border-white/10 text-white" />
              </div>
            </div>
          </section>
          ) : (
          <section>
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5 text-emerald-400" />
              API Security
            </h3>
            <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-lg p-5 space-y-2 backdrop-blur-sm">
              <p className="text-sm font-medium text-emerald-300">Local Mode Active</p>
              <p className="text-xs text-emerald-200/60">Keyless authentication is active for localhost/local network. Key management is hidden.</p>

              <div className="mt-4 pt-4 border-t border-white/10">
                <Label htmlFor="endpoint" className="text-xs text-neutral-500 mb-2 block">System Endpoint</Label>
                <Input id="endpoint" value={endpoint} readOnly className="h-9 bg-black/40 border-white/10 text-neutral-400 text-sm" />
              </div>
            </div>
          </section>
          )}

          {/* System Info */}
          <section>
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Server className="w-5 h-5" />
              System
            </h3>
            <div className="bg-white/5 border border-white/10 rounded-lg p-5 shadow-[inset_0_0_20px_rgba(255,255,255,0.02)] backdrop-blur-sm">
              <div className="grid grid-cols-2 gap-4">
                <div><span className="text-xs uppercase text-neutral-500 font-semibold">Version</span><p className="text-neutral-200 font-mono mt-1">v0.2.0</p></div>
                <div><span className="text-xs uppercase text-neutral-500 font-semibold">Environment</span><p className="text-emerald-400 font-mono mt-1">Production</p></div>
              </div>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-[#0B1116]/80 backdrop-blur-md border-t border-emerald-500/20 px-6 py-4 flex justify-end gap-3 z-10">
          <Button onClick={onClose} variant="ghost">Cancel</Button>
          <Button onClick={handleSave} className="bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/20">
            {saved ? "Saved!" : "Save Changes"}
          </Button>
        </div>
      </div>
    </div>
  )
}
