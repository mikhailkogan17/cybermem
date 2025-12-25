"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Lock, LogIn } from "lucide-react"
import { useState } from "react"

interface LoginModalProps {
  onLogin: (password: string) => void
}

export default function LoginModal({ onLogin }: LoginModalProps) {
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // Get admin password from localStorage or use default
    const adminPassword = localStorage.getItem("adminPassword") || "admin"

    if (password === adminPassword) {
      onLogin(password)
      setError("")
    } else {
      setError("Incorrect password")
      setPassword("")
    }
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <div
        className="bg-[#0B1116]/90 backdrop-blur-xl border border-emerald-500/20 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
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
        <div className="px-6 pt-8 pb-6 text-center">
          <div className="inline-flex p-3 bg-emerald-500/10 rounded-full border border-emerald-500/20 mb-4">
            <Lock className="w-8 h-8 text-emerald-400 drop-shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
          </div>
          <h2 className="text-2xl font-bold text-white text-shadow-sm mb-2">CyberMem Dashboard</h2>
          <p className="text-neutral-400 text-sm">Enter admin password to continue</p>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password" className="text-neutral-200">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter admin password"
              className="bg-black/40 border-white/10 text-white focus:border-emerald-400/30 focus:ring-emerald-400/10 placeholder:text-neutral-600 shadow-inner"
              autoFocus
            />
            {error && (
              <p className="text-red-400 text-sm mt-2">{error}</p>
            )}
          </div>

          <Button
            type="submit"
            className="w-full bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/20 text-emerald-400 font-medium transition-colors gap-2"
          >
            <LogIn className="w-4 h-4" />
            Login
          </Button>

          <p className="text-xs text-neutral-500 text-center mt-4">
            Default password: <code className="text-emerald-400 bg-emerald-500/10 px-1 py-0.5 rounded">admin</code>
          </p>
        </form>
      </div>
    </div>
  )
}
