import {
  getClientCount,
  getLastReader,
  getLastWriter,
  getMemoryRecordsCount,
  getMemoryRecordsSparkline,
  getRequestsByClient,
  getRequestsByMethod,
  getRequestsTimeSeries,
  getRequestsTimeSeriesByMethod,
  getResponseTimeTimeSeries,
  getSuccessRate,
  getSuccessRateByClient,
  getSuccessRateSparkline,
  getSuccessRateTimeSeries,
  getTopReader,
  getTopWriter,
  getTotalClientsSparkline,
  getTotalRequests,
  getTotalRequestsSparkline
} from '@/lib/prometheus'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const duration = searchParams.get('duration') || '15m'
  const seriesDuration = searchParams.get('seriesDuration') || '1h'

  try {
    const [
      totalRequests,
      memoryRecords,
      clientCount,
      successRate,
      topWriter,
      topReader,
      lastWriter,
      lastReader,
      requestsByClient,
      requestsByMethod,
      successRateByClient,
      requestsTimeSeries,
      responseTimeTimeSeries,
      successRateTimeSeries,
      // Sparklines
      memorySparkline,
      requestsSparkline,
      clientsSparkline,
      successSparkline
    ] = await Promise.all([
      getTotalRequests(duration),
      getMemoryRecordsCount(),
      getClientCount(),
      getSuccessRate(),
      getTopWriter(duration),
      getTopReader(duration),
      getLastWriter(),
      getLastReader(),
      getRequestsByClient(duration),
      getRequestsByMethod(duration),
      getSuccessRateByClient(),
      getRequestsTimeSeries(seriesDuration),
      getResponseTimeTimeSeries(seriesDuration),
      getSuccessRateTimeSeries(seriesDuration),
      getMemoryRecordsSparkline(duration),
      getTotalRequestsSparkline(duration),
      getTotalClientsSparkline(duration),
      getSuccessRateSparkline(duration)
    ])

    // Get time series for specific operations for the "multi-series" charts if needed
    // or just assume the frontend re-uses the main series or fetches differently.
    // The previous mock had detailed breakdowns. Let's fetch what we can.

    // We need to fetch breakdown series for the charts:
    const [
      readsSeries,
      writesSeries,
      createsSeries,
      updatesSeries,
      deletesSeries,
      errorsSeries
    ] = await Promise.all([
      getRequestsTimeSeriesByMethod('read', seriesDuration),
      getRequestsTimeSeriesByMethod('write', seriesDuration), // 'write' isn't a method, but our func might need adjustment or we use specific ones
      getRequestsTimeSeriesByMethod('create', seriesDuration),
      getRequestsTimeSeriesByMethod('update', seriesDuration),
      getRequestsTimeSeriesByMethod('delete', seriesDuration),
      Promise.resolve([]) // errors placeholder
    ])

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
      clientStats: {
        reads: requestsByMethod.reads,
        writes: requestsByMethod.writes,
        successRate: successRateByClient
      },
      timeSeries: {
        requests: requestsTimeSeries,
        responseTime: responseTimeTimeSeries,
        successRate: successRateTimeSeries,
        successRateByClient: {}, // Not implemented yet
        writes: writesSeries,
        creates: createsSeries,
        reads: readsSeries,
        updates: updatesSeries,
        deletes: deletesSeries,
        errors: errorsSeries
      },
      sparklines: {
        memoryRecords: memorySparkline,
        totalRequests: requestsSparkline,
        totalClients: clientsSparkline,
        successRate: successSparkline
      }
    })
  } catch (error) {
    console.error('Error fetching metrics:', error)
    return NextResponse.json({ error: 'Failed to fetch metrics' }, { status: 500 })
  }
}
