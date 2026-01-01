import { queryRange } from './client'
import { fillSparklineData, parseDuration } from './utils'

// Sparkline data - cumulative counts over time
export async function getMemoryRecordsSparkline(duration: string = '15m'): Promise<number[]> {
  const now = Math.floor(Date.now() / 1000)
  const start = now - parseDuration(duration)

  const result = await queryRange(
    'sum(openmemory_memories_total)',
    start,
    now,
    '30s'
  )

  const series = result.data.result[0]
  if (!series || !series.values) return Array(Math.ceil((now - start) / 30)).fill(0)

  return fillSparklineData(series.values, start, now, 30)
}

export async function getTotalRequestsSparkline(duration: string = '15m'): Promise<number[]> {
  const now = Math.floor(Date.now() / 1000)
  const start = now - parseDuration(duration)

  const result = await queryRange(
    'sum(openmemory_requests_total)',
    start,
    now,
    '30s'
  )

  const series = result.data.result[0]
  if (!series || !series.values) return Array(Math.ceil((now - start) / 30)).fill(0)

  return fillSparklineData(series.values, start, now, 30)
}

export async function getTotalClientsSparkline(duration: string = '15m'): Promise<number[]> {
  const now = Math.floor(Date.now() / 1000)
  const start = now - parseDuration(duration)

  const result = await queryRange(
    'count(count by (client_name) (openmemory_memories_total))',
    start,
    now,
    '30s'
  )

  const series = result.data.result[0]
  if (!series || !series.values) return Array(Math.ceil((now - start) / 30)).fill(0)

  return fillSparklineData(series.values, start, now, 30)
}

export async function getSuccessRateSparkline(duration: string = '15m'): Promise<number[]> {
  const now = Math.floor(Date.now() / 1000)
  const start = now - parseDuration(duration)

  const result = await queryRange(
    'openmemory_success_rate_aggregate',
    start,
    now,
    '30s'
  )

  const series = result.data.result[0]
  if (!series || !series.values) return Array(Math.ceil((now - start) / 30)).fill(100)

  return fillSparklineData(series.values, start, now, 30, 100)
}
