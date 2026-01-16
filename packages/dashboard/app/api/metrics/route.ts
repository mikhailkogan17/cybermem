import fs from 'fs'
import { NextResponse } from 'next/server'
import path from 'path'

export const dynamic = 'force-dynamic'
export const revalidate = 0

// Use env var for db-exporter URL (Docker internal vs local dev)
const DB_EXPORTER_URL = process.env.DB_EXPORTER_URL || 'http://localhost:8000'

// Load clients config for name normalization
let clientsConfig: any[] = []
try {
  const configPath = path.join(process.cwd(), 'public', 'clients.json')
  clientsConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'))
} catch (e) {
  console.error('Failed to load clients.json:', e)
}

// Normalize raw client name to friendly name
function normalizeClientName(rawName: string): string {
  if (!rawName || rawName === 'N/A') return rawName
  const nameLower = rawName.toLowerCase()
  const client = clientsConfig.find((c: any) => {
    try {
      return new RegExp(c.match, 'i').test(nameLower)
    } catch {
      return nameLower.includes(c.match)
    }
  })
  return client?.name || rawName
}

// Normalize client names in time series data
function normalizeTimeSeries(data: any[]): any[] {
  return data.map(point => {
    const normalized: any = { time: point.time }
    for (const [key, value] of Object.entries(point)) {
      if (key !== 'time') {
        normalized[normalizeClientName(key)] = value
      }
    }
    return normalized
  })
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || '24h'

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000)

    // Fetch stats and timeseries from db-exporter (SQLite)
    const [statsRes, timeseriesRes] = await Promise.all([
      fetch(`${DB_EXPORTER_URL}/api/stats`, {
        signal: controller.signal,
        cache: 'no-store'
      }),
      fetch(`${DB_EXPORTER_URL}/api/timeseries?period=${period}`, {
        signal: controller.signal,
        cache: 'no-store'
      })
    ])

    clearTimeout(timeoutId)

    if (!statsRes.ok) {
      throw new Error(`Failed to fetch stats: ${statsRes.statusText}`)
    }

    const stats = await statsRes.json()
    const timeseries = timeseriesRes.ok ? await timeseriesRes.json() : { creates: [], reads: [], updates: [], deletes: [] }

    // Normalize client names
    const normalizedStats = {
      memoryRecords: stats.memoryRecords || 0,
      totalClients: stats.totalClients || 0,
      successRate: stats.successRate || 100,
      totalRequests: stats.totalRequests || 0,
      topWriter: {
        name: normalizeClientName(stats.topWriter?.name || 'N/A'),
        count: stats.topWriter?.count || 0
      },
      topReader: {
        name: normalizeClientName(stats.topReader?.name || 'N/A'),
        count: stats.topReader?.count || 0
      },
      lastWriter: {
        name: normalizeClientName(stats.lastWriter?.name || 'N/A'),
        timestamp: stats.lastWriter?.timestamp || 0
      },
      lastReader: {
        name: normalizeClientName(stats.lastReader?.name || 'N/A'),
        timestamp: stats.lastReader?.timestamp || 0
      }
    }

    return NextResponse.json({
      stats: normalizedStats,
      timeSeries: {
        creates: normalizeTimeSeries(timeseries.creates || []),
        reads: normalizeTimeSeries(timeseries.reads || []),
        updates: normalizeTimeSeries(timeseries.updates || []),
        deletes: normalizeTimeSeries(timeseries.deletes || [])
      },
      // Legacy fields for backward compatibility
      sparklines: {
        memoryRecords: [],
        totalRequests: [],
        totalClients: [],
        successRate: []
      },
      clientStats: {
        reads: {},
        writes: {},
        successRate: {}
      }
    })
  } catch (error) {
    console.error('Failed to fetch metrics:', error)
    return NextResponse.json({ error: 'Failed to fetch metrics' }, { status: 500 })
  }
}
