import {
    getClientCount,
    getCreatesByClient,
    getDeletesByClient,
    getErrorsByClient,
    getLastReader,
    getLastWriter,
    getMemoryRecordsCount,
    getMemoryRecordsSparkline,
    getReadsByClient,
    getRequestsByClient,
    getRequestsByMethod,
    getRequestsTimeSeries,
    getRequestsTimeSeriesByMethod,
    getResponseTimeTimeSeries,
    getSuccessRate,
    getSuccessRateByClient,
    getSuccessRateSparkline,
    getSuccessRateTimeSeries,
    getSuccessRateTimeSeriesByClient,
    getTopReader,
    getTopWriter,
    getTotalClientsSparkline,
    getTotalRequests,
    getTotalRequestsSparkline,
    getUpdatesByClient
} from '@/lib/prometheus'
import { NextResponse } from 'next/server'

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
      lastReader,
      createsTimeSeries,
      readsTimeSeries,
      updatesTimeSeries,
      deletesTimeSeries,
      errorsTimeSeries
    ] = await Promise.all([
      getTotalRequests(period),
      getRequestsByClient(period),
      getRequestsByMethod(period),
      getSuccessRate(period),
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
      getSuccessRateByClient(period),
      getSuccessRateTimeSeriesByClient(period),
      getTopWriter(period),
      getTopReader(period),
      getLastWriter(period),
      getLastReader(period),
      getCreatesByClient(period),
      getReadsByClient(period),
      getUpdatesByClient(period),
      getDeletesByClient(period),
      getErrorsByClient(period)
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
        writes: writesTimeSeries,
        creates: createsTimeSeries,
        reads: readsTimeSeries,
        updates: updatesTimeSeries,
        deletes: deletesTimeSeries,
        errors: errorsTimeSeries
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
