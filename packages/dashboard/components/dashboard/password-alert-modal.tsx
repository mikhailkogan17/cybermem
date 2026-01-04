"use client"

import { Button } from "@/components/ui/button"
import { AlertTriangle, Settings, X } from "lucide-react"

interface PasswordAlertModalProps {
  onChangePassword: () => void
  onDismiss: () => void
}

export default function PasswordAlertModal({
  onChangePassword,
  onDismiss
}: PasswordAlertModalProps) {
  const handleDontShowAgain = () => {
    localStorage.setItem("hidePasswordWarning", "true")
    onDismiss()
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div
        className="bg-[#0B1116]/90 backdrop-blur-xl border border-amber-500/30 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        style={{
          backgroundImage: `
            radial-gradient(circle at 0% 0%, rgba(251, 191, 36, 0.05) 0%, transparent 50%),
            radial-gradient(circle at 100% 100%, rgba(251, 191, 36, 0.05) 0%, transparent 50%)
          `
        }}
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-4 flex items-start gap-4">
          <div className="p-3 bg-amber-500/10 rounded-full border border-amber-500/20 shrink-0">
            <AlertTriangle className="w-6 h-6 text-amber-400 drop-shadow-[0_0_10px_rgba(251,191,36,0.5)]" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-white">Default Password Detected</h2>
            <p className="text-neutral-400 text-sm mt-1">
              You're using the default admin password. For security, we recommend changing it now.
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onDismiss}
            className="text-neutral-400 hover:text-white hover:bg-white/10 rounded-full -mt-1 -mr-2"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Actions */}
        <div className="px-6 pb-6 flex flex-col gap-3">
          <Button
            onClick={onChangePassword}
            className="w-full bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/20 text-emerald-400 font-medium transition-colors gap-2"
          >
            <Settings className="w-4 h-4" />
            Change Password
          </Button>
          <Button
            variant="ghost"
            onClick={handleDontShowAgain}
            className="w-full text-neutral-400 hover:text-white hover:bg-white/10"
          >
            Don't show again
          </Button>
        </div>
      </div>
    </div>
  )
}
