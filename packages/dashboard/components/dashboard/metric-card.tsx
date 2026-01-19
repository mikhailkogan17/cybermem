"use client";

import { Card, CardContent } from "@/components/ui/card";

interface MetricCardProps {
  label: string;
  value: string;
  // Keep these props for API compatibility but don't use them
  change?: string;
  trend?: "up" | "down" | "neutral";
  hasData?: boolean;
  loading?: boolean;
}

export default function MetricCard({
  label,
  value,
  loading = false,
  hasData = true,
}: MetricCardProps) {
  const isValueNA = value === "N/A";

  // Skeleton state
  if (loading) {
    return (
      <Card className="bg-white/5 border-white/10 backdrop-blur-md text-white shadow-lg overflow-hidden relative">
        <CardContent className="p-6 relative z-10">
          <div className="h-4 w-24 bg-white/10 rounded animate-pulse mb-3" />
          <div className="h-10 w-20 bg-white/10 rounded animate-pulse" />
        </CardContent>
      </Card>
    );
  }

  // N/A state
  if (isValueNA) {
    return (
      <Card className="bg-white/5 border-white/10 backdrop-blur-md text-white shadow-lg overflow-hidden relative opacity-60">
        <CardContent className="p-6 relative z-10">
          <div className="text-sm font-medium text-slate-500 mb-2">{label}</div>
          <div className="text-4xl font-bold text-slate-500">N/A</div>
        </CardContent>
      </Card>
    );
  }

  // Normal state
  return (
    <Card className="bg-white/5 border-white/10 backdrop-blur-md text-white shadow-lg overflow-hidden relative group hover:bg-white/[0.07] transition-colors">
      <CardContent className="p-6 relative z-10">
        <div className="text-sm font-medium text-slate-400 mb-2">{label}</div>
        <div className="text-4xl font-bold text-white">{value}</div>
      </CardContent>
    </Card>
  );
}
