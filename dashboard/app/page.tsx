"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import ReactECharts from "echarts-for-react"
import { useState, useEffect } from "react"
import { ChevronLeft, ChevronRight, Search } from "lucide-react"

// Human-readable client names
const CLIENT_NAMES = ["Cursor", "Visual Studio Code", "Claude Desktop", "GitHub Copilot", "Windsurf"]

const generateRequestsTimeSeries = (points = 15) => {
  const now = Date.now()
  const interval = 60000
  return Array.from({ length: points }, (_, i) => {
    const time = new Date(now - (points - 1 - i) * interval)
    return {
      time: time.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
      Cursor: Math.random() * 8 + 2,
      "Visual Studio Code": Math.random() * 6 + 1,
      "Claude Desktop": Math.random() * 4 + 0.5,
      "GitHub Copilot": Math.random() * 3 + 0.5,
      Windsurf: Math.random() * 5 + 1,
    }
  })
}

const generateSuccessRateTimeSeries = (points = 15) => {
  const now = Date.now()
  const interval = 60000
  return Array.from({ length: points }, (_, i) => {
    const time = new Date(now - (points - 1 - i) * interval)
    return {
      time: time.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
      Cursor: Math.random() * 0.08 + 0.02,
      "Visual Studio Code": Math.random() * 0.3 + 0.1,
      "Claude Desktop": Math.random() * 0.5 + 0.3,
      "GitHub Copilot": Math.random() * 0.2 + 0.15,
      Windsurf: Math.random() * 0.4 + 0.2,
    }
  })
}

const generateReadsByClient = () => {
  return CLIENT_NAMES.map((client) => ({
    client,
    reads: Math.floor(Math.random() * 300) + 100,
  }))
}

const generateWritesByClient = () => {
  return CLIENT_NAMES.map((client) => ({
    client,
    writes: Math.floor(Math.random() * 200) + 50,
  }))
}

const OPERATIONS = ["Read", "Write", "Update", "Delete"]
const STATUSES = ["Success", "Warning", "Error", "Canceled"]

const generateAuditLog = () => {
  return Array.from({ length: 50 }, (_, i) => {
    const client = CLIENT_NAMES[Math.floor(Math.random() * CLIENT_NAMES.length)]
    const operation = OPERATIONS[Math.floor(Math.random() * OPERATIONS.length)]
    const statusType = Math.random()
    let status = "Success"
    let description = ""

    if (statusType > 0.95) {
      status = "Error"
      description = ["Connection timeout", "Invalid query", "Database locked", "Permission denied"][
        Math.floor(Math.random() * 4)
      ]
    } else if (statusType > 0.9) {
      status = "Warning"
      description = ["Slow query", "Large result set", "Cache miss"][Math.floor(Math.random() * 3)]
    } else if (statusType > 0.88) {
      status = "Canceled"
      description = "Request canceled by client"
    }

    return {
      id: i,
      date: new Date(Date.now() - Math.random() * 86400000 * 7),
      client,
      operation,
      status,
      description,
    }
  })
}

type SortField = "date" | "client" | "operation" | "status"
type SortDirection = "asc" | "desc"

export default function CyberMemDashboard() {
  const [stats, setStats] = useState({
    memoryRecords: 15847,
    totalClients: 5,
    clientGrowth: 2,
    topWriter: { name: "Cursor", count: 1247 },
    topReader: { name: "Visual Studio Code", count: 2156 },
    lastWriter: { name: "Claude Desktop", timestamp: new Date(Date.now() - 120000) },
    lastReader: { name: "GitHub Copilot", timestamp: new Date(Date.now() - 45000) },
    successRate: 96.4,
    totalRequests: 12847,
  })

  const [sparklineData, setSparklineData] = useState({
    memoryRecords: Array.from({ length: 20 }, () => Math.random() * 2000 + 14000),
    totalClients: Array.from({ length: 20 }, () => Math.floor(Math.random() * 2) + 4),
    successRate: Array.from({ length: 20 }, () => Math.random() * 3 + 94),
    totalRequests: Array.from({ length: 20 }, () => Math.random() * 2000 + 11000),
  })

  const [readsByClient, setReadsByClient] = useState(generateReadsByClient())
  const [writesByClient, setWritesByClient] = useState(generateWritesByClient())
  const [requestsTimeSeries, setRequestsTimeSeries] = useState(generateRequestsTimeSeries())
  const [successRateTimeSeries, setSuccessRateTimeSeries] = useState(generateSuccessRateTimeSeries())
  const [fullAuditLog, setFullAuditLog] = useState(generateAuditLog())

  const [lastUpdate, setLastUpdate] = useState(0)
  const [searchTerm, setSearchTerm] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [sortField, setSortField] = useState<SortField>("date")
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc")
  const itemsPerPage = 10

  // Auto-refresh every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      const newStats = {
        memoryRecords: Math.floor(Math.random() * 2000) + 14000,
        totalClients: Math.floor(Math.random() * 2) + 4,
        clientGrowth: Math.floor(Math.random() * 3),
        topWriter: {
          name: CLIENT_NAMES[Math.floor(Math.random() * CLIENT_NAMES.length)],
          count: Math.floor(Math.random() * 500) + 1000,
        },
        topReader: {
          name: CLIENT_NAMES[Math.floor(Math.random() * CLIENT_NAMES.length)],
          count: Math.floor(Math.random() * 1000) + 1500,
        },
        lastWriter: {
          name: CLIENT_NAMES[Math.floor(Math.random() * CLIENT_NAMES.length)],
          timestamp: new Date(Date.now() - Math.random() * 300000),
        },
        lastReader: {
          name: CLIENT_NAMES[Math.floor(Math.random() * CLIENT_NAMES.length)],
          timestamp: new Date(Date.now() - Math.random() * 300000),
        },
        successRate: Math.random() * 3 + 94,
        totalRequests: Math.floor(Math.random() * 2000) + 11000,
      }
      setStats(newStats)
      setSparklineData((prev) => ({
        memoryRecords: [...prev.memoryRecords.slice(1), newStats.memoryRecords],
        totalClients: [...prev.totalClients.slice(1), newStats.totalClients],
        successRate: [...prev.successRate.slice(1), newStats.successRate],
        totalRequests: [...prev.totalRequests.slice(1), newStats.totalRequests],
      }))
      setReadsByClient(generateReadsByClient())
      setWritesByClient(generateWritesByClient())
      setRequestsTimeSeries(generateRequestsTimeSeries())
      setSuccessRateTimeSeries(generateSuccessRateTimeSeries())
      setFullAuditLog(generateAuditLog())
      setLastUpdate(0)
    }, 5000)

    return () => clearInterval(interval)
  }, [])

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
        <div>
          <h1
            className="text-5xl font-semibold text-white tracking-wider"
            style={{ fontFamily: "'Exo 2', sans-serif" }}
          >
            CyberMem
          </h1>
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
          <CardContent className="pt-4 pb-0 relative">
            <div className="text-lg font-medium text-white/90 mb-2">Memory Records</div>
            <div className="text-6xl font-bold text-white mb-2">{stats.memoryRecords.toLocaleString()}</div>
            <div className="absolute bottom-0 left-0 right-0 h-16 -mx-6 -mb-6">
              <ReactECharts
                option={{
                  backgroundColor: "transparent",
                  grid: { left: 0, right: 0, top: 0, bottom: 0 },
                  xAxis: { type: "category", show: false },
                  yAxis: { type: "value", show: false },
                  series: [
                    {
                      type: "line",
                      data: sparklineData.memoryRecords,
                      smooth: true,
                      showSymbol: false,
                      lineStyle: { width: 0 },
                      areaStyle: { color: "rgba(255, 255, 255, 0.35)" },
                    },
                  ],
                }}
                style={{ height: "64px" }}
                opts={{ renderer: "svg" }}
              />
            </div>
          </CardContent>
        </Card>

        {/* Total Clients */}
        <Card className="bg-white/15 backdrop-blur-2xl border-white/20 shadow-xl overflow-hidden">
          <CardContent className="pt-4 pb-0 relative">
            <div className="text-lg font-medium text-white/90 mb-2">Total Clients</div>
            <div className="text-6xl font-bold text-white mb-2">
              {stats.totalClients}{" "}
              <span className="text-2xl text-white/90 font-semibold">+{stats.clientGrowth} this month</span>
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-16 -mx-6 -mb-6">
              <ReactECharts
                option={{
                  backgroundColor: "transparent",
                  grid: { left: 0, right: 0, top: 0, bottom: 0 },
                  xAxis: { type: "category", show: false },
                  yAxis: { type: "value", show: false },
                  series: [
                    {
                      type: "line",
                      data: sparklineData.totalClients,
                      smooth: true,
                      showSymbol: false,
                      lineStyle: { width: 0 },
                      areaStyle: { color: "rgba(255, 255, 255, 0.35)" },
                    },
                  ],
                }}
                style={{ height: "64px" }}
                opts={{ renderer: "svg" }}
              />
            </div>
          </CardContent>
        </Card>

        {/* Success Rate */}
        <Card className="bg-white/15 backdrop-blur-2xl border-white/20 shadow-xl overflow-hidden">
          <CardContent className="pt-4 pb-0 relative">
            <div className="text-lg font-medium text-white/90 mb-2">Success Rate</div>
            <div className="text-6xl font-bold text-white mb-2">{stats.successRate.toFixed(1)}%</div>
            <div className="absolute bottom-0 left-0 right-0 h-16 -mx-6 -mb-6">
              <ReactECharts
                option={{
                  backgroundColor: "transparent",
                  grid: { left: 0, right: 0, top: 0, bottom: 0 },
                  xAxis: { type: "category", show: false },
                  yAxis: { type: "value", show: false },
                  series: [
                    {
                      type: "line",
                      data: sparklineData.successRate,
                      smooth: true,
                      showSymbol: false,
                      lineStyle: { width: 0 },
                      areaStyle: { color: "rgba(255, 255, 255, 0.35)" },
                    },
                  ],
                }}
                style={{ height: "64px" }}
                opts={{ renderer: "svg" }}
              />
            </div>
          </CardContent>
        </Card>

        {/* Total Requests */}
        <Card className="bg-white/15 backdrop-blur-2xl border-white/20 text-white shadow-xl overflow-hidden">
          <CardContent className="pt-4 pb-0 relative">
            <div className="text-lg font-medium text-white/90 mb-2">Total Requests</div>
            <div className="text-6xl font-bold text-white mb-2">{stats.totalRequests.toLocaleString()}</div>
            <div className="absolute bottom-0 left-0 right-0 h-16 -mx-6 -mb-6">
              <ReactECharts
                option={{
                  backgroundColor: "transparent",
                  grid: { left: 0, right: 0, top: 0, bottom: 0 },
                  xAxis: { type: "category", show: false },
                  yAxis: { type: "value", show: false },
                  series: [
                    {
                      type: "line",
                      data: sparklineData.totalRequests,
                      smooth: true,
                      showSymbol: false,
                      lineStyle: { width: 0 },
                      areaStyle: { color: "rgba(255, 255, 255, 0.35)" },
                    },
                  ],
                }}
                style={{ height: "64px" }}
                opts={{ renderer: "svg" }}
              />
            </div>
          </CardContent>
        </Card>

        {/* Most Writing Client */}
        <Card className="bg-white/15 backdrop-blur-2xl border-white/20 text-white shadow-xl overflow-hidden">
          <CardContent className="pt-4 pb-0 relative">
            <div className="text-lg font-medium text-white/90 mb-2">Most Writing Client</div>
            <div className="text-4xl font-bold text-white mb-1 truncate">{stats.topWriter.name}</div>
            <div className="text-xl text-white/80 mb-4 whitespace-nowrap">
              {stats.topWriter.count.toLocaleString()} writes
            </div>
          </CardContent>
        </Card>

        {/* Most Reading Client */}
        <Card className="bg-white/15 backdrop-blur-2xl border-white/20 text-white shadow-xl overflow-hidden">
          <CardContent className="pt-4 pb-0 relative">
            <div className="text-lg font-medium text-white/90 mb-2">Most Reading Client</div>
            <div className="text-4xl font-bold text-white mb-1 truncate">{stats.topReader.name}</div>
            <div className="text-xl text-white/80 mb-4 whitespace-nowrap">
              {stats.topReader.count.toLocaleString()} reads
            </div>
          </CardContent>
        </Card>

        {/* Last Writer */}
        <Card className="bg-white/15 backdrop-blur-2xl border-white/20 text-white shadow-xl overflow-hidden">
          <CardContent className="pt-4 pb-0 relative">
            <div className="text-lg font-medium text-white/90 mb-2">Last Writer</div>
            <div className="text-4xl font-bold text-white mb-1 truncate">{stats.lastWriter.name}</div>
            <div className="text-xl text-white/80 mb-4">{formatTimestamp(stats.lastWriter.timestamp)}</div>
          </CardContent>
        </Card>

        {/* Last Reader */}
        <Card className="bg-white/15 backdrop-blur-2xl border-white/20 text-white shadow-xl overflow-hidden">
          <CardContent className="pt-4 pb-0 relative">
            <div className="text-lg font-medium text-white/90 mb-2">Last Reader</div>
            <div className="text-4xl font-bold text-white mb-1 truncate">{stats.lastReader.name}</div>
            <div className="text-xl text-white/80 mb-4">{formatTimestamp(stats.lastReader.timestamp)}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Requests Rate - Top Left */}
        <Card className="bg-white/10 backdrop-blur-3xl border-white/20 shadow-xl">
          <CardContent className="pt-6">
            <h3 className="text-lg text-white font-semibold mb-4">Requests Rate</h3>
            <ReactECharts
              option={{
                backgroundColor: "transparent",
                tooltip: {
                  trigger: "axis",
                  backgroundColor: "rgba(0, 0, 0, 0.8)",
                  borderColor: "#333",
                  textStyle: { color: "#fff" },
                },
                legend: {
                  data: CLIENT_NAMES,
                  textStyle: { color: "#fff" },
                  bottom: 0,
                },
                grid: {
                  left: "3%",
                  right: "4%",
                  bottom: "15%",
                  top: "5%",
                  containLabel: true,
                },
                xAxis: {
                  type: "category",
                  boundaryGap: false,
                  data: requestsTimeSeries.map((d) => d.time),
                  axisLine: { lineStyle: { color: "rgba(255, 255, 255, 0.2)" } },
                  axisLabel: { color: "#fff" },
                },
                yAxis: {
                  type: "value",
                  axisLine: { lineStyle: { color: "rgba(255, 255, 255, 0.2)" } },
                  axisLabel: { color: "#fff", formatter: "{value} req/s" },
                  splitLine: { lineStyle: { color: "rgba(255, 255, 255, 0.1)" } },
                },
                series: [
                  {
                    name: "Cursor",
                    type: "line",
                    smooth: true,
                    data: requestsTimeSeries.map((d) => d.Cursor),
                    itemStyle: { color: "#14b8a6" },
                    lineStyle: { width: 2 },
                  },
                  {
                    name: "Visual Studio Code",
                    type: "line",
                    smooth: true,
                    data: requestsTimeSeries.map((d) => d["Visual Studio Code"]),
                    itemStyle: { color: "#06b6d4" },
                    lineStyle: { width: 2 },
                  },
                  {
                    name: "Claude Desktop",
                    type: "line",
                    smooth: true,
                    data: requestsTimeSeries.map((d) => d["Claude Desktop"]),
                    itemStyle: { color: "#8b5cf6" },
                    lineStyle: { width: 2 },
                  },
                  {
                    name: "GitHub Copilot",
                    type: "line",
                    smooth: true,
                    data: requestsTimeSeries.map((d) => d["GitHub Copilot"]),
                    itemStyle: { color: "#10b981" },
                    lineStyle: { width: 2 },
                  },
                  {
                    name: "Windsurf",
                    type: "line",
                    smooth: true,
                    data: requestsTimeSeries.map((d) => d.Windsurf),
                    itemStyle: { color: "#f59e0b" },
                    lineStyle: { width: 2 },
                  },
                ],
              }}
              style={{ height: "256px" }}
            />
          </CardContent>
        </Card>

        {/* Reads - Top Right */}
        <Card className="bg-white/10 backdrop-blur-3xl border-white/20 shadow-xl">
          <CardContent className="pt-6">
            <h3 className="text-lg text-white font-semibold mb-4">Reads</h3>
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
                  data: readsByClient.map((d) => d.client),
                  axisLine: { lineStyle: { color: "rgba(255, 255, 255, 0.2)" } },
                  axisLabel: { color: "#fff" },
                },
                series: [
                  {
                    type: "bar",
                    data: readsByClient.map((d) => d.reads),
                    itemStyle: { color: "#14b8a6" },
                    barWidth: "60%",
                  },
                ],
              }}
              style={{ height: "256px" }}
            />
          </CardContent>
        </Card>

        {/* Success Rate - Bottom Left */}
        <Card className="bg-white/10 backdrop-blur-3xl border-white/20 shadow-xl">
          <CardContent className="pt-6">
            <h3 className="text-lg text-white font-semibold mb-4">Success Rate</h3>
            <ReactECharts
              option={{
                backgroundColor: "transparent",
                tooltip: {
                  trigger: "axis",
                  backgroundColor: "rgba(0, 0, 0, 0.8)",
                  borderColor: "#333",
                  textStyle: { color: "#fff" },
                },
                legend: {
                  data: CLIENT_NAMES,
                  textStyle: { color: "#fff" },
                  bottom: 0,
                },
                grid: {
                  left: "3%",
                  right: "4%",
                  bottom: "15%",
                  top: "5%",
                  containLabel: true,
                },
                xAxis: {
                  type: "category",
                  boundaryGap: false,
                  data: successRateTimeSeries.map((d) => d.time),
                  axisLine: { lineStyle: { color: "rgba(255, 255, 255, 0.2)" } },
                  axisLabel: { color: "#fff" },
                },
                yAxis: {
                  type: "value",
                  axisLine: { lineStyle: { color: "rgba(255, 255, 255, 0.2)" } },
                  axisLabel: { color: "#fff", formatter: "{value}s" },
                  splitLine: { lineStyle: { color: "rgba(255, 255, 255, 0.1)" } },
                },
                series: [
                  {
                    name: "Cursor",
                    type: "line",
                    smooth: true,
                    data: successRateTimeSeries.map((d) => d.Cursor),
                    itemStyle: { color: "#06b6d4" },
                    lineStyle: { width: 2 },
                  },
                  {
                    name: "Visual Studio Code",
                    type: "line",
                    smooth: true,
                    data: successRateTimeSeries.map((d) => d["Visual Studio Code"]),
                    itemStyle: { color: "#14b8a6" },
                    lineStyle: { width: 2 },
                  },
                  {
                    name: "Claude Desktop",
                    type: "line",
                    smooth: true,
                    data: successRateTimeSeries.map((d) => d["Claude Desktop"]),
                    itemStyle: { color: "#10b981" },
                    lineStyle: { width: 2 },
                  },
                  {
                    name: "GitHub Copilot",
                    type: "line",
                    smooth: true,
                    data: successRateTimeSeries.map((d) => d["GitHub Copilot"]),
                    itemStyle: { color: "#8b5cf6" },
                    lineStyle: { width: 2 },
                  },
                  {
                    name: "Windsurf",
                    type: "line",
                    smooth: true,
                    data: successRateTimeSeries.map((d) => d.Windsurf),
                    itemStyle: { color: "#f59e0b" },
                    lineStyle: { width: 2 },
                  },
                ],
              }}
              style={{ height: "256px" }}
            />
          </CardContent>
        </Card>

        {/* Writes - Bottom Right */}
        <Card className="bg-white/10 backdrop-blur-3xl border-white/20 shadow-xl">
          <CardContent className="pt-6">
            <h3 className="text-lg text-white font-semibold mb-4">Writes</h3>
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
                    <TableCell className="font-mono text-base text-white/95 font-medium pl-8">{log.client}</TableCell>
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
        </CardContent>
      </Card>
    </div>
  )
}
