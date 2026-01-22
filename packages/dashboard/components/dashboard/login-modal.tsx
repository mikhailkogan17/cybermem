"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TintButton } from "@/components/ui/tint-button";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { HelpCircle, Key, LogIn } from "lucide-react";
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
      setError("Please enter your API token");
      return;
    }

    if (!token.startsWith("sk-")) {
      setError("Token should start with 'sk-'");
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
            Remote access requires API token authentication
          </p>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label htmlFor="token" className="text-neutral-200">
                API Token
              </Label>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className="text-neutral-500 hover:text-emerald-400 transition-colors"
                  >
                    <HelpCircle className="w-4 h-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs bg-neutral-900 border-neutral-700 text-neutral-200">
                  <p className="text-xs">
                    Find your token in{" "}
                    <code className="text-emerald-400">~/.cybermem/.env</code>{" "}
                    or check the terminal output from{" "}
                    <code className="text-emerald-400">cybermem up</code>
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>
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

          <TintButton
            type="submit"
            tint="emerald"
            variant="solid"
            className="w-full h-11"
          >
            <LogIn className="w-4 h-4" />
            Login with Token
          </TintButton>

          <div className="text-xs text-neutral-500 text-center pt-2 space-y-1">
            <p>
              <strong className="text-neutral-400">
                Where to find your token:
              </strong>
            </p>
            <p>
              1. Open Dashboard from{" "}
              <code className="text-emerald-400/80">localhost:3000</code> or{" "}
              <code className="text-emerald-400/80">
                raspberrypi.local:3000
              </code>
            </p>
            <p>2. Go to Settings → Access Token → Copy</p>
          </div>
        </form>
      </div>
    </div>
  );
}
