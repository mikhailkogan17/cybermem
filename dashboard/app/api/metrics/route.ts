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
  getSuccessRateTimeSeriesByClient,
  getTopWriter,
  getTopReader,
  getLastWriter,
  getLastReader
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
      successRateTimeSeriesByClient,
      topWriter,
      topReader,
      lastWriter,
      lastReader
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
      getSuccessRateTimeSeriesByClient(period),
      getTopWriter(),
      getTopReader(),
      getLastWriter(),
      getLastReader()
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

    return NextResponse.json({
      stats: {
        memoryRecords,
        totalClients: clientCount,
        successRate,
        totalRequests,
        topWriter,
        topReader,
        lastWriter,
        lastReader
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
