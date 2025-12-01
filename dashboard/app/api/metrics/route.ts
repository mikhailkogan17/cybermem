import { NextResponse } from 'next/server'
import {
  getTotalRequests,
  getRequestsByClient,
  getRequestsByMethod,
  getSuccessRate,
  getRequestsTimeSeries,
  getResponseTimeTimeSeries,
  getMemoryRecordsCount,
  getClientCount
} from '@/lib/prometheus'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  try {
    const [
      totalRequests,
      requestsByClient,
      requestsByMethod,
      successRate,
      requestsTimeSeries,
      responseTimeTimeSeries,
      memoryRecords,
      clientCount
    ] = await Promise.all([
      getTotalRequests(),
      getRequestsByClient(),
      getRequestsByMethod(),
      getSuccessRate(),
      getRequestsTimeSeries('15m'),
      getResponseTimeTimeSeries('15m'),
      getMemoryRecordsCount(),
      getClientCount()
    ])

    // Sort clients by total requests
    const clientStats = Object.entries(requestsByClient)
      .map(([client, total]) => ({
        client,
        total,
        reads: requestsByMethod.reads[client] || 0,
        writes: requestsByMethod.writes[client] || 0
      }))
      .sort((a, b) => b.total - a.total)

    const topWriter = clientStats.reduce((max, curr) => curr.writes > max.writes ? curr : max, clientStats[0] || { client: 'N/A', writes: 0 })
    const topReader = clientStats.reduce((max, curr) => curr.reads > max.reads ? curr : max, clientStats[0] || { client: 'N/A', reads: 0 })

    return NextResponse.json({
      stats: {
        memoryRecords,
        totalClients: clientCount,
        successRate,
        totalRequests,
        topWriter: { name: topWriter.client, count: topWriter.writes },
        topReader: { name: topReader.client, count: topReader.reads }
      },
      timeSeries: {
        requests: requestsTimeSeries,
        responseTime: responseTimeTimeSeries
      },
      clientStats: {
        reads: requestsByMethod.reads,
        writes: requestsByMethod.writes
      }
    })
  } catch (error) {
    console.error('Failed to fetch metrics:', error)
    return NextResponse.json({ error: 'Failed to fetch metrics' }, { status: 500 })
  }
}
