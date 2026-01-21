"use client";

import { Input } from "@/components/ui/input";
import { TintButton } from "@/components/ui/tint-button";
import { AlertTriangle, X } from "lucide-react";
import { useState } from "react";

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText?: string;
  confirmWord?: string;
  tint?: "red" | "yellow";
  isLoading?: boolean;
}

export function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = "Confirm",
  confirmWord,
  tint = "red",
  isLoading = false,
}: ConfirmationModalProps) {
  const [inputValue, setInputValue] = useState("");

  if (!isOpen) return null;

  const canConfirm = confirmWord ? inputValue === confirmWord : true;

  const handleConfirm = () => {
    if (canConfirm) {
      onConfirm();
      setInputValue("");
    }
  };

  const handleClose = () => {
    setInputValue("");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative bg-[#0B1116]/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-start gap-4 p-5">
          <div
            className={`p-2 rounded-lg ${tint === "red" ? "bg-red-500/10" : "bg-yellow-500/10"}`}
          >
            <AlertTriangle
              className={`w-5 h-5 ${tint === "red" ? "text-red-400" : "text-yellow-400"}`}
            />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-white">{title}</h3>
            <p className="text-sm text-neutral-400 mt-1">{description}</p>
          </div>
          <button
            onClick={handleClose}
            className="text-neutral-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Confirmation Input */}
        {confirmWord && (
          <div className="px-5 pb-4">
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={`Type "${confirmWord}" to confirm`}
              className="bg-black/40 border-white/10 text-white text-center font-mono placeholder:text-neutral-600"
              autoFocus
            />
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 p-5 pt-0">
          <TintButton
            tint="neutral"
            variant="outline"
            className="flex-1"
            onClick={handleClose}
          >
            Cancel
          </TintButton>
          <TintButton
            tint={tint}
            variant="solid"
            className="flex-1"
            onClick={handleConfirm}
            disabled={!canConfirm || isLoading}
          >
            {isLoading ? "Processing..." : confirmText}
          </TintButton>
        </div>
      </div>
    </div>
  );
}
