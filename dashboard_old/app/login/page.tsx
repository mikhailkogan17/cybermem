"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Lock } from "lucide-react"

export default function LoginPage() {
  const [password, setPassword] = useState("")
  const [error, setError] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(false)

    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      })

      if (res.ok) {
        router.refresh() // Refresh to update middleware/server components
      } else {
        setError(true)
      }
    } catch (err) {
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4">
      <Card className="w-full max-w-md bg-white/5 border-white/10 backdrop-blur-xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-black">
            <Lock className="h-6 w-6" />
          </div>
          <CardTitle className="text-2xl text-white">Admin Access</CardTitle>
          <CardDescription className="text-white/60">
            Enter the admin password to continue.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`bg-black/20 border-white/10 text-white ${error ? "border-red-500" : ""}`}
            />
            {error && <p className="text-sm text-red-400">Invalid password</p>}
            <Button 
              type="submit" 
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white"
              disabled={loading}
            >
              {loading ? "Checking..." : "Unlock"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
