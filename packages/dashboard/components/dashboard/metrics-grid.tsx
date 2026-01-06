"use client"

import { Card, CardContent } from "@/components/ui/card"
import { useDashboard } from "@/lib/data/dashboard-context"
import MetricCard from "./metric-card"

// Types
interface TrendState {
  change: string
  trend: "up" | "down" | "neutral"
  hasData: boolean
}

interface MetricsGridProps {
  stats: {
    memoryRecords: number
    totalClients: number
    successRate: number
    totalRequests: number
    topWriter: { name: string; count: number }
    topReader: { name: string; count: number }
    lastWriter: { name: string; timestamp: number }
    lastReader: { name: string; timestamp: number }
  }
  trends: {
    memory: TrendState
    clients: TrendState
    success: TrendState
    requests: TrendState
  }
}


export default function MetricsGrid({ stats, trends }: MetricsGridProps) {
  const { clientConfigs } = useDashboard()

  const getClientDisplayName = (rawName: string) => {
    if (!rawName || rawName === "N/A" || rawName === "unknown") return rawName

    const nameLower = rawName.toLowerCase()
    // Find matching client config (e.g. "antigravity" matches "antigravity-client")
    const config = clientConfigs.find((c: any) => nameLower.includes(c.match))
    return config ? config.name : rawName
  }

  const formatTimestamp = (timestamp: number) => {
    if (timestamp <= 0) return "No activity"
    const date = new Date(timestamp)
    const now = new Date()
    const isToday = date.getDate() === now.getDate() &&
                    date.getMonth() === now.getMonth() &&
                    date.getFullYear() === now.getFullYear()

    if (isToday) {
      return date.toLocaleTimeString()
    }
    return date.toLocaleString()
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
      {/* 1. Memory Records */}
      <MetricCard
        label="Memory Records"
        value={stats.memoryRecords.toLocaleString()}
        change={trends.memory.change}
        trend={trends.memory.trend}
        hasData={trends.memory.hasData}
      />

      {/* 2. Total Clients */}
      <MetricCard
        label="Total Clients"
        value={stats.totalClients.toString()}
        change={trends.clients.change}
        trend={trends.clients.trend}
        hasData={trends.clients.hasData}
      />

      {/* 3. Success Rate */}
      <MetricCard
        label="Success Rate"
        value={`${stats.successRate.toFixed(1)}%`}
        change={trends.success.change}
        trend={trends.success.trend} // Trend UP is good (green) for success rate
        hasData={trends.success.hasData}
      />

      {/* 4. Total Requests */}
      <MetricCard
        label="Total Requests"
        value={stats.totalRequests.toLocaleString()}
        change={trends.requests.change}
        trend={trends.requests.trend}
        hasData={trends.requests.hasData}
      />

      {/* 5. Top Writer */}
      <Card className="bg-white/5 border-white/10 backdrop-blur-md text-white shadow-lg overflow-hidden">
        <CardContent className="pt-6 pb-6 relative">
          <div className="text-sm font-medium text-slate-400 mb-2">Top Writer</div>
          <div className="text-4xl font-bold text-white mb-1 truncate">{getClientDisplayName(stats.topWriter.name)}</div>
          <div className="text-xl text-white/80 whitespace-nowrap">
            {stats.topWriter.count > 0 ? `${stats.topWriter.count.toLocaleString()} writes` : ""}
          </div>
        </CardContent>
      </Card>

      {/* 6. Top Reader */}
      <Card className="bg-white/5 border-white/10 backdrop-blur-md text-white shadow-lg overflow-hidden">
        <CardContent className="pt-6 pb-6 relative">
          <div className="text-sm font-medium text-slate-400 mb-2">Top Reader</div>
          <div className="text-4xl font-bold text-white mb-1 truncate">
            {stats.topReader.count > 0 ? getClientDisplayName(stats.topReader.name) : "N/A"}
          </div>
          <div className="text-xl text-white/80 whitespace-nowrap">
            {stats.topReader.count > 0 ? `${stats.topReader.count.toLocaleString()} reads` : ""}
          </div>
        </CardContent>
      </Card>

      {/* 7. Last Writer */}
      <Card className="bg-white/5 border-white/10 backdrop-blur-md text-white shadow-lg overflow-hidden">
        <CardContent className="pt-6 pb-6 relative">
          <div className="text-sm font-medium text-slate-400 mb-2">Last Writer</div>
          <div className="text-4xl font-bold text-white mb-1 truncate">
            {stats.lastWriter.name !== "N/A" ? getClientDisplayName(stats.lastWriter.name) : "N/A"}
          </div>
          <div className="text-xl text-white/80 whitespace-nowrap">
            {stats.lastWriter.timestamp > 0 ? formatTimestamp(stats.lastWriter.timestamp) : "No activity"}
          </div>
        </CardContent>
      </Card>

      {/* 8. Last Reader */}
      <Card className="bg-white/5 border-white/10 backdrop-blur-md text-white shadow-lg overflow-hidden">
        <CardContent className="pt-6 pb-6 relative">
          <div className="text-sm font-medium text-slate-400 mb-2">Last Reader</div>
          <div className="text-4xl font-bold text-white mb-1 truncate">
            {stats.lastReader.name !== "N/A" ? getClientDisplayName(stats.lastReader.name) : "N/A"}
          </div>
          <div className="text-xl text-white/80 whitespace-nowrap">
            {stats.lastReader.timestamp > 0 ? formatTimestamp(stats.lastReader.timestamp) : "No activity"}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
