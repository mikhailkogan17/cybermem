"use client"

import { Card, CardContent } from "@/components/ui/card"

interface MetricCardProps {
  label: string
  value: string
  // Keep these props for API compatibility but don't use them
  change?: string
  trend?: "up" | "down" | "neutral"
  hasData?: boolean
}

export default function MetricCard({ label, value }: MetricCardProps) {
  return (
    <Card className="bg-white/5 border-white/10 backdrop-blur-md text-white shadow-lg overflow-hidden relative">
      <CardContent className="p-6 relative z-10">
        <div className="text-sm font-medium text-slate-400 mb-2">{label}</div>
        <div className="text-4xl font-bold text-white">{value}</div>
      </CardContent>
    </Card>
  )
}
