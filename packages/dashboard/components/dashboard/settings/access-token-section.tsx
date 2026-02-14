"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TintButton } from "@/components/ui/tint-button";
import { Check, Copy, Eye, EyeOff, RotateCcw, Shield } from "lucide-react";

interface AccessTokenSectionProps {
  apiKey: string;
  apiKeyMasked: string;
  showApiKey: boolean;
  setShowApiKey: (show: boolean) => void;
  copiedId: string | null;
  copyToClipboard: (text: string, id: string) => void;
  setShowRegenConfirm: (show: boolean) => void;
  isManaged: boolean;
  instanceType: "local" | "rpi" | "vps";
}

export default function AccessTokenSection({
  apiKey,
  apiKeyMasked,
  showApiKey,
  setShowApiKey,
  copiedId,
  copyToClipboard,
  setShowRegenConfirm,
  isManaged,
  instanceType,
}: AccessTokenSectionProps) {
  return (
    <section>
      <h3 className="text-sm font-medium text-neutral-400 uppercase tracking-widest mb-4 flex items-center gap-2">
        <Shield className="w-4 h-4" />
        Access Token
      </h3>
      <div className="bg-white/[0.032] border-[0.5px] border-white/10 rounded-2xl p-6 space-y-4">
        {/* Token Display */}
        <div className="space-y-2">
          <Label htmlFor="access-token">Your Access Token</Label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input
                id="access-token"
                value={
                  (showApiKey ? apiKey : apiKeyMasked) ||
                  "Token not generated yet"
                }
                readOnly
                className="bg-black/40 border-[0.5px] border-white/10 text-white font-mono text-sm pr-10"
                type={showApiKey ? "text" : "password"}
              />
              <button
                data-testid="toggle-visibility"
                onClick={() => setShowApiKey(!showApiKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white"
              >
                {showApiKey ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
            <TintButton
              tint="neutral"
              variant="ghost"
              size="icon"
              onClick={() => copyToClipboard(apiKey, "accesstoken")}
              title="Copy token"
            >
              {copiedId === "accesstoken" ? (
                <Check className="h-4 w-4 text-emerald-400" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </TintButton>
            <TintButton
              tint="yellow"
              variant="ghost"
              size="icon"
              onClick={() => setShowRegenConfirm(true)}
              title="Regenerate token"
            >
              <RotateCcw className="w-4 h-4" />
            </TintButton>
          </div>
          <p className="text-xs text-neutral-500">
            Use this token to connect MCP clients from other devices
          </p>
        </div>

        {/* Auth Status */}
        <div className="pt-4 border-t border-white/5">
          <div className="flex items-center gap-3 p-3 bg-white/10 rounded-xl border-[0.5px] border-white/10">
            {isManaged ? (
              <>
                <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                <div className="flex-1">
                  <p className="text-sm text-emerald-300 font-medium">
                    {instanceType === "local"
                      ? "Local Mode Active"
                      : "LAN / RPi Mode Active"}
                  </p>
                  <p className="text-xs text-white/70">
                    {instanceType === "local"
                      ? "No token needed for local connections"
                      : "Connect from other devices using the secure token"}
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="w-2 h-2 bg-yellow-400 rounded-full" />
                <div className="flex-1">
                  <p className="text-sm text-yellow-300 font-medium">
                    {instanceType === "rpi"
                      ? "LAN / RPi Mode"
                      : instanceType === "vps"
                        ? "Cloud Mode"
                        : "Remote Mode"}
                  </p>
                  <p className="text-xs text-white/70">
                    {instanceType === "rpi"
                      ? "Connecting from your laptop to RPi"
                      : "Token required for remote MCP connections"}
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
