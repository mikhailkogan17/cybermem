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
  const result = await query('sum by (client) (openmemory_requests_total)')
  const byClient: Record<string, number> = {}
  result.data.result.forEach((item) => {
    const clientId = item.metric.client || 'unknown'
    byClient[clientId] = item.value ? parseFloat(item.value[1]) : 0
  })
  return byClient
}

export async function getRequestsByMethod(): Promise<{ reads: Record<string, number>, writes: Record<string, number> }> {
  const result = await query('sum by (client, method) (openmemory_requests_total)')
  const reads: Record<string, number> = {}
  const writes: Record<string, number> = {}

  result.data.result.forEach((item) => {
    const clientId = item.metric.client || 'unknown'
    const method = item.metric.method || 'unknown'
    const count = item.value ? parseFloat(item.value[1]) : 0

    if (method === 'POST') {
      writes[clientId] = (writes[clientId] || 0) + count
    } else if (method === 'GET') {
      reads[clientId] = (reads[clientId] || 0) + count
    }
  })

  return { reads, writes }
}

export async function getSuccessRate(): Promise<number> {
  const totalResult = await query('sum(openmemory_requests_total)')
  const successResult = await query('sum(openmemory_requests_total{status=~"2.."})')

  const total = totalResult.data.result[0]?.value ? parseFloat(totalResult.data.result[0].value[1]) : 0
  const success = successResult.data.result[0]?.value ? parseFloat(successResult.data.result[0].value[1]) : 0

  return total > 0 ? (success / total) * 100 : 100
}

export async function getRequestsTimeSeries(duration: string = '1h'): Promise<Array<{ time: string, [client: string]: number | string }>> {
  const now = Math.floor(Date.now() / 1000)
  const start = now - parseDuration(duration)

  const result = await queryRange(
    'sum by (client) (rate(openmemory_requests_total[5m]))',
    start,
    now,
    '1m'
  )

  const timeSeries: Array<{ time: string, [client: string]: number }> = []
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
        time: new Date(timestamp * 1000).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        ...clients
      })
    })

  return timeSeries
}

export async function getResponseTimeTimeSeries(duration: string = '1h'): Promise<Array<{ time: string, [client: string]: number | string }>> {
  const now = Math.floor(Date.now() / 1000)
  const start = now - parseDuration(duration)

  const result = await queryRange(
    'sum by (client) (rate(openmemory_request_duration_seconds_sum[5m])) / sum by (client) (rate(openmemory_request_duration_seconds_count[5m]))',
    start,
    now,
    '1m'
  )

  const timeSeries: Array<{ time: string, [client: string]: number }> = []
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
        time: new Date(timestamp * 1000).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        ...clients
      })
    })

  return timeSeries
}

export async function getMemoryRecordsCount(): Promise<number> {
  // This would require PostgreSQL exporter metrics
  // For now, approximate from requests
  const result = await query('sum(openmemory_requests_total{method="POST"})')
  return result.data.result[0]?.value ? parseFloat(result.data.result[0].value[1]) : 0
}

export async function getClientCount(): Promise<number> {
  const result = await query('count(count by (client) (openmemory_requests_total))')
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
