export interface TrendState {
  change: string
  trend: "up" | "down" | "neutral"
  hasData: boolean
  data: number[]
}

export interface DashboardStats {
  memoryRecords: number
  totalClients: number
  successRate: number
  totalRequests: number
  topWriter: { name: string; count: number }
  topReader: { name: string; count: number }
  lastWriter: { name: string; timestamp: number }
  lastReader: { name: string; timestamp: number }
}

export interface AuditLogEntry {
  id: number
  date: Date
  client: string
  operation: string
  status: string
  description: string
  timestamp: number
}

export interface DashboardData {
  stats: DashboardStats
  trends: {
    memory: TrendState
    clients: TrendState
    success: TrendState
    requests: TrendState
  }
  logs: AuditLogEntry[]
}


export interface TimeSeriesData {
  creates: any[]
  reads: any[]
  updates: any[]
  deletes: any[]
  metadata?: Record<string, any>
}

export interface DataSourceStrategy {
  fetchGlobalStats(): Promise<DashboardData>
  getChartData(period: string): Promise<TimeSeriesData>
}
