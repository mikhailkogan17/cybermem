const PROMETHEUS_URL = process.env.NEXT_PUBLIC_PROMETHEUS_URL || 'http://localhost:9092'

export interface PrometheusQueryResult {
  status: string
  data: {
    resultType: string
    result: Array<{
      metric: Record<string, string>
      value?: [number, string]
      values?: Array<[number, string]>
    }>
  }
}

async function query(promql: string): Promise<PrometheusQueryResult> {
  const response = await fetch(`${PROMETHEUS_URL}/api/v1/query?query=${encodeURIComponent(promql)}`)
  if (!response.ok) {
    throw new Error(`Prometheus query failed: ${response.statusText}`)
  }
  return response.json()
}

async function queryRange(promql: string, start: number, end: number, step: string = '1m'): Promise<PrometheusQueryResult> {
  const url = `${PROMETHEUS_URL}/api/v1/query_range?query=${encodeURIComponent(promql)}&start=${start}&end=${end}&step=${step}`
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Prometheus range query failed: ${response.statusText}`)
  }
  return response.json()
}

export async function getTotalRequests(): Promise<number> {
  const result = await query('sum(openmemory_requests_total)')
  return result.data.result[0]?.value ? parseFloat(result.data.result[0].value[1]) : 0
}

export async function getRequestsByClient(): Promise<Record<string, number>> {
  // Use actual request counts from log-exporter
  const result = await query('sum by (client) (openmemory_requests_total)')
  const byClient: Record<string, number> = {}
  result.data.result.forEach((item) => {
    const clientId = item.metric.client || 'unknown'
    byClient[clientId] = item.value ? parseFloat(item.value[1]) : 0
  })
  return byClient
}

export async function getRequestsByMethod(): Promise<{ reads: Record<string, number>, writes: Record<string, number> }> {
  // Reads = GET requests, Writes = POST/PUT/DELETE requests
  const readsResult = await query('sum by (client) (openmemory_requests_total{method="GET"})')
  const writesResult = await query('sum by (client) (openmemory_requests_total{method=~"POST|PUT|DELETE"})')
  const writes: Record<string, number> = {}
  const reads: Record<string, number> = {}

  readsResult.data.result.forEach((item) => {
    const clientId = item.metric.client || 'unknown'
    reads[clientId] = item.value ? parseFloat(item.value[1]) : 0
  })

  writesResult.data.result.forEach((item) => {
    const clientId = item.metric.client || 'unknown'
    writes[clientId] = item.value ? parseFloat(item.value[1]) : 0
  })

  return { reads, writes }
}

export async function getSuccessRate(): Promise<number> {
  const result = await query('openmemory_success_rate_aggregate')
  return result.data.result[0]?.value ? parseFloat(result.data.result[0].value[1]) : 100
}

export async function getRequestsTimeSeries(duration: string = '1h'): Promise<Array<{ time: number, [client: string]: number | string }>> {
  const now = Math.floor(Date.now() / 1000)
  const start = now - parseDuration(duration)

  // Show memories by client over time (like OpenMemory's Memory Query Load but by client not sector)
  const result = await queryRange(
    'openmemory_memories_total',
    start,
    now,
    '1m'
  )

  const timeSeries: Array<{ time: number, [client: string]: number }> = []
  const timeMap = new Map<number, Record<string, number>>()

  result.data.result.forEach((series) => {
    const clientId = series.metric.client || 'unknown'
    series.values?.forEach(([timestamp, value]) => {
      if (!timeMap.has(timestamp)) {
        timeMap.set(timestamp, {})
      }
      timeMap.get(timestamp)![clientId] = parseFloat(value)
    })
  })

  Array.from(timeMap.entries())
    .sort((a, b) => a[0] - b[0])
    .forEach(([timestamp, clients]) => {
      timeSeries.push({
        time: timestamp,
        ...clients
      })
    })

  return timeSeries
}

export async function getRequestsTimeSeriesByMethod(method: string, duration: string = '1h'): Promise<Array<{ time: number, [client: string]: number | string }>> {
  const now = Math.floor(Date.now() / 1000)
  const start = now - parseDuration(duration)

  const result = await queryRange(
    `sum by (client) (rate(openmemory_requests_total{method="${method}"}[5m]))`,
    start,
    now,
    '1m'
  )

  const timeSeries: Array<{ time: number, [client: string]: number }> = []
  const timeMap = new Map<number, Record<string, number>>()

  result.data.result.forEach((series) => {
    const clientId = series.metric.client || 'unknown'
    series.values?.forEach(([timestamp, value]) => {
      if (!timeMap.has(timestamp)) {
        timeMap.set(timestamp, {})
      }
      timeMap.get(timestamp)![clientId] = parseFloat(value) * 60 // convert to req/min
    })
  })

  Array.from(timeMap.entries())
    .sort((a, b) => a[0] - b[0])
    .forEach(([timestamp, clients]) => {
      timeSeries.push({
        time: timestamp,
        ...clients
      })
    })

  return timeSeries
}

export async function getResponseTimeTimeSeries(duration: string = '1h'): Promise<Array<{ time: number, [client: string]: number | string }>> {
  const now = Math.floor(Date.now() / 1000)
  const start = now - parseDuration(duration)

  const result = await queryRange(
    'sum by (client) (rate(openmemory_request_duration_seconds_sum[5m])) / sum by (client) (rate(openmemory_request_duration_seconds_count[5m]))',
    start,
    now,
    '1m'
  )

  const timeSeries: Array<{ time: number, [client: string]: number }> = []
  const timeMap = new Map<number, Record<string, number>>()

  result.data.result.forEach((series) => {
    const clientId = series.metric.client || 'unknown'
    series.values?.forEach(([timestamp, value]) => {
      if (!timeMap.has(timestamp)) {
        timeMap.set(timestamp, {})
      }
      timeMap.get(timestamp)![clientId] = parseFloat(value) * 1000 // convert to ms
    })
  })

  Array.from(timeMap.entries())
    .sort((a, b) => a[0] - b[0])
    .forEach(([timestamp, clients]) => {
      timeSeries.push({
        time: timestamp,
        ...clients
      })
    })

  return timeSeries
}

export async function getSuccessRateTimeSeries(duration: string = '1h'): Promise<Array<{ time: number, value: number }>> {
  const now = Math.floor(Date.now() / 1000)
  const start = now - parseDuration(duration)

  const result = await queryRange(
    'sum(rate(openmemory_requests_total{status=~"2.."}[5m])) / sum(rate(openmemory_requests_total[5m]))',
    start,
    now,
    '1m'
  )

  const series = result.data.result[0]
  if (!series || !series.values) return []

  return series.values.map(([timestamp, value]) => ({
    time: timestamp,
    value: parseFloat(value) * 100
  }))
}

export async function getMemoryRecordsCount(): Promise<number> {
  // Get total memories across all clients
  const result = await query('sum(openmemory_memories_total)')
  return result.data.result[0]?.value ? parseFloat(result.data.result[0].value[1]) : 0
}

export async function getClientCount(): Promise<number> {
  const result = await query('count(count by (client) (openmemory_memories_total))')
  return result.data.result[0]?.value ? parseFloat(result.data.result[0].value[1]) : 0
}

function parseDuration(duration: string): number {
  const match = duration.match(/^(\d+)([smhd])$/)
  if (!match) return 3600

  const [, amount, unit] = match
  const multipliers: Record<string, number> = {
    s: 1,
    m: 60,
    h: 3600,
    d: 86400
  }

  return parseInt(amount) * (multipliers[unit] || 3600)
}

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
  if (!series || !series.values) return Array(20).fill(0)

  return series.values.map(([, value]) => parseFloat(value))
}

export async function getTotalRequestsSparkline(duration: string = '15m'): Promise<number[]> {
  const now = Math.floor(Date.now() / 1000)
  const start = now - parseDuration(duration)

  const result = await queryRange(
    'openmemory_requests_aggregate_total',
    start,
    now,
    '30s'
  )

  const series = result.data.result[0]
  if (!series || !series.values) return Array(20).fill(0)

  return series.values.map(([, value]) => parseFloat(value))
}

export async function getTotalClientsSparkline(duration: string = '15m'): Promise<number[]> {
  const now = Math.floor(Date.now() / 1000)
  const start = now - parseDuration(duration)

  const result = await queryRange(
    'count(count by (client) (openmemory_memories_total))',
    start,
    now,
    '30s'
  )

  const series = result.data.result[0]
  if (!series || !series.values) return Array(20).fill(0)

  return series.values.map(([, value]) => parseFloat(value))
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
  if (!series || !series.values) return Array(20).fill(100)

  return series.values.map(([, value]) => parseFloat(value))
}

export async function getSuccessRateByClient(): Promise<Record<string, number>> {
  // No per-client success rate - show average feedback score instead
  const result = await query('openmemory_avg_score')
  const scores: Record<string, number> = {}

  result.data.result.forEach((item) => {
    const clientId = item.metric.client || 'unknown'
    // Convert 0-1 score to percentage for display
    scores[clientId] = item.value ? parseFloat(item.value[1]) * 100 : 0
  })

  return scores
}

export async function getSuccessRateTimeSeriesByClient(duration: string = '1h'): Promise<Array<{ time: number, [client: string]: number | string }>> {
  const now = Math.floor(Date.now() / 1000)
  const start = now - parseDuration(duration)

  const [totalResult, successResult] = await Promise.all([
    queryRange(
      'sum by (client) (rate(openmemory_requests_total[5m]))',
      start,
      now,
      '1m'
    ),
    queryRange(
      'sum by (client) (rate(openmemory_requests_total{status=~"2.."}[5m]))',
      start,
      now,
      '1m'
    )
  ])

  const timeMap = new Map<number, Record<string, { total: number, success: number }>>()

  // Collect totals
  totalResult.data.result.forEach((series) => {
    const clientId = series.metric.client || 'unknown'
    series.values?.forEach(([timestamp, value]) => {
      if (!timeMap.has(timestamp)) {
        timeMap.set(timestamp, {})
      }
      const clients = timeMap.get(timestamp)!
      if (!clients[clientId]) {
        clients[clientId] = { total: 0, success: 0 }
      }
      clients[clientId].total = parseFloat(value)
    })
  })

  // Collect successes
  successResult.data.result.forEach((series) => {
    const clientId = series.metric.client || 'unknown'
    series.values?.forEach(([timestamp, value]) => {
      if (!timeMap.has(timestamp)) {
        timeMap.set(timestamp, {})
      }
      const clients = timeMap.get(timestamp)!
      if (!clients[clientId]) {
        clients[clientId] = { total: 0, success: 0 }
      }
      clients[clientId].success = parseFloat(value)
    })
  })

  // Calculate success rate percentages
  const timeSeries: Array<{ time: number, [client: string]: number }> = []
  Array.from(timeMap.entries())
    .sort((a, b) => a[0] - b[0])
    .forEach(([timestamp, clients]) => {
      const dataPoint: any = {
        time: timestamp
      }
      Object.keys(clients).forEach((client) => {
        const { total, success } = clients[client]
        dataPoint[client] = total > 0 ? (success / total) * 100 : 0
      })
      timeSeries.push(dataPoint)
    })

  return timeSeries
}

export async function getTopWriter(): Promise<{ name: string, count: number }> {
  // Get client with most write requests (POST/PUT/DELETE)
  const result = await query('topk(1, sum by (client) (openmemory_requests_total{method=~"POST|PUT|DELETE"}))')
  if (result.data.result.length === 0) {
    return { name: 'N/A', count: 0 }
  }
  const item = result.data.result[0]
  return {
    name: item.metric.client || 'unknown',
    count: item.value ? parseFloat(item.value[1]) : 0
  }
}

export async function getTopReader(): Promise<{ name: string, count: number }> {
  // Get client with most read requests (GET)
  const result = await query('topk(1, sum by (client) (openmemory_requests_total{method="GET"}))')
  if (result.data.result.length === 0) {
    return { name: 'N/A', count: 0 }
  }
  const item = result.data.result[0]
  return {
    name: item.metric.client || 'unknown',
    count: item.value ? parseFloat(item.value[1]) : 0
  }
}

export async function getLastWriter(): Promise<{ name: string, timestamp: number }> {
  // Use latest timestamp from counter (Prometheus doesn't track timestamps, use workaround)
  const result = await query('topk(1, sum by (client) (openmemory_requests_total{method=~"POST|PUT|DELETE"}))')
  if (result.data.result.length === 0) {
    return { name: 'N/A', timestamp: 0 }
  }
  const item = result.data.result[0]
  return {
    name: item.metric.client || 'unknown',
    timestamp: item.value ? item.value[0] * 1000 : 0 // Convert to ms
  }
}

export async function getLastReader(): Promise<{ name: string, timestamp: number }> {
  // Use latest timestamp from counter
  const result = await query('topk(1, sum by (client) (openmemory_requests_total{method="GET"}))')
  if (result.data.result.length === 0) {
    return { name: 'N/A', timestamp: 0 }
  }
  const item = result.data.result[0]
  return {
    name: item.metric.client || 'unknown',
    timestamp: item.value ? item.value[0] * 1000 : 0 // Convert to ms
  }
}
