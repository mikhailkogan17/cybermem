"use client";

import { Button } from "@/components/ui/button";
import { ConfirmationModal } from "@/components/ui/confirmation-modal";
import { useDashboard } from "@/lib/data/dashboard-context";
import { Settings, X } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import AccessTokenSection from "./settings/access-token-section";
import DataManagementSection from "./settings/data-management-section";
import SystemInfoSection from "./settings/system-info-section";

export default function SettingsModal({ onClose }: { onClose: () => void }) {
  const [apiKey, setApiKey] = useState("");
  const [endpoint, setEndpoint] = useState("");
  const [isManaged, setIsManaged] = useState(false);
  const [instanceType, setInstanceType] = useState<"local" | "rpi" | "vps">(
    "local",
  );
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
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [operationStatus, setOperationStatus] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    toast.success("Copied to clipboard!");
  };

  // Fetch settings from server
  useEffect(() => {
    setIsLoading(true);
    const localKey = localStorage.getItem("om_api_key");

    fetch("/api/settings")
      .then((res) => res.json())
      .then((data) => {
        // Enforce Local Mode ONLY if it's truly local hardware AND accessed via localhost
        setIsManaged(data.isManaged && data.instanceType === "local");
        setInstanceType(data.instanceType || "local");
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
      toast.success("Token Regenerated!", {
        description: "All connected clients will need to be updated.",
      });
    } catch (e) {
      console.error(e);
      toast.error("Failed to regenerate token");
    }
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
      setOperationStatus({
        type: "success",
        message: "Database wiped successfully.",
      });
      toast.success("Database Reset", {
        description: data.message || "Database wiped successfully.",
      });
    } catch (err: any) {
      setOperationStatus({ type: "error", message: err.message });
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#05100F] border-[0.5px] border-white/10 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] max-w-2xl w-full max-h-[90vh] overflow-hidden relative flex flex-col">
        <div className="relative rounded-t-lg bg-[#05100F] px-4 py-4 flex items-center justify-between border-b-0">
          <div className="flex items-center gap-4">
            {/* Title */}
            <div className="text-sm text-white font-semibold flex items-center gap-2 pl-2">
              <Settings className="w-4 h-4 opacity-70" />
              <span>Settings</span>
            </div>
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-neutral-400 hover:text-white hover:bg-white/10 rounded-full w-8 h-8"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-[#05100F]">
          <AccessTokenSection
            apiKey={apiKey}
            showApiKey={showApiKey}
            setShowApiKey={setShowApiKey}
            copiedId={copiedId}
            copyToClipboard={copyToClipboard}
            setShowRegenConfirm={setShowRegenConfirm}
            isManaged={isManaged}
            instanceType={instanceType}
          />

          <DataManagementSection
            handleBackup={handleBackup}
            isBackingUp={isBackingUp}
            handleRestore={handleRestore}
            isRestoring={isRestoring}
            setShowResetConfirm={setShowResetConfirm}
            isResetting={isResetting}
            operationStatus={operationStatus}
            setOperationStatus={setOperationStatus}
          />

          <SystemInfoSection
            settings={settings}
            handleRestart={handleRestart}
            isRestarting={isRestarting}
          />
        </div>

        {/* Footer */}
        <div className="bg-[#05100F] border-t border-white/[0.03] px-8 py-5 flex justify-end gap-3 z-10">
          <Button
            variant="ghost"
            onClick={onClose}
            className="hover:bg-white/5 text-neutral-300 hover:text-white"
          >
            Close
          </Button>
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
        onClose={() => setShowResetConfirm(false)}
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
