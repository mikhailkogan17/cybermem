export interface ClientMetric {
  client: string
  total?: number
  reads?: number
  writes?: number
  rate?: number
}

export interface DashboardStats {
  memoryRecords: number
  totalClients: number
  clientGrowth: number
  topWriter: { name: string; count: number }
  topReader: { name: string; count: number }
  lastWriter: { name: string; timestamp: number }
  lastReader: { name: string; timestamp: number }
  successRate: number
  totalRequests: number
}

export interface SparklineData {
  memoryRecords: number[]
  totalClients: number[]
  successRate: number[]
  totalRequests: number[]
}

export interface AuditLogEntry {
  id: number
  date: Date
  client: string
  operation: string
  status: string
  description: string
}

export interface DashboardData {
  stats: DashboardStats
  sparklineData: SparklineData
  clientNames: string[]
  writesByClient: Array<{ client: string; writes: number }>
  readsByClient: Array<{ client: string; reads: number }>
  requestsByClient: Array<{ client: string; total: number }>
  successRateByClient: Array<{ client: string; rate: number }>
  timeSeries: {
    requests: any[]
    responseTime: any[]
    successRate: any[]
    successRateByClient: any[]
    creates: any[]
    reads: any[]
    updates: any[]
    deletes: any[]
    errors: any[]
  }
  auditLog: {
    logs: AuditLogEntry[]
    lastWriter: { name: string; timestamp: number }
    lastReader: { name: string; timestamp: number }
  }
}

const FALLBACK_SPARKLINE = Array.from({ length: 20 }, () => 0)
const FALLBACK_SPARKLINE_RATE = Array.from({ length: 20 }, () => 100)

export async function fetchDashboardData(period: string): Promise<DashboardData> {
  const [metricsResponse, logsResponse] = await Promise.all([
    fetch(`/api/metrics?period=${period}`),
    fetch(`/api/logs?period=${period}`),
  ])

  if (!metricsResponse.ok) {
    throw new Error(`Failed to fetch metrics: ${metricsResponse.status}`)
  }

  const data = await metricsResponse.json()
  const {
    stats: apiStats,
    timeSeries = {},
    clientStats = {},
    sparklines = {},
  } = data

  // Client aggregates
  const readsArray = Object.entries(clientStats.reads || {}).map(([client, reads]) => ({
    client,
    reads: reads as number,
  }))

  const writesArray = Object.entries(clientStats.writes || {}).map(([client, writes]) => ({
    client,
    writes: writes as number,
  }))

  const requestsMap = new Map<string, number>()
  readsArray.forEach((r) => requestsMap.set(r.client, (requestsMap.get(r.client) || 0) + r.reads))
  writesArray.forEach((w) => requestsMap.set(w.client, (requestsMap.get(w.client) || 0) + w.writes))

  const requestsByClientArray = Array.from(requestsMap.entries())
    .map(([client, total]) => ({ client, total }))
    .sort((a, b) => b.total - a.total)

  const successRateArray = clientStats.successRate
    ? Object.entries(clientStats.successRate).map(([client, rate]) => ({
        client,
        rate: rate as number,
      }))
    : []

  const derivedClients = Array.from(
    new Set([
      ...readsArray.map((r) => r.client),
      ...writesArray.map((w) => w.client),
      ...(timeSeries.requests?.[0] ? Object.keys(timeSeries.requests[0]).filter((key) => key !== "time") : []),
    ]),
  )

  // Sparklines fallback
  const totalRequestsSparkline =
    timeSeries.requests?.map((point: any) =>
      Object.entries(point)
        .filter(([key]) => key !== "time")
        .reduce((acc, [, val]) => acc + Number(val || 0), 0),
    ) || []

  const writesSparkline =
    timeSeries.writes?.map((point: any) =>
      Object.entries(point)
        .filter(([key]) => key !== "time")
        .reduce((acc, [, val]) => acc + Number(val || 0), 0),
    ) || []

  const successRateSparkline = (timeSeries.successRate || []).map((p: any) => p.value ?? 0)
  const totalClientsSparkline =
    timeSeries.requests?.map((point: any) => {
      const clients = Object.keys(point).filter((k) => k !== "time")
      return clients.length
    }) || []

  const sparklineData: SparklineData = {
    memoryRecords: sparklines.memoryRecords || writesSparkline || FALLBACK_SPARKLINE,
    totalClients: sparklines.totalClients || totalClientsSparkline || FALLBACK_SPARKLINE,
    successRate: sparklines.successRate || successRateSparkline || FALLBACK_SPARKLINE_RATE,
    totalRequests: sparklines.totalRequests || totalRequestsSparkline || FALLBACK_SPARKLINE,
  }

  const stats: DashboardStats = {
    memoryRecords: apiStats.memoryRecords ?? 0,
    totalClients: apiStats.totalClients ?? 0,
    clientGrowth: apiStats.clientGrowth ?? 0,
    topWriter: apiStats.topWriter ?? { name: "N/A", count: 0 },
    topReader: apiStats.topReader ?? { name: "N/A", count: 0 },
    lastWriter: apiStats.lastWriter ?? { name: "N/A", timestamp: 0 },
    lastReader: apiStats.lastReader ?? { name: "N/A", timestamp: 0 },
    successRate: apiStats.successRate ?? 0,
    totalRequests: apiStats.totalRequests ?? 0,
  }

  if (totalClientsSparkline.length >= 2) {
    const first = totalClientsSparkline[0]
    const last = totalClientsSparkline[totalClientsSparkline.length - 1]
    stats.clientGrowth = Math.max(0, last - first)
  }

  // Logs
  let auditLog: DashboardData["auditLog"] = {
    logs: [],
    lastReader: stats.lastReader,
    lastWriter: stats.lastWriter,
  }

  if (logsResponse.ok) {
    const logsData = await logsResponse.json()
    auditLog = mapLogs(logsData.logs || [], stats.lastWriter, stats.lastReader)
    // Prefer freshest last reader/writer from logs
    stats.lastWriter = auditLog.lastWriter
    stats.lastReader = auditLog.lastReader
  }

  return {
    stats,
    sparklineData,
    clientNames: derivedClients,
    writesByClient: writesArray,
    readsByClient: readsArray,
    requestsByClient: requestsByClientArray,
    successRateByClient: successRateArray,
    timeSeries: {
      requests: timeSeries.requests || [],
      responseTime: timeSeries.responseTime || [],
      successRate: timeSeries.successRate || [],
      successRateByClient: timeSeries.successRateByClient || [],
      creates: timeSeries.creates || [],
      reads: timeSeries.reads || [],
      updates: timeSeries.updates || [],
      deletes: timeSeries.deletes || [],
      errors: timeSeries.errors || [],
    },
    auditLog,
  }
}

function mapLogs(
  rawLogs: any[],
  fallbackWriter: { name: string; timestamp: number },
  fallbackReader: { name: string; timestamp: number },
): DashboardData["auditLog"] {
  const logs: AuditLogEntry[] = rawLogs.map((log: any, index: number) => {
    const operation = resolveOperation(log)
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

  const sortedLogs = [...logs].sort((a, b) => b.date.getTime() - a.date.getTime())
  const lastWriterLog = sortedLogs.find((log) => log.operation === "Write")
  const lastReaderLog = sortedLogs.find((log) => log.operation === "Read")

  return {
    logs: sortedLogs,
    lastWriter: lastWriterLog ? { name: lastWriterLog.client, timestamp: lastWriterLog.date.getTime() } : fallbackWriter,
    lastReader: lastReaderLog ? { name: lastReaderLog.client, timestamp: lastReaderLog.date.getTime() } : fallbackReader,
  }
}

function resolveOperation(log: any): string {
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
