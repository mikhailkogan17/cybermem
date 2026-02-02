"use client";

import { TintButton } from "@/components/ui/tint-button";
import {
    Check,
    Database,
    Download,
    Loader2,
    Trash2,
    Upload,
    X,
} from "lucide-react";

interface DataManagementSectionProps {
  handleBackup: () => void;
  isBackingUp: boolean;
  handleRestore: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isRestoring: boolean;
  setShowResetConfirm: (show: boolean) => void;
  isResetting: boolean;
  operationStatus: { type: "success" | "error"; message: string } | null;
  setOperationStatus: (
    status: { type: "success" | "error"; message: string } | null,
  ) => void;
}

export default function DataManagementSection({
  handleBackup,
  isBackingUp,
  handleRestore,
  isRestoring,
  setShowResetConfirm,
  isResetting,
  operationStatus,
  setOperationStatus,
}: DataManagementSectionProps) {
  return (
    <section>
      <h3 className="text-sm font-medium text-neutral-400 uppercase tracking-widest mb-4 flex items-center gap-2">
        <Database className="w-4 h-4" />
        Data Management
      </h3>
      <div className="bg-white/[0.032] border-[0.5px] border-white/10 rounded-2xl p-6 flex flex-col gap-4">
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
              onClick={() => document.getElementById("restore-file")?.click()}
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
  );
}
