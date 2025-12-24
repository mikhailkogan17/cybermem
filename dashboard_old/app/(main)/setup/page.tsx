"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Eye, EyeOff, Key, Lock, RefreshCw, Save } from "lucide-react"
import { useEffect, useState } from "react"

export default function SettingsPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [passwords, setPasswords] = useState({
    new: "",
    confirm: ""
  })
  const [apiKey, setApiKey] = useState("Loading...")

  useEffect(() => {
    fetch("/api/config")
      .then(res => res.json())
      .then(data => {
        if (data.apiKey) setApiKey(data.apiKey)
      })
      .catch(err => console.error("Failed to load config:", err))
  }, [])

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPasswords({ ...passwords, [e.target.name]: e.target.value })
  }

  const handleSavePassword = () => {
    // TODO: Implement password change logic
    console.log("Saving password:", passwords.new)
  }

  const handleRegenerateKey = async () => {
    const newKey = "cm_sk_live_" + Math.random().toString(36).substring(2)
    setApiKey(newKey)

    try {
      await fetch("/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: newKey })
      })
    } catch (err) {
      console.error("Failed to save new API key:", err)
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">
          Settings
        </h1>
        <p className="text-white/60 mt-2">Manage your CyberMem instance configuration.</p>
      </div>

      {/* Admin Password Section */}
      <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-emerald-400" />
            <CardTitle className="text-white">Admin Password</CardTitle>
          </div>
          <CardDescription className="text-white/60">
            Update the password used to access this dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-white">New Password</Label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  name="new"
                  value={passwords.new}
                  onChange={handlePasswordChange}
                  className="bg-black/20 border-white/10 text-white pr-10"
                  placeholder="Enter new password"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 text-white/40 hover:text-white"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-white">Confirm Password</Label>
              <Input
                type="password"
                name="confirm"
                value={passwords.confirm}
                onChange={handlePasswordChange}
                className="bg-black/20 border-white/10 text-white"
                placeholder="Confirm new password"
              />
            </div>
          </div>
          <div className="flex justify-end pt-2">
            <Button
              onClick={handleSavePassword}
              className="bg-emerald-600 hover:bg-emerald-500 text-white gap-2"
              disabled={!passwords.new || passwords.new !== passwords.confirm}
            >
              <Save className="h-4 w-4" />
              Update Password
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* API Key Section */}
      <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Key className="h-5 w-5 text-emerald-400" />
            <CardTitle className="text-white">API Key</CardTitle>
          </div>
          <CardDescription className="text-white/60">
            Manage access keys for the CyberMem API.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex gap-2">
              <Input
                value={apiKey}
                readOnly
                className="bg-black/20 border-white/10 text-white font-mono"
              />
              <Button
                className="bg-white text-black hover:bg-gray-200 gap-2 font-medium"
                onClick={handleRegenerateKey}
              >
                <RefreshCw className="h-4 w-4" />
                Regenerate
              </Button>
            </div>
            <p className="text-xs text-white/40">
              This key grants full access to all memory operations. Keep it secure.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
