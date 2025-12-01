"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import ReactECharts from "echarts-for-react"
import { useState, useEffect } from "react"
import { ChevronLeft, ChevronRight, Search, CheckCircle2, XCircle, AlertTriangle } from "lucide-react"

// Sample data
const generateTimeSeriesData = () => {
  const now = Date.now()
  return Array.from({ length: 15 }, (_, i) => ({
    time: new Date(now - (14 - i) * 60000).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
    "dev-secret-key": Math.random() * 8 + 2,
    "client-alpha": Math.random() * 6 + 1,
    "client-beta": Math.random() * 4 + 0.5,
    "client-gamma": Math.random() * 3 + 0.5,
    "prod-key-01": Math.random() * 5 + 1,
  }))
}

const clientTotals = [
  { client: "dev-secret-key", requests: 125 },
  { client: "client-alpha", requests: 87 },
  { client: "client-beta", requests: 45 },
  { client: "client-gamma", requests: 38 },
  { client: "prod-key-01", requests: 47 },
]

const percentileData = Array.from({ length: 15 }, (_, i) => ({
  time: new Date(Date.now() - (14 - i) * 60000).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
  p50: Math.random() * 0.08 + 0.02,
  p95: Math.random() * 0.3 + 0.1,
  p99: Math.random() * 0.5 + 0.3,
}))

const endpointData = [
  { endpoint: "/memory/add", requests: 145 },
  { endpoint: "/memory/query", requests: 112 },
  { endpoint: "/memory/update", requests: 45 },
  { endpoint: "/memory/delete", requests: 23 },
  { endpoint: "/memory/search", requests: 17 },
]

const fullAuditLog = [
  { client: "dev-secret-key", endpoint: "/memory/add", method: "POST", status: 200, requests: 125 },
  { client: "client-alpha", endpoint: "/memory/query", method: "POST", status: 200, requests: 87 },
  { client: "client-beta", endpoint: "/memory/add", method: "POST", status: 403, requests: 45 },
  { client: "client-gamma", endpoint: "/memory/update", method: "PUT", status: 200, requests: 38 },
  { client: "prod-key-01", endpoint: "/memory/delete", method: "DELETE", status: 500, requests: 47 },
  { client: "dev-secret-key", endpoint: "/memory/query", method: "POST", status: 200, requests: 68 },
  { client: "client-alpha", endpoint: "/memory/search", method: "GET", status: 200, requests: 34 },
  { client: "client-beta", endpoint: "/memory/update", method: "PUT", status: 403, requests: 12 },
  { client: "prod-key-01", endpoint: "/memory/add", method: "POST", status: 200, requests: 89 },
  { client: "client-gamma", endpoint: "/memory/query", method: "POST", status: 200, requests: 56 },
  { client: "dev-secret-key", endpoint: "/memory/search", method: "GET", status: 200, requests: 23 },
  { client: "client-alpha", endpoint: "/memory/delete", method: "DELETE", status: 403, requests: 8 },
  { client: "client-beta", endpoint: "/memory/query", method: "POST", status: 200, requests: 91 },
  { client: "prod-key-01", endpoint: "/memory/update", method: "PUT", status: 500, requests: 15 },
  { client: "client-gamma", endpoint: "/memory/add", method: "POST", status: 200, requests: 72 },
]

type SortField = "client" | "endpoint" | "method" | "status" | "requests"
type SortDirection = "asc" | "desc"

export default function CyberMemDashboard() {
  const [stats, setStats] = useState({
    totalRequests: 342,
    successRate: 94.2,
    avgResponseTime: 0.045,
    activeClients: 5,
  })

  // Sparkline data for stat cards
  const [sparklineData, setSparklineData] = useState({
    totalRequests: Array.from({ length: 20 }, () => Math.random() * 100 + 300),
    successRate: Array.from({ length: 20 }, () => Math.random() * 10 + 90),
    avgResponseTime: Array.from({ length: 20 }, () => Math.random() * 0.1 + 0.02),
    activeClients: Array.from({ length: 20 }, () => Math.floor(Math.random() * 3) + 4),
  })

  const [timeSeriesData, setTimeSeriesData] = useState(generateTimeSeriesData())
  const [lastUpdate, setLastUpdate] = useState(0)
  const [searchTerm, setSearchTerm] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [sortField, setSortField] = useState<SortField>("requests")
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc")
  const itemsPerPage = 10

  // Auto-refresh every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      const newStats = {
        totalRequests: Math.floor(Math.random() * 100) + 300,
        successRate: Math.random() * 10 + 90,
        avgResponseTime: Math.random() * 0.1 + 0.02,
        activeClients: Math.floor(Math.random() * 3) + 4,
      }
      setStats(newStats)
      setSparklineData((prev) => ({
        totalRequests: [...prev.totalRequests.slice(1), newStats.totalRequests],
        successRate: [...prev.successRate.slice(1), newStats.successRate],
        avgResponseTime: [...prev.avgResponseTime.slice(1), newStats.avgResponseTime],
        activeClients: [...prev.activeClients.slice(1), newStats.activeClients],
      }))
      setTimeSeriesData(generateTimeSeriesData())
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
      log.endpoint.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.method.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.status.toString().includes(searchTerm),
  )

  const sortedLog = [...filteredLog].sort((a, b) => {
    const aValue = a[sortField]
    const bValue = b[sortField]
    const modifier = sortDirection === "asc" ? 1 : -1

    if (typeof aValue === "string" && typeof bValue === "string") {
      return aValue.localeCompare(bValue) * modifier
    }
    return ((aValue as number) - (bValue as number)) * modifier
  })

  const paginatedLog = sortedLog.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  const totalPages = Math.ceil(sortedLog.length / itemsPerPage)

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortDirection("desc")
    }
    setCurrentPage(1)
  }

  const getStatusBadge = (status: number) => {
    if (status >= 200 && status < 300) {
      return (
        <Badge className="bg-emerald-500 text-white font-bold px-3 py-1 text-sm flex items-center gap-1">
          {status}
        </Badge>
      )
    }
    if (status >= 400 && status < 500) {
      return (
        <Badge className="bg-amber-500 text-white font-bold px-3 py-1 text-sm flex items-center gap-1">
          {status}
        </Badge>
      )
    }
    return (
      <Badge className="bg-red-500 text-white font-bold px-3 py-1 text-sm flex items-center gap-1">
        {status}
      </Badge>
    )
  }

  const getMethodBadge = (method: string) => {
    const colors: Record<string, string> = {
      POST: "bg-blue-600 text-white",
      GET: "bg-teal-600 text-white",
      PUT: "bg-purple-600 text-white",
      DELETE: "bg-rose-600 text-white",
    }
    return (
      <Badge className={`${colors[method] || "bg-gray-600 text-white"} font-bold px-3 py-1 text-sm`}>
        {method}
      </Badge>
    )
  }

  return (
    <div className="min-h-screen text-white p-6">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-5xl font-semibold text-white tracking-wider" style={{ fontFamily: "'Exo 2', sans-serif" }}>
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

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
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

        <Card className="bg-white/15 backdrop-blur-2xl border-white/20 shadow-xl overflow-hidden">
          <CardContent className="pt-4 pb-0 relative">
            <div className="text-lg font-medium text-white/90 mb-2">Avg Response Time</div>
            <div className="text-6xl font-bold text-white mb-2">{stats.avgResponseTime.toFixed(3)}s</div>
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
                      data: sparklineData.avgResponseTime,
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

        <Card className="bg-white/15 backdrop-blur-2xl border-white/20 text-white shadow-xl overflow-hidden">
          <CardContent className="pt-4 pb-0 relative">
            <div className="text-lg font-medium text-white/90 mb-2">Active Clients</div>
            <div className="text-6xl font-bold text-white mb-2">{stats.activeClients}</div>
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
                      data: sparklineData.activeClients,
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
      </div>

      {/* Top Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Request Rate by Client */}
        <Card className="bg-white/10 backdrop-blur-3xl border-white/20 shadow-xl">
          <CardHeader>
            <CardTitle className="text-lg text-white">Request Rate by Client</CardTitle>
          </CardHeader>
          <CardContent>
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
                  data: ["dev-secret-key", "client-alpha", "client-beta", "client-gamma", "prod-key-01"],
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
                  data: timeSeriesData.map((d) => d.time),
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
                    name: "dev-secret-key",
                    type: "line",
                    smooth: true,
                    data: timeSeriesData.map((d) => d["dev-secret-key"]),
                    itemStyle: { color: "#14b8a6" },
                    lineStyle: { width: 2 },
                  },
                  {
                    name: "client-alpha",
                    type: "line",
                    smooth: true,
                    data: timeSeriesData.map((d) => d["client-alpha"]),
                    itemStyle: { color: "#06b6d4" },
                    lineStyle: { width: 2 },
                  },
                  {
                    name: "client-beta",
                    type: "line",
                    smooth: true,
                    data: timeSeriesData.map((d) => d["client-beta"]),
                    itemStyle: { color: "#8b5cf6" },
                    lineStyle: { width: 2 },
                  },
                  {
                    name: "client-gamma",
                    type: "line",
                    smooth: true,
                    data: timeSeriesData.map((d) => d["client-gamma"]),
                    itemStyle: { color: "#10b981" },
                    lineStyle: { width: 2 },
                  },
                  {
                    name: "prod-key-01",
                    type: "line",
                    smooth: true,
                    data: timeSeriesData.map((d) => d["prod-key-01"]),
                    itemStyle: { color: "#f59e0b" },
                    lineStyle: { width: 2 },
                  },
                ],
              }}
              style={{ height: "256px" }}
            />
          </CardContent>
        </Card>

        {/* Total Requests by Client */}
        <Card className="bg-white/10 backdrop-blur-3xl border-white/20 shadow-xl">
          <CardHeader>
            <CardTitle className="text-lg text-white">Total Requests by Client</CardTitle>
          </CardHeader>
          <CardContent>
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
                  data: clientTotals.map((d) => d.client),
                  axisLine: { lineStyle: { color: "rgba(255, 255, 255, 0.2)" } },
                  axisLabel: { color: "#fff" },
                },
                series: [
                  {
                    type: "bar",
                    data: clientTotals.map((d) => d.requests),
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

      {/* Bottom Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Response Time Percentiles */}
        <Card className="bg-white/10 backdrop-blur-3xl border-white/20 shadow-xl">
          <CardHeader>
            <CardTitle className="text-lg text-white">Response Time by Client (Percentiles)</CardTitle>
          </CardHeader>
          <CardContent>
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
                  data: ["p50", "p95", "p99"],
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
                  data: percentileData.map((d) => d.time),
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
                    name: "p50",
                    type: "line",
                    smooth: true,
                    data: percentileData.map((d) => d.p50),
                    itemStyle: { color: "#06b6d4" },
                    lineStyle: { width: 2 },
                  },
                  {
                    name: "p95",
                    type: "line",
                    smooth: true,
                    data: percentileData.map((d) => d.p95),
                    itemStyle: { color: "#14b8a6" },
                    lineStyle: { width: 2 },
                  },
                  {
                    name: "p99",
                    type: "line",
                    smooth: true,
                    data: percentileData.map((d) => d.p99),
                    itemStyle: { color: "#10b981" },
                    lineStyle: { width: 2 },
                  },
                ],
              }}
              style={{ height: "256px" }}
            />
          </CardContent>
        </Card>

        {/* Requests by Endpoint */}
        <Card className="bg-white/10 backdrop-blur-3xl border-white/20 shadow-xl">
          <CardHeader>
            <CardTitle className="text-lg text-white">Requests by Endpoint</CardTitle>
          </CardHeader>
          <CardContent>
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
                  left: "20%",
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
                  data: endpointData.map((d) => d.endpoint),
                  axisLine: { lineStyle: { color: "rgba(255, 255, 255, 0.2)" } },
                  axisLabel: { color: "#fff" },
                },
                series: [
                  {
                    type: "bar",
                    data: endpointData.map((d) => d.requests),
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

      {/* Audit Log Table */}
      <Card className="bg-white/10 backdrop-blur-3xl border-white/20 shadow-xl">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl text-white">Access Log</CardTitle>
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
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-white/20 overflow-hidden bg-white/10 backdrop-blur-md">
            <Table>
              <TableHeader>
                <TableRow className="bg-white/85 backdrop-blur-sm hover:bg-white/95 border-white/20">
                  <TableHead
                    className="text-gray-900 font-semibold cursor-pointer hover:text-black transition-colors w-[200px]"
                    onClick={() => handleSort("client")}
                  >
                    Client {sortField === "client" && (sortDirection === "asc" ? "↑" : "↓")}
                  </TableHead>
                  <TableHead
                    className="text-gray-900 font-semibold cursor-pointer hover:text-black transition-colors w-[180px]"
                    onClick={() => handleSort("endpoint")}
                  >
                    Endpoint {sortField === "endpoint" && (sortDirection === "asc" ? "↑" : "↓")}
                  </TableHead>
                  <TableHead
                    className="text-gray-900 font-semibold cursor-pointer hover:text-black transition-colors w-[80px]"
                    onClick={() => handleSort("method")}
                  >
                    Method {sortField === "method" && (sortDirection === "asc" ? "↑" : "↓")}
                  </TableHead>
                  <TableHead
                    className="text-gray-900 font-semibold cursor-pointer hover:text-black transition-colors w-[80px]"
                    onClick={() => handleSort("status")}
                  >
                    Status {sortField === "status" && (sortDirection === "asc" ? "↑" : "↓")}
                  </TableHead>
                  <TableHead
                    className="text-gray-900 font-semibold cursor-pointer hover:text-black transition-colors w-[100px] text-right"
                    onClick={() => handleSort("requests")}
                  >
                    Requests {sortField === "requests" && (sortDirection === "asc" ? "↑" : "↓")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedLog.map((log, index) => (
                  <TableRow
                    key={index}
                    className={`border-white/20 hover:bg-white/20 transition-colors cursor-pointer ${
                      index % 2 === 0 ? "bg-white/3" : "bg-white/10"
                    }`}
                  >
                    <TableCell className="font-mono text-base text-white/95 font-medium">{log.client}</TableCell>
                    <TableCell className="font-mono text-base text-white/95">{log.endpoint}</TableCell>
                    <TableCell>{getMethodBadge(log.method)}</TableCell>
                    <TableCell>{getStatusBadge(log.status)}</TableCell>
                    <TableCell className="text-right font-bold text-base text-white/95">{log.requests}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
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
