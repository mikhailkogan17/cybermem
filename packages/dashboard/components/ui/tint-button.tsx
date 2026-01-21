"use client";

import { cn } from "@/lib/utils";
import { forwardRef } from "react";

type TintColor = "emerald" | "yellow" | "red" | "sky" | "neutral";

interface TintButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  tint?: TintColor;
  variant?: "solid" | "outline" | "ghost";
  size?: "sm" | "md" | "lg" | "icon";
  children: React.ReactNode;
}

const tintStyles: Record<TintColor, Record<string, string>> = {
  emerald: {
    solid:
      "bg-emerald-500/20 hover:bg-emerald-500/30 border-emerald-500/20 text-emerald-400",
    outline:
      "bg-transparent hover:bg-emerald-500/10 border-emerald-500/20 text-emerald-400",
    ghost:
      "bg-transparent hover:bg-emerald-500/10 border-transparent text-emerald-400",
  },
  yellow: {
    solid:
      "bg-yellow-500/20 hover:bg-yellow-500/30 border-yellow-500/20 text-yellow-400",
    outline:
      "bg-transparent hover:bg-yellow-500/10 border-yellow-500/20 text-yellow-400",
    ghost:
      "bg-transparent hover:bg-yellow-500/10 border-transparent text-yellow-400",
  },
  red: {
    solid: "bg-red-500/20 hover:bg-red-500/30 border-red-500/20 text-red-400",
    outline:
      "bg-transparent hover:bg-red-500/10 border-red-500/20 text-red-400",
    ghost: "bg-transparent hover:bg-red-500/10 border-transparent text-red-400",
  },
  sky: {
    solid: "bg-sky-500/20 hover:bg-sky-500/30 border-sky-500/20 text-sky-400",
    outline:
      "bg-transparent hover:bg-sky-500/10 border-sky-500/20 text-sky-400",
    ghost: "bg-transparent hover:bg-sky-500/10 border-transparent text-sky-400",
  },
  neutral: {
    solid: "bg-white/10 hover:bg-white/20 border-white/10 text-white",
    outline: "bg-transparent hover:bg-white/5 border-white/10 text-neutral-300",
    ghost:
      "bg-transparent hover:bg-white/5 border-transparent text-neutral-400 hover:text-white",
  },
};

const sizeStyles = {
  sm: "h-8 px-3 text-xs",
  md: "h-10 px-4 text-sm",
  lg: "h-11 px-6 text-base",
  icon: "h-9 w-9 p-0",
};

export const TintButton = forwardRef<HTMLButtonElement, TintButtonProps>(
  (
    {
      tint = "emerald",
      variant = "solid",
      size = "md",
      className,
      children,
      ...props
    },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-lg border font-medium transition-all",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B1116]",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          tintStyles[tint][variant],
          sizeStyles[size],
          className,
        )}
        {...props}
      >
        {children}
      </button>
    );
  },
);

TintButton.displayName = "TintButton";
