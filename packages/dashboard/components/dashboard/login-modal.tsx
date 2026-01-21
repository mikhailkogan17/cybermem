"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Key, LogIn } from "lucide-react";
import { useEffect, useState } from "react";

interface LoginModalProps {
  onLogin: (token: string) => void;
}

export default function LoginModal({ onLogin }: LoginModalProps) {
  const [token, setToken] = useState("");
  const [error, setError] = useState("");
  const [isLocal, setIsLocal] = useState(true);

  useEffect(() => {
    // Auto-login on localhost
    const hostname = window.location.hostname;
    const local =
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname.includes("raspberrypi.local") ||
      hostname.endsWith(".local");
    setIsLocal(local);

    if (local) {
      // Auto-login for local access
      onLogin("local-bypass");
    }
  }, [onLogin]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!token.trim()) {
      setError("Please enter your access token");
      return;
    }

    // For remote access, use the token
    onLogin(token);
    setError("");
  };

  // Don't show modal for local access (auto-login)
  if (isLocal) {
    return null;
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
          `,
        }}
      >
        {/* Header */}
        <div className="px-6 pt-8 pb-6 text-center">
          <div className="inline-flex p-3 bg-emerald-500/10 rounded-full border border-emerald-500/20 mb-4">
            <Key className="w-8 h-8 text-emerald-400 drop-shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
          </div>
          <h2 className="text-2xl font-bold text-white text-shadow-sm mb-2">
            CyberMem Dashboard
          </h2>
          <p className="text-neutral-400 text-sm">
            Enter your access token to continue
          </p>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="token" className="text-neutral-200">
              Access Token
            </Label>
            <Input
              id="token"
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="sk-xxxxxxxxxxxxxxxx"
              className="bg-black/40 border-white/10 text-white focus-visible:border-emerald-500/30 focus-visible:ring-emerald-500/10 placeholder:text-neutral-600 shadow-inner font-mono"
              autoFocus
            />
            {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
          </div>

          <Button
            type="submit"
            className="w-full bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/20 text-emerald-400 font-medium transition-colors gap-2"
          >
            <LogIn className="w-4 h-4" />
            Login
          </Button>

          <p className="text-xs text-neutral-500 text-center pt-2">
            Find your access token in Dashboard Settings (from localhost)
          </p>
        </form>
      </div>
    </div>
  );
}
