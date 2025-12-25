"use client"

import AuditLogTable from "@/components/dashboard/audit-log-table"
import ChartsSection from "@/components/dashboard/charts-section"
import DashboardHeader from "@/components/dashboard/header"
import LoginModal from "@/components/dashboard/login-modal"
import MCPConfigModal from "@/components/dashboard/mcp-config-modal"
import MetricsGrid from "@/components/dashboard/metrics-grid"
import SettingsModal from "@/components/dashboard/settings-modal"
import { useEffect, useState } from "react"

// Types
interface TrendState {
  change: string
  trend: "up" | "down" | "neutral"
  hasData: boolean
  data: number[]
}

const calculateTrend = (data: number[]) => {
  if (!data || data.length < 2) return { change: "0", trend: "neutral" as const, hasData: false, data: [] }

  const first = data[0]
  const last = data[data.length - 1]
  const diff = last - first

  const trend = diff > 0 ? "up" : diff < 0 ? "down" : "neutral"
  const prefix = diff > 0 ? "+" : ""

  return {
    change: `${prefix}${diff.toLocaleString()}`,
    trend: trend as "up" | "down" | "neutral",
    hasData: true,
    data
  }
}

export default function Dashboard() {
  const [showMCPConfig, setShowMCPConfig] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  // Check authentication on mount
  useEffect(() => {
    const auth = sessionStorage.getItem("authenticated")
    if (auth === "true") {
      setIsAuthenticated(true)
    }
  }, [])

  const handleLogin = (password: string) => {
    sessionStorage.setItem("authenticated", "true")
    setIsAuthenticated(true)
  }

  // State
  const [stats, setStats] = useState({
    memoryRecords: 0,
    totalClients: 0,
    successRate: 0,
    totalRequests: 0,
    topWriter: { name: "N/A", count: 0 },
    topReader: { name: "N/A", count: 0 },
    lastWriter: { name: "N/A", timestamp: 0 },
    lastReader: { name: "N/A", timestamp: 0 },
  })

  const [trends, setTrends] = useState<{
    memory: TrendState
    clients: TrendState
    success: TrendState
    requests: TrendState
  }>({
    memory: { change: "", trend: "neutral", hasData: false },
    clients: { change: "", trend: "neutral", hasData: false },
    success: { change: "", trend: "neutral", hasData: false },
    requests: { change: "", trend: "neutral", hasData: false },
  })

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch all-time metrics (no period filter)
        const res = await fetch(`/api/metrics`)
        if (res.ok) {
            const data = await res.json()

            // Fetch all logs for latest writer/reader
            const logsRes = await fetch(`/api/audit-logs`)
            let latestWriter = { name: "N/A", timestamp: 0 }
            let latestReader = { name: "N/A", timestamp: 0 }

            if (logsRes.ok) {
                const logsData = await logsRes.json()
                const resolveOperation = (log: any) => {
                  const normalizedOp = (log.operation || "").toString().toLowerCase()
                  if (normalizedOp === "read") return "Read"
                  if (normalizedOp === "write" || normalizedOp === "create") return "Write"
                  if (normalizedOp === "update") return "Update"
                  if (normalizedOp === "delete") return "Delete"
                  const method = (log.method || "").toString().toUpperCase()
                  if (method === "GET") return "Read"
                  if (method === "DELETE") return "Delete"
                  if (method === "PATCH" || method === "PUT") return "Update"
                  return "Write"
                }

                const mappedLogs = (logsData.logs || []).map((log: any, index: number) => {
                  const operation = resolveOperation(log)
                  const statusCode = parseInt(log.status)
                  let status = "Success"
                  let description = ""
                  if (statusCode >= 500) { status = "Error"; description = "Server error" }
                  else if (statusCode >= 400) { status = "Error"; description = statusCode === 401 ? "Unauthorized" : statusCode === 403 ? "Forbidden" : "Client error" }
                  else if (statusCode >= 300) { status = "Warning"; description = "Redirect" }

                  return {
                    id: index,
                    date: new Date(log.timestamp),
                    client: log.client || "Unknown",
                    operation,
                    status,
                    description,
                    timestamp: new Date(log.timestamp).getTime()
                  }
                })

                // Sort by date desc to find latest
                const sortedByDate = [...mappedLogs].sort((a, b) => b.timestamp - a.timestamp)

                // Find latest writer
                const wLog = sortedByDate.find(l => ["Write", "Update", "Delete"].includes(l.operation))
                if (wLog) {
                    latestWriter = { name: wLog.client, timestamp: wLog.timestamp }
                }

                // Find latest reader
                const rLog = sortedByDate.find(l => l.operation === "Read")
                if (rLog) {
                    latestReader = { name: rLog.client, timestamp: rLog.timestamp }
                }

                setFullAuditLog(mappedLogs)
            }

            setStats({
                memoryRecords: data.stats.memoryRecords ?? 0,
                totalClients: data.stats.totalClients ?? 0,
                successRate: data.stats.successRate ?? 0,
                totalRequests: data.stats.totalRequests ?? 0,
                topWriter: data.stats.topWriter ?? { name: "N/A", count: 0 },
                topReader: data.stats.topReader ?? { name: "N/A", count: 0 },
                lastWriter: latestWriter,
                lastReader: latestReader,
            })

            // We don't show trends anymore, so this code is not needed
            // But keeping it for backwards compatibility
            if (data.sparklines?.memoryRecords) {
                const trend = calculateTrend(data.sparklines.memoryRecords)
                setTrends(prev => ({ ...prev, memory: trend }))
            }

            if (data.sparklines?.totalClients) {
                const trend = calculateTrend(data.sparklines.totalClients)
                setTrends(prev => ({ ...prev, clients: trend }))
            }

            if (data.sparklines?.successRate) {
                const first = data.sparklines.successRate[0] || 0
                const last = data.sparklines.successRate[data.sparklines.successRate.length - 1] || 0
                const diff = last - first
                setTrends(prev => ({
                    ...prev,
                    success: {
                        change: `${diff > 0 ? "+" : ""}${diff.toFixed(1)}%`,
                        trend: diff >= 0 ? "up" : "down",
                        hasData: true
                    }
                }))
            }

            if (data.sparklines?.totalRequests) {
                const trend = calculateTrend(data.sparklines.totalRequests)
                setTrends(prev => ({ ...prev, requests: trend }))
            }
        }

      } catch (e) {
        console.error(e)
      }
    }
    fetchData()
    const interval = setInterval(fetchData, 5000)
    return () => clearInterval(interval)
  }, [])

  // Audit Log State & Logic
  const [fullAuditLog, setFullAuditLog] = useState<Array<any>>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [sortField, setSortField] = useState<"date" | "client" | "operation" | "status">("date")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc")
  const itemsPerPage = 10

  const filteredLog = fullAuditLog.filter(
      (log) =>
        log.client.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.operation.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.status.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.description.toLowerCase().includes(searchTerm.toLowerCase()),
    )

  const handleSort = (field: string) => {
    if (field === sortField) {
      setSortDirection(prev => prev === "asc" ? "desc" : "asc")
    } else {
      setSortField(field as any)
      setSortDirection("asc")
    }
  }

  const sortedLog = [...filteredLog].sort((a, b) => {
    const modifier = sortDirection === "asc" ? 1 : -1
    if (sortField === "date") {
      return (new Date(a.date).getTime() - new Date(b.date).getTime()) * modifier
    }
    const aValue = a[sortField] || ""
    const bValue = b[sortField] || ""
    if (typeof aValue === "string" && typeof bValue === "string") {
      return aValue.localeCompare(bValue) * modifier
    }
    return 0
  })

  const paginatedLog = sortedLog.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
  const totalPages = Math.ceil(sortedLog.length / itemsPerPage)
  const loading = false

  // Show login modal if not authenticated
  if (!isAuthenticated) {
    return <LoginModal onLogin={handleLogin} />
  }

  return (
    <div className="min-h-screen text-foreground">
      <DashboardHeader
        onShowMCPConfig={() => setShowMCPConfig(true)}
        onShowSettings={() => setShowSettings(true)}
      />

      <main className="px-6 py-8 max-w-7xl mx-auto space-y-8">
        <MetricsGrid stats={stats} trends={trends} />
        <ChartsSection period="" />
        <AuditLogTable
            logs={(paginatedLog || []).map(log => ({
                id: log.id,
                date: log.date.toLocaleString(),
                client: log.client,
                operation: log.operation,
                status: log.status,
                description: log.description
            }))}
            loading={loading}
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            sortField={sortField}
            sortDirection={sortDirection}
            onSort={handleSort}
        />
      </main>

      {showMCPConfig && <MCPConfigModal onClose={() => setShowMCPConfig(false)} />}
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
    </div>
  )
}
