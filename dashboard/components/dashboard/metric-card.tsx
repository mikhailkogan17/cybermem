"use client"

import { Card, CardContent } from "@/components/ui/card"
import { TrendingDown, TrendingUp } from "lucide-react"

interface MetricCardProps {
  label: string
  value: string
  change: string
  trend: "up" | "down" | "neutral"
  hasData?: boolean
}

export default function MetricCard({ label, value, change, trend, hasData = true }: MetricCardProps) {
  const isPositive = trend === "up"
  const TrendIcon = isPositive ? TrendingUp : TrendingDown

  // Stricter check for zero change to hide trend arrow
  const isZero = !change ||
                 change === "0" ||
                 change === "0%" ||
                 change === "+0" ||
                 change === "+0.0%" ||
                 change === "0.0%" ||
                 change === "-0%" ||
                 change === "-0.0%";

  const showTrend = hasData && !isZero;

  return (
    <Card className="bg-white/5 border-white/10 backdrop-blur-md text-white shadow-lg overflow-hidden relative">
      <CardContent className="p-6 relative z-10">
        <div className="text-sm font-medium text-slate-400 mb-2">{label}</div>
        <div className="flex items-end gap-3">
          <div className="text-4xl font-bold text-white">{value}</div>

          {showTrend && (
            <div className={`flex items-center gap-1 mb-1.5 ${isPositive ? "text-emerald-400" : "text-rose-400"}`}>
              <TrendIcon className="w-4 h-4" />
              <span className="text-sm font-bold">
                {change}
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
