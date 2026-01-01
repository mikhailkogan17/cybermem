
import { DashboardData, DataSourceStrategy, TimeSeriesData } from "./types"

export class DemoDataSource implements DataSourceStrategy {
  async fetchGlobalStats(): Promise<DashboardData> {
    // 1. Generate full time-series history for sparklines
    const generateSeries = (start: number, count: number, variance: number) => {
      const series = [start]
      for (let i = 1; i < count; i++) {
        const change = (Math.random() - 0.5) * variance
        series.push(Math.max(0, series[i - 1] + change))
      }
      return series
    }

    const exactData = {
      memory: generateSeries(12000, 20, 500),
      clients: generateSeries(40, 20, 2),
      success: generateSeries(98, 20, 0.5).map((v) => Math.min(100, v)),
      requests: generateSeries(85000, 20, 1000),
    }

    // 2. Generate stable, rich Audit Log history
    const mockClients = ["Antigravity", "Claude", "Cursor", "ChatGPT", "Copilot"]
    const mockOps = ["Create", "Read", "Update", "Delete"]
    const demoLogs = Array.from({ length: 50 }).map((_, i) => ({
      id: i,
      date: new Date(Date.now() - i * 1000 * 60 * 5),
      client: mockClients[i % mockClients.length],
      operation: mockOps[i % mockOps.length],
      status: i % 10 === 0 ? "Error" : "Success",
      description:
        i % 10 === 0 ? "Rate limit exceeded" : "Operation completed successfully",
      timestamp: Date.now() - i * 1000 * 60 * 5,
    }))

    return {
      stats: {
        memoryRecords: Math.round(exactData.memory[exactData.memory.length - 1]),
        totalClients: Math.round(exactData.clients[exactData.clients.length - 1]),
        successRate: Number(
          exactData.success[exactData.success.length - 1].toFixed(1)
        ),
        totalRequests: Math.round(
          exactData.requests[exactData.requests.length - 1]
        ),
        topWriter: { name: "Antigravity", count: 4200 },
        topReader: { name: "Claude", count: 3100 },
        lastWriter: { name: "VS Code", timestamp: Date.now() - 1000 * 60 * 2 },
        lastReader: { name: "Cursor", timestamp: Date.now() - 1000 * 30 },
      },
      trends: {
        memory: {
          change: "+450",
          trend: "up",
          hasData: true,
          data: exactData.memory,
        },
        clients: {
          change: "+5",
          trend: "up",
          hasData: true,
          data: exactData.clients,
        },
        success: {
          change: "+0.5%",
          trend: "up",
          hasData: true,
          data: exactData.success,
        },
        requests: {
          change: "+1.2k",
          trend: "up",
          hasData: true,
          data: exactData.requests,
        },
      },
      logs: demoLogs,
    }
  }

  async getChartData(period: string): Promise<TimeSeriesData> {
    const clients = ["Antigravity", "Claude", "Cursor", "ChatGPT"]
    const now = Math.floor(Date.now() / 1000)
    // Generate 20 points
    const points = 20
    const interval = 300 // 5 mins

    const generateSeries = () => {
      return Array.from({ length: points }).map((_, i) => {
        const time = now - (points - 1 - i) * interval
        const point: any = { time }
        clients.forEach(c => {
           // Random value between 0 and 10
           point[c] = Math.floor(Math.random() * 10)
        })
        return point
      })
    }

    return {
      creates: generateSeries(),
      reads: generateSeries(),
      updates: generateSeries(),
      deletes: generateSeries(),
      // Metadata is now handled globally via clients.json, so we don't return partial overrides here
      metadata: {}
    }
  }
}
