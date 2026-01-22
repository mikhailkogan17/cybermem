"use client";

import { Button } from "@/components/ui/button";
import { ConfirmationModal } from "@/components/ui/confirmation-modal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TintButton } from "@/components/ui/tint-button";
import { useDashboard } from "@/lib/data/dashboard-context";
import {
  Check,
  Copy,
  Database,
  Download,
  Eye,
  EyeOff,
  Loader2,
  RotateCcw,
  Server,
  Settings,
  Shield,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";

export default function SettingsModal({ onClose }: { onClose: () => void }) {
  const [apiKey, setApiKey] = useState("");
  const [endpoint, setEndpoint] = useState("");
  const [isManaged, setIsManaged] = useState(false);
  const [settings, setSettings] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const { isDemo, toggleDemo } = useDashboard();
  const [showApiKey, setShowApiKey] = useState(false);

  const [showRegenConfirm, setShowRegenConfirm] = useState(false);
  const [regenInputValue, setRegenInputValue] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [isRestarting, setIsRestarting] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [resetConfirmText, setResetConfirmText] = useState("");
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [operationStatus, setOperationStatus] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Fetch settings from server
  useEffect(() => {
    setIsLoading(true);
    const localKey = localStorage.getItem("om_api_key");

    fetch("/api/settings")
      .then((res) => res.json())
      .then((data) => {
        // Enforce Local Mode if server says so
        setIsManaged(data.isManaged || false);
        setSettings(data);

        if (localKey && !data.isManaged) {
          setApiKey(localKey);
        } else {
          setApiKey(data.apiKey !== "not-set" ? data.apiKey : "");
        }

        let srvEndpoint = data.endpoint;
        if (
          srvEndpoint.includes("localhost") &&
          typeof window !== "undefined" &&
          !window.location.hostname.includes("localhost")
        ) {
          const port = srvEndpoint.split(":").pop()?.split("/")[0] || "8626";
          srvEndpoint = `${window.location.protocol}//${window.location.hostname}:${port}/mcp`;
        }
        setEndpoint(srvEndpoint);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error("Failed to fetch settings:", err);
        setIsLoading(false);
      });
  }, []);

  const confirmRegenerate = async () => {
    try {
      const res = await fetch("/api/settings/regenerate", { method: "POST" });
      if (!res.ok) throw new Error("Failed to regenerate key");
      const data = await res.json();

      const newKey = data.apiKey;
      setApiKey(newKey);
      localStorage.setItem("om_api_key", newKey);
      setShowApiKey(true);
      setShowRegenConfirm(false);
      setRegenInputValue("");
    } catch (e) {
      console.error(e);
      alert("Failed to regenerate key on server.");
    }
  };

  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    // Settings saved
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleBackup = async () => {
    try {
      setIsBackingUp(true);
      const res = await fetch("/api/backup");
      if (!res.ok) throw new Error("Backup failed");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `cybermem-backup-${new Date().toISOString().split("T")[0]}.tar.gz`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      setOperationStatus({
        type: "success",
        message: "Backup downloaded successfully",
      });
    } catch (err: any) {
      setOperationStatus({ type: "error", message: err.message });
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsRestoring(true);
      const formData = new FormData();
      formData.append("backup", file);

      const res = await fetch("/api/restore", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Restore failed");

      setOperationStatus({
        type: "success",
        message: "Database restored. Restart required.",
      });
    } catch (err: any) {
      setOperationStatus({ type: "error", message: err.message });
    } finally {
      setIsRestoring(false);
      // Reset input
      e.target.value = "";
    }
  };

  const handleRestart = async () => {
    try {
      setIsRestarting(true);
      const res = await fetch("/api/system/restart", { method: "POST" });
      if (!res.ok) throw new Error("Restart failed");
      setOperationStatus({
        type: "success",
        message: "System is restarting...",
      });
    } catch (err: any) {
      setOperationStatus({ type: "error", message: err.message });
    } finally {
      setIsRestarting(false);
    }
  };

  const handleReset = async () => {
    if (resetConfirmText !== "RESET") return;

    try {
      setIsResetting(true);
      const res = await fetch("/api/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: "RESET" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Reset failed");

      setShowResetConfirm(false);
      setResetConfirmText("");
      setOperationStatus({
        type: "success",
        message: "Database wiped successfully.",
      });
    } catch (err: any) {
      setOperationStatus({ type: "error", message: err.message });
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div
        className="bg-[#0B1116]/80 backdrop-blur-xl border border-emerald-500/20 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto relative overflow-hidden"
        style={{
          backgroundImage: `radial-gradient(circle at 0% 0%, oklch(0.7 0 0 / 0.05) 0%, transparent 50%), radial-gradient(circle at 100% 0%, oklch(0.6 0 0 / 0.05) 0%, transparent 50%), radial-gradient(circle at 100% 100%, oklch(0.65 0 0 / 0.05) 0%, transparent 50%), radial-gradient(circle at 0% 100%, oklch(0.6 0 0 / 0.05) 0%, transparent 50%)`,
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-2">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/5 rounded-lg border border-white/10 shadow-inner">
              <Settings className="w-5 h-5 text-white shadow-lg" />
            </div>
            <h2 className="text-xl font-semibold text-white">Settings</h2>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-neutral-400 hover:text-white rounded-full"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Access Token */}
          <section>
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Access Token
            </h3>
            <div className="bg-white/5 border border-white/10 rounded-lg p-5 space-y-4 shadow-[inset_0_0_20px_rgba(255,255,255,0.02)] backdrop-blur-sm">
              {/* Token Display with inline regenerate */}
              <div className="space-y-2">
                <Label htmlFor="access-token">Your Access Token</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      id="access-token"
                      value={apiKey || "Token not generated yet"}
                      readOnly
                      className="bg-black/40 border-white/10 text-white font-mono text-sm pr-10"
                      type={showApiKey ? "text" : "password"}
                    />
                    <button
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
              <div className="pt-4 border-t border-white/10">
                <div className="flex items-center gap-3 p-3 bg-black/20 rounded-lg border border-white/5">
                  {isManaged ? (
                    <>
                      <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                      <div className="flex-1">
                        <p className="text-sm text-emerald-300 font-medium">
                          Local Mode Active
                        </p>
                        <p className="text-xs text-neutral-500">
                          No token needed for local connections
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="w-2 h-2 bg-yellow-400 rounded-full" />
                      <div className="flex-1">
                        <p className="text-sm text-yellow-300 font-medium">
                          Remote Mode
                        </p>
                        <p className="text-xs text-neutral-500">
                          Token required for MCP client connections
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* Data Management */}
          <section>
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Database className="w-5 h-5" />
              Data Management
            </h3>
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <TintButton
                  tint="neutral"
                  variant="solid"
                  className="flex-1 h-11"
                  onClick={handleBackup}
                  disabled={isBackingUp}
                >
                  {isBackingUp ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  Backup
                </TintButton>

                <div className="flex-1 relative">
                  <input
                    type="file"
                    id="restore-file"
                    className="hidden"
                    accept=".tar.gz,.tgz"
                    onChange={handleRestore}
                    disabled={isRestoring}
                  />
                  <TintButton
                    tint="neutral"
                    variant="solid"
                    className="w-full h-11"
                    onClick={() =>
                      document.getElementById("restore-file")?.click()
                    }
                    disabled={isRestoring}
                  >
                    {isRestoring ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4" />
                    )}
                    Restore
                  </TintButton>
                </div>

                <TintButton
                  tint="red"
                  variant="solid"
                  className="flex-1 h-11"
                  onClick={() => setShowResetConfirm(true)}
                  disabled={isResetting}
                >
                  <Trash2 className="w-4 h-4" />
                  Reset DB
                </TintButton>
              </div>

              {operationStatus && (
                <div
                  className={`p-3 rounded-xl text-sm flex items-center gap-3 animate-in fade-in slide-in-from-top-1 ${
                    operationStatus.type === "success"
                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                      : "bg-red-500/10 text-red-400 border border-red-500/20"
                  }`}
                >
                  {operationStatus.type === "success" ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <X className="w-4 h-4" />
                  )}
                  <span className="flex-1">{operationStatus.message}</span>
                  <button
                    onClick={() => setOperationStatus(null)}
                    className="opacity-50 hover:opacity-100 p-1"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </section>

          {/* System Info */}
          <section>
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Server className="w-5 h-5" />
              System
            </h3>
            <div className="bg-white/5 border border-white/10 rounded-xl p-6 shadow-[inset_0_0_30px_rgba(255,255,255,0.01)] backdrop-blur-md space-y-6">
              <div className="grid grid-cols-2 gap-12">
                <div className="space-y-4">
                  <span className="text-[10px] uppercase text-neutral-500 font-bold tracking-[0.2em] block mb-2">
                    Versions
                  </span>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center group/version">
                      <span className="text-xs text-neutral-400 group-hover/version:text-neutral-300 transition-colors">
                        Dashboard
                      </span>
                      <code className="text-[13px] font-mono text-neutral-200 bg-white/5 px-2 py-0.5 rounded border border-white/10 group-hover/version:border-emerald-500/30 group-hover/version:text-emerald-400 transition-all">
                        {settings?.dashboardVersion || "v0.7.5"}
                      </code>
                    </div>
                    <div className="flex justify-between items-center group/version">
                      <span className="text-xs text-neutral-400 group-hover/version:text-neutral-300 transition-colors">
                        MCP Server
                      </span>
                      <code className="text-[13px] font-mono text-neutral-200 bg-white/5 px-2 py-0.5 rounded border border-white/10 group-hover/version:border-emerald-500/30 group-hover/version:text-emerald-400 transition-all">
                        {settings?.mcpVersion || "v0.7.5"}
                      </code>
                    </div>
                  </div>
                </div>
                <div className="border-l border-white/5 pl-8">
                  <span className="text-[10px] uppercase text-neutral-500 font-bold tracking-[0.2em] block mb-2">
                    Environment
                  </span>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-neutral-400">Status</span>
                      <code className="text-[13px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                        Production
                      </code>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-neutral-400">Instance</span>
                      <code className="text-[13px] font-mono text-neutral-200 bg-white/5 px-2 py-0.5 rounded border border-white/10">
                        {settings?.isLocal
                          ? "Local"
                          : settings?.isManaged
                            ? "RPi"
                            : "VPS"}
                      </code>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-white/5">
                <TintButton
                  tint="sky"
                  variant="solid"
                  className="w-full h-10"
                  onClick={handleRestart}
                  disabled={isRestarting}
                >
                  {isRestarting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <RotateCcw className="w-4 h-4" />
                  )}
                  {isRestarting ? "Restarting..." : "Restart Service"}
                </TintButton>
              </div>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-[#0B1116]/80 backdrop-blur-md border-t border-emerald-500/20 px-6 py-4 flex justify-end gap-3 z-10">
          <TintButton tint="neutral" variant="ghost" onClick={onClose}>
            Close
          </TintButton>
        </div>
      </div>

      {/* Regenerate Token Confirmation Modal */}
      <ConfirmationModal
        isOpen={showRegenConfirm}
        onClose={() => {
          setShowRegenConfirm(false);
          setRegenInputValue("");
        }}
        onConfirm={confirmRegenerate}
        title="Regenerate Access Token"
        description="This will invalidate your current token. All connected MCP clients will need to be reconfigured with the new token."
        confirmText="Regenerate"
        confirmWord="confirm"
        tint="yellow"
      />

      {/* Reset Database Confirmation Modal */}
      <ConfirmationModal
        isOpen={showResetConfirm}
        onClose={() => {
          setShowResetConfirm(false);
          setResetConfirmText("");
        }}
        onConfirm={handleReset}
        title="Reset Database"
        description="This will permanently delete ALL memories and cannot be undone. Make sure you have a backup!"
        confirmText="Reset Database"
        confirmWord="RESET"
        tint="red"
        isLoading={isResetting}
      />
    </div>
  );
}
