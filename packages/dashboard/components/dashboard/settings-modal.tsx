"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
              {/* Token Display */}
              <div className="space-y-2">
                <Label htmlFor="access-token">Your Access Token</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      id="access-token"
                      value={apiKey || "Token not generated yet"}
                      readOnly
                      className="bg-black/40 border-white/10 text-white font-mono text-sm"
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
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => copyToClipboard(apiKey, "accesstoken")}
                    className="text-neutral-400 hover:text-white"
                  >
                    {copiedId === "accesstoken" ? (
                      <Check className="h-4 w-4 text-emerald-400" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-neutral-500">
                  Use this token to connect MCP clients from other devices
                </p>
              </div>

              {/* Regenerate */}
              <div className="pt-2 border-t border-white/10">
                {showRegenConfirm ? (
                  <div className="flex items-center gap-2">
                    <Input
                      value={regenInputValue}
                      onChange={(e) => setRegenInputValue(e.target.value)}
                      placeholder="Type 'confirm'"
                      className="h-8 flex-1 text-xs bg-black/40 border-white/10"
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setShowRegenConfirm(false);
                        setRegenInputValue("");
                      }}
                      className="text-neutral-400"
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      disabled={regenInputValue !== "confirm"}
                      onClick={confirmRegenerate}
                      className="bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30"
                    >
                      Regenerate
                    </Button>
                  </div>
                ) : (
                  <div className="flex justify-between items-center">
                    <p className="text-xs text-neutral-500">
                      Regenerating will invalidate your current token
                    </p>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setShowRegenConfirm(true)}
                      className="text-yellow-400 hover:bg-yellow-500/10"
                    >
                      <RotateCcw className="w-3 h-3 mr-1" />
                      Regenerate Token
                    </Button>
                  </div>
                )}
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
                <Button
                  variant="outline"
                  className="flex-1 justify-center bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20 text-white hover:text-white h-11 px-6 transition-all"
                  onClick={handleBackup}
                  disabled={isBackingUp}
                >
                  {isBackingUp ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4 mr-2 opacity-70" />
                  )}
                  <span className="font-medium">Backup</span>
                </Button>

                <div className="flex-1 relative">
                  <input
                    type="file"
                    id="restore-file"
                    className="hidden"
                    accept=".tar.gz,.tgz"
                    onChange={handleRestore}
                    disabled={isRestoring}
                  />
                  <Button
                    variant="outline"
                    className="w-full justify-center bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20 text-white hover:text-white h-11 px-6 transition-all"
                    onClick={() =>
                      document.getElementById("restore-file")?.click()
                    }
                    disabled={isRestoring}
                  >
                    {isRestoring ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4 mr-2 opacity-70" />
                    )}
                    <span className="font-medium">Restore</span>
                  </Button>
                </div>

                <Button
                  variant="outline"
                  className="flex-1 justify-center bg-red-500/5 border-red-500/10 hover:bg-red-500/10 hover:border-red-500/30 text-red-400 hover:text-red-300 h-11 px-6 transition-all"
                  onClick={() => setShowResetConfirm(true)}
                  disabled={isResetting}
                >
                  <Trash2 className="w-4 h-4 mr-2 opacity-70" />
                  <span className="font-medium">Reset DB</span>
                </Button>
              </div>

              {showResetConfirm && (
                <div className="p-5 bg-red-500/5 border border-red-500/20 rounded-xl space-y-4 shadow-inner">
                  <p className="text-xs text-red-400/80 font-bold uppercase tracking-widest text-center">
                    Danger Zone: This will permanently delete all memories!
                  </p>
                  <div className="flex flex-col gap-3">
                    <Input
                      value={resetConfirmText}
                      onChange={(e) => setResetConfirmText(e.target.value)}
                      placeholder="Type 'RESET' to confirm"
                      className="h-10 bg-black/40 border-red-500/20 text-white placeholder:text-red-500/20 text-center font-mono focus:border-red-500/40"
                    />
                    <div className="flex gap-2">
                      <Button
                        className="flex-1 text-neutral-400 hover:text-white hover:bg-white/5"
                        variant="ghost"
                        onClick={() => {
                          setShowResetConfirm(false);
                          setResetConfirmText("");
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        className="flex-1 bg-red-500/80 hover:bg-red-500 text-white shadow-lg active:scale-[0.98] transition-transform"
                        disabled={resetConfirmText !== "RESET" || isResetting}
                        onClick={handleReset}
                      >
                        {isResetting && (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        )}
                        Confirm Reset
                      </Button>
                    </div>
                  </div>
                </div>
              )}

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
                  <div className="mt-4 flex flex-col justify-center">
                    <p className="text-emerald-400 font-bold text-2xl tracking-tight drop-shadow-[0_0_15px_rgba(52,211,153,0.3)]">
                      Production
                    </p>
                    <p className="text-[10px] text-neutral-500 mt-1 uppercase tracking-[0.2em] font-medium">
                      {settings?.isManaged
                        ? "Managed Instance"
                        : "Local Instance"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-white/5">
                <Button
                  variant="outline"
                  className="w-full bg-sky-500/5 border-sky-500/10 hover:bg-sky-500/10 hover:border-sky-500/30 text-sky-400 hover:text-sky-300 h-10 transition-all font-medium flex items-center justify-center gap-2 group"
                  onClick={handleRestart}
                  disabled={isRestarting}
                >
                  {isRestarting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <RotateCcw className="w-4 h-4 opacity-70 group-hover:rotate-45 transition-transform" />
                  )}
                  {isRestarting ? "Restarting..." : "Restart Service"}
                </Button>
              </div>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-[#0B1116]/80 backdrop-blur-md border-t border-emerald-500/20 px-6 py-4 flex justify-end gap-3 z-10">
          <Button
            onClick={onClose}
            variant="ghost"
            className="text-neutral-400 hover:text-white hover:bg-white/5"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            className="bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/20"
          >
            {saved ? "Saved!" : "Save Changes"}
          </Button>
        </div>
      </div>
    </div>
  );
}
