"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Eye, EyeOff, Key, RefreshCw, Save, Server, Settings, Shield, X } from "lucide-react"
import { useState } from "react"

export default function SettingsModal({ onClose }: { onClose: () => void }) {
  const [apiKey, setApiKey] = useState("sk-cybermem-master-key-8f7a2b9c")
  const [endpoint, setEndpoint] = useState("http://localhost:8080")
  const [adminPassword, setAdminPassword] = useState(localStorage.getItem("adminPassword") || "admin")

  const [showApiKey, setShowApiKey] = useState(false)
  const [showAdminPassword, setShowAdminPassword] = useState(false)
  const [saved, setSaved] = useState(false)

  const generateApiKey = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
    const randomPart = Array.from({ length: 16 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
    const newKey = `sk-cybermem-${randomPart}`
    setApiKey(newKey)
    setShowApiKey(true) // Automatically show the new key
  }

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
                      className="bg-black/40 border-white/10 text-white focus:border-emerald-500/50 focus:ring-emerald-500/20 placeholder:text-neutral-600 shadow-inner pr-10"
                      type={showAdminPassword ? "text" : "password"}
                    />
                    <button
                      type="button"
                      onClick={() => setShowAdminPassword(!showAdminPassword)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white transition-colors"
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
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      className="bg-black/40 border-white/10 text-white focus:border-emerald-500/50 focus:ring-emerald-500/20 placeholder:text-neutral-600 shadow-inner pr-10"
                      type={showApiKey ? "text" : "password"}
                    />
                    <button
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white transition-colors"
                    >
                      {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <Button
                    onClick={generateApiKey}
                    className="bg-white/5 hover:bg-white/10 border border-white/10 text-white transition-colors hover:shadow-[0_0_10px_rgba(255,255,255,0.1)] gap-2"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Regenerate
                  </Button>
                </div>
                <p className="text-xs text-neutral-500">Used for administrative access to OpenMemory</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="endpoint" className="text-neutral-200">Server Endpoint</Label>
                <div className="flex gap-2">
                  <Input
                    id="endpoint"
                    value={endpoint}
                    onChange={(e) => setEndpoint(e.target.value)}
                    className="bg-black/40 border-white/10 text-white focus:border-emerald-500/50 focus:ring-emerald-500/20 placeholder:text-neutral-600 shadow-inner"
                  />
                </div>
                <p className="text-xs text-neutral-500">URL of the OpenMemory backend instance</p>
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
