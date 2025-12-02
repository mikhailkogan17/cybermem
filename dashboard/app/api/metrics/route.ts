import { NextResponse } from 'next/server'
import {
  getTotalRequests,
  getRequestsByClient,
  getRequestsByMethod,
  getSuccessRate,
  getRequestsTimeSeries,
  getResponseTimeTimeSeries,
  getSuccessRateTimeSeries,
  getRequestsTimeSeriesByMethod,
  getMemoryRecordsCount,
  getClientCount,
  getMemoryRecordsSparkline,
  getTotalRequestsSparkline,
  getTotalClientsSparkline,
  getSuccessRateSparkline,
  getSuccessRateByClient,
  getSuccessRateTimeSeriesByClient
} from '@/lib/prometheus'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || '15m'

    const [
      totalRequests,
      requestsByClient,
      requestsByMethod,
      successRate,
      requestsTimeSeries,
      responseTimeTimeSeries,
      successRateTimeSeries,
      writesTimeSeries,
      memoryRecords,
      clientCount,
      memoryRecordsSparkline,
      totalRequestsSparkline,
      totalClientsSparkline,
      successRateSparkline,
      successRateByClient,
      successRateTimeSeriesByClient
    ] = await Promise.all([
      getTotalRequests(),
      getRequestsByClient(),
      getRequestsByMethod(),
      getSuccessRate(),
      getRequestsTimeSeries(period),
      getResponseTimeTimeSeries(period),
      getSuccessRateTimeSeries(period),
      getRequestsTimeSeriesByMethod('POST', period),
      getMemoryRecordsCount(),
      getClientCount(),
      getMemoryRecordsSparkline(period),
      getTotalRequestsSparkline(period),
      getTotalClientsSparkline(period),
      getSuccessRateSparkline(period),
      getSuccessRateByClient(),
      getSuccessRateTimeSeriesByClient(period)
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

    // Find top writer and reader, default to N/A if no data
    let topWriter = { client: 'N/A', writes: 0 }
    let topReader = { client: 'N/A', reads: 0 }

    if (clientStats.length > 0) {
      const maxWriter = clientStats.reduce((max, curr) => curr.writes > max.writes ? curr : max)
      const maxReader = clientStats.reduce((max, curr) => curr.reads > max.reads ? curr : max)

      // Only use actual client name if count > 0
      topWriter = maxWriter.writes > 0 ? maxWriter : { client: 'N/A', writes: 0 }
      topReader = maxReader.reads > 0 ? maxReader : { client: 'N/A', reads: 0 }
    }

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
        responseTime: responseTimeTimeSeries,
        successRate: successRateTimeSeries,
        successRateByClient: successRateTimeSeriesByClient,
        writes: writesTimeSeries
      },
      clientStats: {
        reads: requestsByMethod.reads,
        writes: requestsByMethod.writes,
        successRate: successRateByClient
      },
      sparklines: {
        memoryRecords: memoryRecordsSparkline,
        totalRequests: totalRequestsSparkline,
        totalClients: totalClientsSparkline,
        successRate: successRateSparkline
      }
    })
  } catch (error) {
    console.error('Failed to fetch metrics:', error)
    return NextResponse.json({ error: 'Failed to fetch metrics' }, { status: 500 })
  }
}
