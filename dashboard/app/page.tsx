"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import ReactECharts from "echarts-for-react"
import { ChevronLeft, ChevronRight, Search } from "lucide-react"
import { useEffect, useState } from "react"

const FALLBACK_CLIENTS = ["Cursor", "Visual Studio Code", "Claude Desktop", "GitHub Copilot", "Windsurf"]
const COLOR_PALETTE = ["#14b8a6", "#06b6d4", "#8b5cf6", "#10b981", "#f59e0b", "#ef4444", "#a855f7", "#22c55e"]

// Client ID to human-readable name mapping
const CLIENT_DISPLAY_NAMES: Record<string, string> = {
  'claude-code': 'Claude Code',
  'claude-desktop': 'Claude Desktop',
  'cursor': 'Cursor',
  'vscode': 'VS Code',
  'production': 'Production',
  'staging': 'Staging',
  'dev': 'Development',
  'anonymous': 'Anonymous',
  'Anonymous': 'Anonymous',
}

// Helper function to get display name for a client
const getClientDisplayName = (clientId: string): string => {
  return CLIENT_DISPLAY_NAMES[clientId] || clientId
}

type SortField = "date" | "client" | "operation" | "status"
type SortDirection = "asc" | "desc"

export default function CyberMemDashboard() {
  const [loading, setLoading] = useState(true)
  const [clientNames, setClientNames] = useState<string[]>(FALLBACK_CLIENTS)
  const [stats, setStats] = useState({
    memoryRecords: 0,
    totalClients: 0,
    clientGrowth: 0,
    topWriter: { name: "N/A", count: 0 },
    topReader: { name: "N/A", count: 0 },
    lastWriter: { name: "N/A", timestamp: new Date() },
    lastReader: { name: "N/A", timestamp: new Date() },
    successRate: 0,
    totalRequests: 0,
  })

  const [sparklineData, setSparklineData] = useState({
    memoryRecords: Array.from({ length: 20 }, () => 0),
    totalClients: Array.from({ length: 20 }, () => 0),
    successRate: Array.from({ length: 20 }, () => 0),
    totalRequests: Array.from({ length: 20 }, () => 0),
  })

  const [writesByClient, setWritesByClient] = useState<Array<{ client: string; writes: number }>>([])
  const [readsByClient, setReadsByClient] = useState<Array<{ client: string; reads: number }>>([])
  const [requestsByClient, setRequestsByClient] = useState<Array<{ client: string; total: number }>>([])
  const [successRateByClient, setSuccessRateByClient] = useState<Array<{ client: string; rate: number }>>([])
  const [requestsTimeSeries, setRequestsTimeSeries] = useState<Array<any>>([])
  const [responseTimeSeries, setResponseTimeSeries] = useState<Array<any>>([])
  const [successRateTimeSeries, setSuccessRateTimeSeries] = useState<Array<any>>([])
  const [successRateTimeSeriesByClient, setSuccessRateTimeSeriesByClient] = useState<Array<any>>([])
  const [fullAuditLog, setFullAuditLog] = useState<Array<any>>([])

  const [lastUpdate, setLastUpdate] = useState(0)
  const [searchTerm, setSearchTerm] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [sortField, setSortField] = useState<SortField>("date")
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc")
  const [period, setPeriod] = useState<string>("15m")
  const itemsPerPage = 10

  const fetchMetrics = async () => {
    try {
      const [metricsResponse, logsResponse] = await Promise.all([
        fetch(`/api/metrics?period=${period}`),
        fetch(`/api/logs?period=${period}`)
      ])

      if (!metricsResponse.ok) throw new Error("Failed to fetch metrics")
      const data = await metricsResponse.json()

      const readsArray = Object.entries(data.clientStats.reads || {}).map(([client, reads]) => ({
        client,
        reads: reads as number,
      }))
      const writesArray = Object.entries(data.clientStats.writes || {}).map(([client, writes]) => ({
        client,
        writes: writes as number,
      }))

      // Calculate requests by client (total = reads + writes)
      const requestsMap = new Map<string, number>()
      readsArray.forEach((r) => requestsMap.set(r.client, (requestsMap.get(r.client) || 0) + r.reads))
      writesArray.forEach((w) => requestsMap.set(w.client, (requestsMap.get(w.client) || 0) + w.writes))
      const requestsByClientArray = Array.from(requestsMap.entries())
        .map(([client, total]) => ({ client, total }))
        .sort((a, b) => b.total - a.total)

      // Calculate success rate by client (from data.clientStats if available)
      const successRateArray = data.clientStats.successRate
        ? Object.entries(data.clientStats.successRate).map(([client, rate]) => ({
            client,
            rate: rate as number,
          }))
        : []

      const derivedClients = Array.from(
        new Set([
          ...readsArray.map((r) => r.client),
          ...writesArray.map((w) => w.client),
          ...(data.timeSeries.requests?.[0]
            ? Object.keys(data.timeSeries.requests[0]).filter((key) => key !== "time")
            : []),
        ]),
      )

      setClientNames(derivedClients.length ? derivedClients : FALLBACK_CLIENTS)

      setStats((prev) => ({
        memoryRecords: data.stats.memoryRecords ?? 0,
        totalClients: data.stats.totalClients ?? 0,
        clientGrowth: data.stats.clientGrowth ?? 0,
        topWriter: data.stats.topWriter ?? { name: "N/A", count: 0 },
        topReader: data.stats.topReader ?? { name: "N/A", count: 0 },
        lastWriter: data.stats.lastWriter ?? { name: "N/A", timestamp: 0 },
        lastReader: data.stats.lastReader ?? { name: "N/A", timestamp: 0 },
        successRate: data.stats.successRate ?? 0,
        totalRequests: data.stats.totalRequests ?? 0,
      }))

      setReadsByClient(readsArray)
      setWritesByClient(writesArray)
      setRequestsByClient(requestsByClientArray)
      setSuccessRateByClient(successRateArray)
      setRequestsTimeSeries(data.timeSeries.requests || [])
      setResponseTimeSeries(data.timeSeries.responseTime || [])
      setSuccessRateTimeSeries(data.timeSeries.successRate || [])
      setSuccessRateTimeSeriesByClient(data.timeSeries.successRateByClient || [])

      const totalRequestsSparkline =
        data.timeSeries.requests?.map((point: any) =>
          Object.entries(point)
            .filter(([key]) => key !== "time")
            .reduce((acc, [, val]) => acc + Number(val || 0), 0)
        ) || []

      const writesSparkline =
        data.timeSeries.writes?.map((point: any) =>
          Object.entries(point)
            .filter(([key]) => key !== "time")
            .reduce((acc, [, val]) => acc + Number(val || 0), 0)
        ) || []

      const successRateSparkline = (data.timeSeries.successRate || []).map((p: any) => p.value ?? 0)
      const totalClientsSparkline =
        data.timeSeries.requests?.map((point: any) => {
          const clients = Object.keys(point).filter((k) => k !== "time")
          return clients.length
        }) || []

      // Update sparklines; if API provided explicit sparklines, prefer them
      if (data.sparklines) {
        setSparklineData({
          memoryRecords: data.sparklines.memoryRecords || writesSparkline || Array.from({ length: 20 }, () => 0),
          totalClients: data.sparklines.totalClients || totalClientsSparkline || Array.from({ length: 20 }, () => 0),
          successRate: data.sparklines.successRate || successRateSparkline || Array.from({ length: 20 }, () => 100),
          totalRequests: data.sparklines.totalRequests || totalRequestsSparkline || Array.from({ length: 20 }, () => 0),
        })
      } else {
        setSparklineData((prev) => ({
          memoryRecords: writesSparkline.length ? writesSparkline : prev.memoryRecords,
          totalClients: totalClientsSparkline.length ? totalClientsSparkline : prev.totalClients,
          successRate: successRateSparkline.length ? successRateSparkline : prev.successRate,
          totalRequests: totalRequestsSparkline.length ? totalRequestsSparkline : prev.totalRequests,
        }))
      }

      if (totalClientsSparkline.length >= 2) {
        const first = totalClientsSparkline[0]
        const last = totalClientsSparkline[totalClientsSparkline.length - 1]
        setStats((prev) => ({
          ...prev,
          clientGrowth: Math.max(0, last - first),
        }))
      }

      if (logsResponse.ok) {
        const logsData = await logsResponse.json()
        const mappedLogs = (logsData.logs || []).map((log: any, index: number) => {
          const operation =
            log.method === "POST" ? "Write" : log.method === "GET" ? "Read" : log.method === "DELETE" ? "Delete" : "Update"
          const statusCode = parseInt(log.status)
          let status = "Success"
          let description = ""

          if (statusCode >= 500) {
            status = "Error"
            description = "Server error"
          } else if (statusCode >= 400) {
            status = "Error"
            description = statusCode === 401 ? "Unauthorized" : statusCode === 403 ? "Forbidden" : "Client error"
          } else if (statusCode >= 300) {
            status = "Warning"
            description = "Redirect"
          }

          return {
            id: index,
            date: new Date(log.timestamp),
            client: log.client || "Unknown",
            operation,
            status,
            description,
          }
        })

        const sortedLogs = [...mappedLogs].sort((a, b) => b.date.getTime() - a.date.getTime())
        const lastWriterLog = sortedLogs.find((log) => log.operation === "Write")
        const lastReaderLog = sortedLogs.find((log) => log.operation === "Read")

        setFullAuditLog(sortedLogs)
        setStats((prev) => ({
          ...prev,
          lastWriter: lastWriterLog ? { name: lastWriterLog.client, timestamp: lastWriterLog.date } : prev.lastWriter,
          lastReader: lastReaderLog ? { name: lastReaderLog.client, timestamp: lastReaderLog.date } : prev.lastReader,
        }))
      }

      setLastUpdate(0)
      setLoading(false)
    } catch (error) {
      console.error("Failed to fetch metrics:", error)
      setLoading(false)
    }
  }

  // Initial fetch and auto-refresh every 5 seconds
  useEffect(() => {
    fetchMetrics()
    const interval = setInterval(fetchMetrics, 5000)
    return () => clearInterval(interval)
  }, [period])

  // Update last update timer
  useEffect(() => {
    const timer = setInterval(() => {
      setLastUpdate((prev) => prev + 1)
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  // Filter and sort audit log
  const filteredLog = fullAuditLog.filter(
    (log) =>
      log.client.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.operation.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.status.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.description.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const sortedLog = [...filteredLog].sort((a, b) => {
    const modifier = sortDirection === "asc" ? 1 : -1

    if (sortField === "date") {
      return (a.date.getTime() - b.date.getTime()) * modifier
    }

    const aValue = a[sortField]
    const bValue = b[sortField]

    if (typeof aValue === "string" && typeof bValue === "string") {
      return aValue.localeCompare(bValue) * modifier
    }
    return 0
  })

  const paginatedLog = sortedLog.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
  const totalPages = Math.ceil(sortedLog.length / itemsPerPage)

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortDirection(field === "date" ? "desc" : "asc")
    }
    setCurrentPage(1)
  }

  const getStatusBadge = (status: string, description?: string) => {
    if (status === "Success") {
      return (
        <Badge className="bg-emerald-500/30 backdrop-blur-md border border-emerald-400/20 text-emerald-100 font-bold px-3 py-1 text-sm shadow-lg">
          Success
        </Badge>
      )
    }
    if (status === "Warning") {
      return (
        <Badge className="bg-amber-500/30 backdrop-blur-md border border-amber-400/20 text-amber-100 font-bold px-3 py-1 text-sm shadow-lg">
          Warning{description ? `: ${description}` : ""}
        </Badge>
      )
    }
    if (status === "Error") {
      return (
        <Badge className="bg-red-500/30 backdrop-blur-md border border-red-400/20 text-red-100 font-bold px-3 py-1 text-sm shadow-lg">
          Error{description ? `: ${description}` : ""}
        </Badge>
      )
    }
    return (
      <Badge className="bg-gray-500/30 backdrop-blur-md border border-gray-400/20 text-gray-100 font-bold px-3 py-1 text-sm shadow-lg">
        Canceled
      </Badge>
    )
  }

  const getOperationBadge = (operation: string) => {
    const colorMap = {
      Read: "bg-blue-500/30 backdrop-blur-md border border-blue-400/20 text-blue-100",
      Write: "bg-purple-500/30 backdrop-blur-md border border-purple-400/20 text-purple-100",
      Update: "bg-orange-500/30 backdrop-blur-md border border-orange-400/20 text-orange-100",
      Delete: "bg-rose-500/30 backdrop-blur-md border border-rose-400/20 text-rose-100",
    }
    return (
      <Badge className={`${colorMap[operation as keyof typeof colorMap]} font-bold px-3 py-1 text-sm shadow-lg`}>
        {operation}
      </Badge>
    )
  }

  const formatTimestamp = (timestamp: Date) => {
    const now = Date.now()
    const diff = now - timestamp.getTime()
    const seconds = Math.floor(diff / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)

    if (seconds < 60) return `${seconds}s ago`
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    return timestamp.toLocaleDateString()
  }

  const formatTimeForChart = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const formatDate = (date: Date) => {
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  return (
    <div className="min-h-screen text-white p-6">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <h1
            className="text-5xl font-semibold text-white tracking-wider"
            style={{ fontFamily: "'Exo 2', sans-serif" }}
          >
            CyberMem
          </h1>
          <div className="flex items-center gap-2 pt-3">
            {["15m", "1h", "6h", "12h", "1d", "1w", "1M", "1y"].map((p) => (
              <Button
                key={p}
                onClick={() => setPeriod(p)}
                variant={period === p ? "default" : "outline"}
                size="sm"
                className={period === p ? "bg-white/20 text-white border-white/30" : "bg-white/5 text-white/70 border-white/20 hover:bg-white/10 hover:text-white"}
              >
                {p}
              </Button>
            ))}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <div className="flex items-center gap-2 bg-white/90 px-3 py-1.5 rounded-full backdrop-blur-sm">
            <div className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#10b981] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#10b981]"></span>
            </div>
            <span className="text-sm font-semibold text-gray-800">Live</span>
          </div>
          <p className="text-sm text-white/90">Updated {lastUpdate}s ago</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        {/* Memory Records */}
        <Card className="bg-white/15 backdrop-blur-2xl border-white/20 text-white shadow-xl overflow-hidden">
          <CardContent className="p-0 relative h-40">
            {/* Sparkline background */}
            <div className="absolute -top-8 -bottom-8 left-0 right-0 pointer-events-none">
              <ReactECharts
                option={{
                  animation: false,
                  backgroundColor: "transparent",
                  silent: true,
                  grid: {
                    left: 0,
                    right: 0,
                    top: 0,
                    bottom: 0,
                    containLabel: false,
                    show: false,
                    borderWidth: 0
                  },
                  xAxis: {
                    type: "category",
                    show: false,
                    boundaryGap: false
                  },
                  yAxis: {
                    type: "value",
                    show: false,
                    min: 0,
                    scale: false,
                    boundaryGap: [0, 0]
                  },
                  series: [
                    {
                      type: "line",
                      data: sparklineData.memoryRecords,
                      smooth: true,
                      showSymbol: false,
                      animation: false,
                      lineStyle: { width: 0 },
                      areaStyle: { color: "rgba(255, 255, 255, 0.20)", origin: "start" },
                      sampling: "lttb",
                    },
                  ],
                }}
                style={{ height: "100%", width: "100%" }}
                opts={{ renderer: "canvas" }}
              />
            </div>
            {/* Content with padding */}
            <div className="relative z-10 p-6">
              <div className="text-lg font-medium text-white/90 mb-2">Memory Records</div>
              <div className="text-6xl font-bold text-white">{stats.memoryRecords.toLocaleString()}</div>
            </div>
          </CardContent>
        </Card>

        {/* Total Clients */}
        <Card className="bg-white/15 backdrop-blur-2xl border-white/20 shadow-xl overflow-hidden">
          <CardContent className="p-0 relative h-40">
            {/* Sparkline background */}
            <div className="absolute -top-8 -bottom-8 left-0 right-0 pointer-events-none">
              <ReactECharts
                option={{
                  animation: false,
                  backgroundColor: "transparent",
                  silent: true,
                  grid: {
                    left: 0,
                    right: 0,
                    top: 0,
                    bottom: 0,
                    containLabel: false,
                    show: false,
                    borderWidth: 0
                  },
                  xAxis: {
                    type: "category",
                    show: false,
                    boundaryGap: false
                  },
                  yAxis: {
                    type: "value",
                    show: false,
                    min: 0,
                    scale: false,
                    boundaryGap: [0, 0]
                  },
                  series: [
                    {
                      type: "line",
                      data: sparklineData.totalClients,
                      smooth: true,
                      showSymbol: false,
                      animation: false,
                      lineStyle: { width: 0 },
                      areaStyle: { color: "rgba(255, 255, 255, 0.20)", origin: "start" },
                      sampling: "lttb",
                    },
                  ],
                }}
                style={{ height: "100%", width: "100%" }}
                opts={{ renderer: "canvas" }}
              />
            </div>
            {/* Content with padding */}
            <div className="relative z-10 p-6">
              <div className="text-lg font-medium text-white/90 mb-2">Total Clients</div>
              <div className="text-5xl font-bold text-white">
                {stats.totalClients}{" "}
                <span className="text-xl text-white/90 font-semibold">+{stats.clientGrowth} this month</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Success Rate */}
        <Card className="bg-white/15 backdrop-blur-2xl border-white/20 shadow-xl overflow-hidden">
          <CardContent className="p-0 relative h-40">
            {/* Sparkline background */}
            <div className="absolute -top-8 -bottom-8 left-0 right-0 pointer-events-none">
              <ReactECharts
                option={{
                  animation: false,
                  backgroundColor: "transparent",
                  silent: true,
                  grid: {
                    left: 0,
                    right: 0,
                    top: 0,
                    bottom: 0,
                    containLabel: false,
                    show: false,
                    borderWidth: 0
                  },
                  xAxis: {
                    type: "category",
                    show: false,
                    boundaryGap: false
                  },
                  yAxis: {
                    type: "value",
                    show: false,
                    min: 0,
                    scale: false,
                    boundaryGap: [0, 0]
                  },
                  series: [
                    {
                      type: "line",
                      data: sparklineData.successRate,
                      smooth: true,
                      showSymbol: false,
                      animation: false,
                      lineStyle: { width: 0 },
                      areaStyle: { color: "rgba(255, 255, 255, 0.20)", origin: "start" },
                      sampling: "lttb",
                    },
                  ],
                }}
                style={{ height: "100%", width: "100%" }}
                opts={{ renderer: "canvas" }}
              />
            </div>
            {/* Content with padding */}
            <div className="relative z-10 p-6">
              <div className="text-lg font-medium text-white/90 mb-2">Success Rate</div>
              <div className="text-6xl font-bold text-white">{stats.successRate.toFixed(1)}%</div>
            </div>
          </CardContent>
        </Card>

        {/* Total Requests */}
        <Card className="bg-white/15 backdrop-blur-2xl border-white/20 text-white shadow-xl overflow-hidden">
          <CardContent className="p-0 relative h-40">
            {/* Sparkline background */}
            <div className="absolute -top-8 -bottom-8 left-0 right-0 pointer-events-none">
              <ReactECharts
                option={{
                  animation: false,
                  backgroundColor: "transparent",
                  silent: true,
                  grid: {
                    left: 0,
                    right: 0,
                    top: 0,
                    bottom: 0,
                    containLabel: false,
                    show: false,
                    borderWidth: 0
                  },
                  xAxis: {
                    type: "category",
                    show: false,
                    boundaryGap: false
                  },
                  yAxis: {
                    type: "value",
                    show: false,
                    min: 0,
                    scale: false,
                    boundaryGap: [0, 0]
                  },
                  series: [
                    {
                      type: "line",
                      data: sparklineData.totalRequests,
                      smooth: true,
                      showSymbol: false,
                      animation: false,
                      lineStyle: { width: 0 },
                      areaStyle: { color: "rgba(255, 255, 255, 0.20)", origin: "start" },
                      sampling: "lttb",
                    },
                  ],
                }}
                style={{ height: "100%", width: "100%" }}
                opts={{ renderer: "canvas" }}
              />
            </div>
            {/* Content with padding */}
            <div className="relative z-10 p-6">
              <div className="text-lg font-medium text-white/90 mb-2">Total Requests</div>
              <div className="text-6xl font-bold text-white">{stats.totalRequests.toLocaleString()}</div>
            </div>
          </CardContent>
        </Card>

        {/* Most Writing Client */}
        <Card className="bg-white/15 backdrop-blur-2xl border-white/20 text-white shadow-xl overflow-hidden">
          <CardContent className="pt-4 pb-0 relative">
            <div className="text-lg font-medium text-white/90 mb-2">Most Writing Client</div>
            <div className="text-4xl font-bold text-white mb-1 truncate">{getClientDisplayName(stats.topWriter.name)}</div>
            <div className="text-xl text-white/80 mb-4 whitespace-nowrap">
              {stats.topWriter.count.toLocaleString()} writes
            </div>
          </CardContent>
        </Card>

        {/* Most Reading Client */}
        <Card className="bg-white/15 backdrop-blur-2xl border-white/20 text-white shadow-xl overflow-hidden">
          <CardContent className="pt-4 pb-0 relative">
            <div className="text-lg font-medium text-white/90 mb-2">Most Reading Client</div>
            <div className="text-4xl font-bold text-white mb-1 truncate">
              {stats.topReader.count > 0 ? getClientDisplayName(stats.topReader.name) : "N/A"}
            </div>
            <div className="text-xl text-white/80 mb-4 whitespace-nowrap">
              {stats.topReader.count > 0 ? `${stats.topReader.count.toLocaleString()} reads` : ""}
            </div>
          </CardContent>
        </Card>

        {/* Last Writer */}
        <Card className="bg-white/15 backdrop-blur-2xl border-white/20 text-white shadow-xl overflow-hidden">
          <CardContent className="pt-4 pb-0 relative">
            <div className="text-lg font-medium text-white/90 mb-2">Last Writer</div>
            <div className="text-4xl font-bold text-white mb-1 truncate">
              {stats.lastWriter.name !== "N/A" ? getClientDisplayName(stats.lastWriter.name) : "N/A"}
            </div>
            <div className="text-xl text-white/80 mb-4 whitespace-nowrap">
              {stats.lastWriter.timestamp > 0 ? new Date(stats.lastWriter.timestamp).toLocaleTimeString() : "No activity"}
            </div>
          </CardContent>
        </Card>

        {/* Last Reader */}
        <Card className="bg-white/15 backdrop-blur-2xl border-white/20 text-white shadow-xl overflow-hidden">
          <CardContent className="pt-4 pb-0 relative">
            <div className="text-lg font-medium text-white/90 mb-2">Last Reader</div>
            <div className="text-4xl font-bold text-white mb-1 truncate">
              {stats.lastReader.name !== "N/A" ? getClientDisplayName(stats.lastReader.name) : "N/A"}
            </div>
            <div className="text-xl text-white/80 mb-4 whitespace-nowrap">
              {stats.lastReader.timestamp > 0 ? new Date(stats.lastReader.timestamp).toLocaleTimeString() : "No activity"}
            </div>
          </CardContent>
        </Card>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Requests by Client - Top Left */}
        <Card className="bg-white/10 backdrop-blur-3xl border-white/20 shadow-xl">
          <CardContent className="pt-6">
            <h3 className="text-lg text-white font-semibold mb-4">Requests by Client</h3>
            {requestsTimeSeries.length === 0 ? (
              <div className="flex items-center justify-center h-64 text-white/60 text-lg">
                No data available yet...
              </div>
            ) : (
              <ReactECharts
                option={{
                  backgroundColor: "transparent",
                  tooltip: {
                    trigger: "axis",
                    backgroundColor: "rgba(0, 0, 0, 0.8)",
                    borderColor: "#333",
                    textStyle: { color: "#fff" },
                  },
                  grid: {
                    left: "3%",
                    right: "4%",
                    bottom: "15%",
                    top: "3%",
                    containLabel: true,
                  },
                  xAxis: {
                    type: "category",
                    data: requestsTimeSeries.map((d) => formatTimeForChart(d.time as number)),
                    axisLine: { lineStyle: { color: "rgba(255, 255, 255, 0.2)" } },
                    axisLabel: { color: "#fff", rotate: 45 },
                    boundaryGap: false,
                  },
                  yAxis: {
                    type: "value",
                    axisLine: { lineStyle: { color: "rgba(255, 255, 255, 0.2)" } },
                    axisLabel: { color: "#fff" },
                    splitLine: { lineStyle: { color: "rgba(255, 255, 255, 0.1)" } },
                  },
                  legend: {
                    data: clientNames.map(getClientDisplayName),
                    textStyle: { color: "#fff", fontSize: 11 },
                    bottom: 0,
                    type: "plain",
                  },
                  series: clientNames.map((client, index) => ({
                    name: getClientDisplayName(client),
                    type: "line",
                    data: requestsTimeSeries.map((d) => d[client] || 0),
                    smooth: true,
                    lineStyle: { width: 2 },
                    itemStyle: { color: COLOR_PALETTE[index % COLOR_PALETTE.length] },
                  })),
                }}
                style={{ height: "256px" }}
              />
            )}
          </CardContent>
        </Card>

        {/* Reads by Client */}
        <Card className="bg-white/10 backdrop-blur-3xl border-white/20 shadow-xl">
          <CardContent className="pt-6">
            <h3 className="text-lg text-white font-semibold mb-4">Reads by Client</h3>
            {readsByClient.length === 0 ? (
              <div className="flex items-center justify-center h-64 text-white/60 text-lg">
                No read activity yet...
              </div>
            ) : (
              <ReactECharts
                option={{
                  backgroundColor: "transparent",
                  tooltip: {
                    trigger: "axis",
                    backgroundColor: "rgba(0, 0, 0, 0.8)",
                    borderColor: "#333",
                    textStyle: { color: "#fff" },
                    axisPointer: { type: "shadow" },
                  },
                  grid: {
                    left: "15%",
                    right: "4%",
                    bottom: "3%",
                    top: "3%",
                    containLabel: false,
                  },
                  xAxis: {
                    type: "value",
                    axisLine: { lineStyle: { color: "rgba(255, 255, 255, 0.2)" } },
                    axisLabel: { color: "#fff" },
                    splitLine: { lineStyle: { color: "rgba(255, 255, 255, 0.1)" } },
                  },
                  yAxis: {
                    type: "category",
                    data: readsByClient.map((d) => getClientDisplayName(d.client)),
                    axisLine: { lineStyle: { color: "rgba(255, 255, 255, 0.2)" } },
                    axisLabel: { color: "#fff" },
                  },
                  series: [
                    {
                      type: "bar",
                      data: readsByClient.map((d) => d.reads),
                      itemStyle: { color: "#3b82f6" },
                      barWidth: "60%",
                    },
                  ],
                }}
                style={{ height: "256px" }}
              />
            )}
          </CardContent>
        </Card>

        {/* Writes by Client (24h) */}
        <Card className="bg-white/10 backdrop-blur-3xl border-white/20 shadow-xl">
          <CardContent className="pt-6">
            <h3 className="text-lg text-white font-semibold mb-4">Writes by Client</h3>
            {writesByClient.length === 0 ? (
              <div className="flex items-center justify-center h-64 text-white/60 text-lg">
                No data available yet...
              </div>
            ) : (
              <ReactECharts
                option={{
                  backgroundColor: "transparent",
                  tooltip: {
                    trigger: "axis",
                    backgroundColor: "rgba(0, 0, 0, 0.8)",
                    borderColor: "#333",
                    textStyle: { color: "#fff" },
                    axisPointer: { type: "shadow" },
                  },
                  grid: {
                    left: "15%",
                    right: "4%",
                    bottom: "3%",
                    top: "3%",
                    containLabel: false,
                  },
                  xAxis: {
                    type: "value",
                    axisLine: { lineStyle: { color: "rgba(255, 255, 255, 0.2)" } },
                    axisLabel: { color: "#fff" },
                    splitLine: { lineStyle: { color: "rgba(255, 255, 255, 0.1)" } },
                  },
                  yAxis: {
                    type: "category",
                    data: writesByClient.map((d) => getClientDisplayName(d.client)),
                    axisLine: { lineStyle: { color: "rgba(255, 255, 255, 0.2)" } },
                    axisLabel: { color: "#fff" },
                  },
                  series: [
                    {
                      type: "bar",
                      data: writesByClient.map((d) => d.writes),
                      itemStyle: { color: "#14b8a6" },
                      barWidth: "60%",
                    },
                  ],
                }}
                style={{ height: "256px" }}
              />
            )}
          </CardContent>
        </Card>

        {/* Success Rate by Client - Bottom Left */}
        <Card className="bg-white/10 backdrop-blur-3xl border-white/20 shadow-xl">
          <CardContent className="pt-6">
            <h3 className="text-lg text-white font-semibold mb-4">Success Rate by Client</h3>
            {successRateTimeSeriesByClient.length === 0 ? (
              <div className="flex items-center justify-center h-64 text-white/60 text-lg">
                No data available yet...
              </div>
            ) : (
              <ReactECharts
                option={{
                  backgroundColor: "transparent",
                  tooltip: {
                    trigger: "axis",
                    backgroundColor: "rgba(0, 0, 0, 0.8)",
                    borderColor: "#333",
                    textStyle: { color: "#fff" },
                    formatter: (params: any) => {
                      let result = `${params[0].axisValue}<br/>`
                      params.forEach((param: any) => {
                        result += `${param.marker} ${param.seriesName}: ${param.value.toFixed(1)}%<br/>`
                      })
                      return result
                    },
                  },
                  grid: {
                    left: "3%",
                    right: "4%",
                    bottom: "15%",
                    top: "3%",
                    containLabel: true,
                  },
                  xAxis: {
                    type: "category",
                    data: successRateTimeSeriesByClient.map((d) => formatTimeForChart(d.time as number)),
                    axisLine: { lineStyle: { color: "rgba(255, 255, 255, 0.2)" } },
                    axisLabel: { color: "#fff", rotate: 45 },
                    boundaryGap: false,
                  },
                  yAxis: {
                    type: "value",
                    max: 100,
                    axisLine: { lineStyle: { color: "rgba(255, 255, 255, 0.2)" } },
                    axisLabel: { color: "#fff", formatter: "{value}%" },
                    splitLine: { lineStyle: { color: "rgba(255, 255, 255, 0.1)" } },
                  },
                  legend: {
                    data: clientNames.map(getClientDisplayName),
                    textStyle: { color: "#fff", fontSize: 11 },
                    bottom: 0,
                    type: "plain",
                  },
                  series: clientNames.map((client, index) => ({
                    name: getClientDisplayName(client),
                    type: "line",
                    data: successRateTimeSeriesByClient.map((d) => d[client] || 0),
                    smooth: true,
                    lineStyle: { width: 2 },
                    itemStyle: { color: COLOR_PALETTE[index % COLOR_PALETTE.length] },
                  })),
                }}
                style={{ height: "256px" }}
              />
            )}
          </CardContent>
        </Card>

        {/* Writes - Bottom Right */}
        <Card className="bg-white/10 backdrop-blur-3xl border-white/20 shadow-xl">
          <CardContent className="pt-6">
            <h3 className="text-lg text-white font-semibold mb-4">Writes</h3>
            {writesByClient.length === 0 ? (
              <div className="flex items-center justify-center h-64 text-white/60 text-lg">
                No data available yet...
              </div>
            ) : (
              <ReactECharts
                option={{
                  backgroundColor: "transparent",
                  tooltip: {
                    trigger: "axis",
                    backgroundColor: "rgba(0, 0, 0, 0.8)",
                    borderColor: "#333",
                    textStyle: { color: "#fff" },
                    axisPointer: { type: "shadow" },
                  },
                  grid: {
                    left: "15%",
                    right: "4%",
                    bottom: "3%",
                    top: "3%",
                    containLabel: false,
                  },
                  xAxis: {
                    type: "value",
                    axisLine: { lineStyle: { color: "rgba(255, 255, 255, 0.2)" } },
                    axisLabel: { color: "#fff" },
                    splitLine: { lineStyle: { color: "rgba(255, 255, 255, 0.1)" } },
                  },
                  yAxis: {
                    type: "category",
                    data: writesByClient.map((d) => d.client),
                    axisLine: { lineStyle: { color: "rgba(255, 255, 255, 0.2)" } },
                    axisLabel: { color: "#fff" },
                  },
                  series: [
                    {
                      type: "bar",
                      data: writesByClient.map((d) => d.writes),
                      itemStyle: { color: "#14b8a6" },
                      barWidth: "60%",
                    },
                  ],
                }}
                style={{ height: "256px" }}
              />
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="bg-white/10 backdrop-blur-3xl border-white/20 shadow-xl">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold text-white">Access Log</h2>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/60 h-4 w-4" />
              <Input
                placeholder="Search logs..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value)
                  setCurrentPage(1)
                }}
                className="pl-10 bg-white/15 border-white/20 text-white placeholder:text-white/50"
              />
            </div>
          </div>

          {fullAuditLog.length === 0 ? (
            <div className="flex items-center justify-center h-64 text-white/60 text-lg">
              No data available yet...
            </div>
          ) : (
            <>
              <div className="rounded-lg border border-white/20 overflow-hidden bg-white/10 backdrop-blur-md">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-white/60 backdrop-blur-sm hover:bg-white/70 border-white/20">
                  <TableHead
                    className="text-gray-900 font-semibold cursor-pointer hover:text-black transition-colors w-[140px]"
                    onClick={() => handleSort("date")}
                  >
                    Date {sortField === "date" && (sortDirection === "asc" ? "↑" : "↓")}
                  </TableHead>
                  <TableHead
                    className="text-gray-900 font-semibold cursor-pointer hover:text-black transition-colors pl-8"
                    onClick={() => handleSort("client")}
                  >
                    Client {sortField === "client" && (sortDirection === "asc" ? "↑" : "↓")}
                  </TableHead>
                  <TableHead
                    className="text-gray-900 font-semibold cursor-pointer hover:text-black transition-colors w-[140px]"
                    onClick={() => handleSort("operation")}
                  >
                    Operation {sortField === "operation" && (sortDirection === "asc" ? "↑" : "↓")}
                  </TableHead>
                  <TableHead
                    className="text-gray-900 font-semibold cursor-pointer hover:text-black transition-colors w-[280px] text-right"
                    onClick={() => handleSort("status")}
                  >
                    Status {sortField === "status" && (sortDirection === "asc" ? "↑" : "↓")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedLog.map((log, index) => (
                  <TableRow
                    key={log.id}
                    className={`border-white/20 hover:bg-white/20 transition-colors cursor-pointer ${
                      index % 2 === 0 ? "bg-white/3" : "bg-white/10"
                    }`}
                  >
                    <TableCell className="font-mono text-sm text-white/95 w-[140px]">{formatDate(log.date)}</TableCell>
                    <TableCell className="font-mono text-base text-white/95 font-medium pl-8">{getClientDisplayName(log.client)}</TableCell>
                    <TableCell className="text-white/90 text-base w-[140px]">
                      {getOperationBadge(log.operation)}
                    </TableCell>
                    <TableCell className="w-[280px] text-right">
                      {getStatusBadge(log.status, log.description)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-white/80">
                  Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, sortedLog.length)}{" "}
                  of {sortedLog.length} entries
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="bg-white/15 border-white/20 text-white hover:bg-white/20"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="bg-white/15 border-white/20 text-white hover:bg-white/20"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
