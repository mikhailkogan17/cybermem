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

export async function getRequestsTimeSeries(duration: string = '1h'): Promise<Array<{ time: number, [client: string]: number | string }>> {
  const now = Math.floor(Date.now() / 1000)
  const start = now - parseDuration(duration)

  const result = await queryRange(
    'sum by (client) (rate(openmemory_requests_total[5m]))',
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

// Sparkline data - cumulative counts over time
export async function getMemoryRecordsSparkline(duration: string = '15m'): Promise<number[]> {
  const now = Math.floor(Date.now() / 1000)
  const start = now - parseDuration(duration)

  const result = await queryRange(
    'sum(openmemory_requests_total{method="POST"})',
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
    'sum(openmemory_requests_total)',
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
    'count(count by (client) (openmemory_requests_total))',
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
    'sum(openmemory_requests_total{status=~"2.."}) / sum(openmemory_requests_total) * 100',
    start,
    now,
    '30s'
  )

  const series = result.data.result[0]
  if (!series || !series.values) return Array(20).fill(100)

  return series.values.map(([, value]) => parseFloat(value))
}

export async function getSuccessRateByClient(): Promise<Record<string, number>> {
  const [totalResult, successResult] = await Promise.all([
    query('sum by (client) (openmemory_requests_total)'),
    query('sum by (client) (openmemory_requests_total{status=~"2.."})')
  ])

  const totals: Record<string, number> = {}
  const successes: Record<string, number> = {}
  const rates: Record<string, number> = {}

  totalResult.data.result.forEach((item) => {
    const clientId = item.metric.client || 'unknown'
    totals[clientId] = item.value ? parseFloat(item.value[1]) : 0
  })

  successResult.data.result.forEach((item) => {
    const clientId = item.metric.client || 'unknown'
    successes[clientId] = item.value ? parseFloat(item.value[1]) : 0
  })

  Object.keys(totals).forEach((client) => {
    const total = totals[client] || 0
    const success = successes[client] || 0
    rates[client] = total > 0 ? (success / total) * 100 : 0
  })

  return rates
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
