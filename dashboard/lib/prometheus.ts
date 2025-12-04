// Prefer explicit PROMETHEUS_URL, fall back to NEXT_PUBLIC, then local Prometheus default port
const PROMETHEUS_URL = process.env.PROMETHEUS_URL || process.env.NEXT_PUBLIC_PROMETHEUS_URL || 'http://localhost:9090'

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
  const result = await query('sum by (client_name) (openmemory_requests_total)')
  const byClient: Record<string, number> = {}
  result.data.result.forEach((item) => {
    const clientId = item.metric.client_name || 'unknown'
    byClient[clientId] = item.value ? parseFloat(item.value[1]) : 0
  })
  return byClient
}

export async function getRequestsByMethod(): Promise<{ reads: Record<string, number>, writes: Record<string, number> }> {
  // Reads = operation="read", Writes = operation="create"/"update"/"delete"
  const readsResult = await query('sum by (client_name) (openmemory_requests_total{operation="read"})')
  const writesResult = await query('sum by (client_name) (openmemory_requests_total{operation=~"create|update|delete"})')
  const writes: Record<string, number> = {}
  const reads: Record<string, number> = {}

  readsResult.data.result.forEach((item) => {
    const clientId = item.metric.client_name || 'unknown'
    reads[clientId] = item.value ? parseFloat(item.value[1]) : 0
  })

  writesResult.data.result.forEach((item) => {
    const clientId = item.metric.client_name || 'unknown'
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
  const step = chooseStep(duration)
  const window = toPromDuration(duration)

  // Sliding increase over the selected window
  const result = await queryRange(
    `sum by (client_name) (increase(openmemory_requests_total[${window}]))`,
    start,
    now,
    step
  )

  return formatRangeSeriesByClient(result)
}

export async function getRequestsTimeSeriesByMethod(method: string, duration: string = '1h'): Promise<Array<{ time: number, [client: string]: number | string }>> {
  const now = Math.floor(Date.now() / 1000)
  const start = now - parseDuration(duration)
  const step = chooseStep(duration)
  const window = toPromDuration(duration)

  const result = await queryRange(
    `sum by (client_name) (increase(openmemory_requests_total{method="${method}"}[${window}]))`,
    start,
    now,
    step
  )

  return formatRangeSeriesByClient(result)
}

export async function getResponseTimeTimeSeries(duration: string = '1h'): Promise<Array<{ time: number, [client: string]: number | string }>> {
  const now = Math.floor(Date.now() / 1000)
  const start = now - parseDuration(duration)

  const result = await queryRange(
    'sum by (client_name) (rate(openmemory_request_duration_seconds_sum[5m])) / sum by (client_name) (rate(openmemory_request_duration_seconds_count[5m]))',
    start,
    now,
    '1m'
  )

  const timeSeries: Array<{ time: number, [client: string]: number }> = []
  const timeMap = new Map<number, Record<string, number>>()

  result.data.result.forEach((series) => {
    const clientId = series.metric.client_name || 'unknown'
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
  const result = await query('count(count by (client_name) (openmemory_memories_total))')
  return result.data.result[0]?.value ? parseFloat(result.data.result[0].value[1]) : 0
}

function parseDuration(duration: string): number {
  const match = duration.match(/^(\d+)([smhdwMYy])$/)
  if (!match) return 3600

  const [, amount, unit] = match
  const multipliers: Record<string, number> = {
    s: 1,
    m: 60,
    h: 3600,
    d: 86400,
    w: 604800,      // 7 days
    M: 2592000,     // 30 days (approximation)
    Y: 31536000,    // 365 days
    y: 31536000
  }

  return parseInt(amount) * (multipliers[unit] || 3600)
}

function chooseStep(duration: string): string {
  const seconds = parseDuration(duration)
  if (seconds <= 1800) return '30s'
  if (seconds <= 4 * 3600) return '1m'
  if (seconds <= 12 * 3600) return '2m'
  if (seconds <= 24 * 3600) return '5m'
  if (seconds <= 7 * 86400) return '15m'
  return '30m'
}

// PromQL doesn't support M/Y, map them to days so query_range stays valid
function toPromDuration(duration: string): string {
  const match = duration.match(/^(\d+)([smhdwMyY])$/)
  if (!match) return duration
  const amount = parseInt(match[1])
  const unit = match[2]
  if (unit === 'M') return `${amount * 30}d`
  if (unit === 'Y' || unit === 'y') return `${amount * 365}d`
  return `${amount}${unit}`
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
    'count(count by (client_name) (openmemory_memories_total))',
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
  // Calculate success rate from request status codes
  // Success = not 4xx or 5xx, Failure = status 4xx or 5xx
  const [totalResult, successResult] = await Promise.all([
    query('sum by (client_name) (openmemory_requests_total)'),
    query('sum by (client_name) (openmemory_requests_total{status=~"2..|3.."})')
  ])

  const rates: Record<string, number> = {}

  // First, initialize all clients with 0% (in case they have no successful requests)
  totalResult.data.result.forEach((item) => {
    const clientId = item.metric.client_name || 'unknown'
    rates[clientId] = 0
  })

  // Then calculate success rate for clients with successful requests
  successResult.data.result.forEach((item) => {
    const clientId = item.metric.client_name || 'unknown'
    const successCount = item.value ? parseFloat(item.value[1]) : 0

    // Find total count for this client
    const totalItem = totalResult.data.result.find(t => (t.metric.client_name || 'unknown') === clientId)
    const totalCount = totalItem?.value ? parseFloat(totalItem.value[1]) : 0

    if (totalCount > 0) {
      rates[clientId] = (successCount / totalCount) * 100
    }
  })

  return rates
}

export async function getSuccessRateTimeSeriesByClient(duration: string = '1h'): Promise<Array<{ time: number, [client: string]: number | string }>> {
  const now = Math.floor(Date.now() / 1000)
  const start = now - parseDuration(duration)

  // Formula: (requests - errors) / requests * 100
  // Use raw counters instead of rate() to avoid 0% when no new requests
  const step = chooseStep(duration)
  const [allClients, totalResult, errorResult] = await Promise.all([
    getAllActiveClients(duration),
    queryRange(
      'sum by (client_name) (openmemory_requests_total)',
      start,
      now,
      step
    ),
    queryRange(
      'sum by (client_name) (openmemory_errors_total)',
      start,
      now,
      step
    )
  ])

  const timeMap = new Map<number, Record<string, { total: number, errors: number }>>()
  const allTimestamps = new Set<number>()

  // Collect totals
  totalResult.data.result.forEach((series) => {
    const clientId = series.metric.client_name || 'unknown'

    series.values?.forEach(([timestamp, value]) => {
      allTimestamps.add(timestamp)
      if (!timeMap.has(timestamp)) {
        timeMap.set(timestamp, {})
      }
      const clients = timeMap.get(timestamp)!
      if (!clients[clientId]) {
        clients[clientId] = { total: 0, errors: 0 }
      }
      clients[clientId].total = parseFloat(value)
    })
  })

  // Collect errors
  errorResult.data.result.forEach((series) => {
    const clientId = series.metric.client_name || 'unknown'

    series.values?.forEach(([timestamp, value]) => {
      allTimestamps.add(timestamp)
      if (!timeMap.has(timestamp)) {
        timeMap.set(timestamp, {})
      }
      const clients = timeMap.get(timestamp)!
      if (!clients[clientId]) {
        clients[clientId] = { total: 0, errors: 0 }
      }
      clients[clientId].errors = parseFloat(value)
    })
  })

  // Fill in missing clients with 100% success rate (no errors)
  allTimestamps.forEach((timestamp) => {
    if (!timeMap.has(timestamp)) timeMap.set(timestamp, {})
    const timestampData = timeMap.get(timestamp)!
    allClients.forEach((client) => {
      if (!(client in timestampData)) {
        timestampData[client] = { total: 0, errors: 0 }
      }
    })
  })

  // Calculate success rate percentages: (total - errors) / total * 100
  const timeSeries: Array<{ time: number, [client: string]: number }> = []
  Array.from(timeMap.entries())
    .sort((a, b) => a[0] - b[0])
    .forEach(([timestamp, clients]) => {
      const dataPoint: any = {
        time: timestamp
      }
      Object.keys(clients).forEach((client) => {
        const { total, errors } = clients[client]
        dataPoint[client] = total > 0 ? ((total - errors) / total) * 100 : 100
      })
      timeSeries.push(dataPoint)
    })

  return timeSeries
}

export async function getTopWriter(): Promise<{ name: string, count: number }> {
  // Get client with most write requests (create/update/delete operations)
  const result = await query('topk(1, sum by (client_name) (openmemory_requests_total{operation=~"create|update|delete"}))')
  if (result.data.result.length === 0) {
    return { name: 'N/A', count: 0 }
  }
  const item = result.data.result[0]
  return {
    name: item.metric.client_name || 'unknown',
    count: item.value ? parseFloat(item.value[1]) : 0
  }
}

export async function getTopReader(): Promise<{ name: string, count: number }> {
  // Get client with most read requests
  const result = await query('topk(1, sum by (client_name) (openmemory_requests_total{operation="read"}))')
  if (result.data.result.length === 0) {
    return { name: 'N/A', count: 0 }
  }
  const item = result.data.result[0]
  return {
    name: item.metric.client_name || 'unknown',
    count: item.value ? parseFloat(item.value[1]) : 0
  }
}

export async function getLastWriter(): Promise<{ name: string, timestamp: number }> {
  try {
    const result = await query('topk(1, sum by (client_name) (openmemory_requests_total{operation=~"create|update|delete"}))')
    if (result.data.result.length > 0 && result.data.result[0].value) {
      const count = parseFloat(result.data.result[0].value[1])
      if (count > 0) {
        return {
          name: result.data.result[0].metric.client_name || 'N/A',
          timestamp: Date.now()
        }
      }
    }
  } catch (e) {
    console.error('getLastWriter error:', e)
  }
  return { name: 'N/A', timestamp: 0 }
}

export async function getLastReader(): Promise<{ name: string, timestamp: number }> {
  try {
    const result = await query('topk(1, sum by (client_name) (openmemory_requests_total{operation="read"}))')
    if (result.data.result.length > 0 && result.data.result[0].value) {
      const count = parseFloat(result.data.result[0].value[1])
      if (count > 0) {
        return {
          name: result.data.result[0].metric.client_name || 'N/A',
          timestamp: Date.now()
        }
      }
    }
  } catch (e) {
    console.error('getLastReader error:', e)
  }
  return { name: 'N/A', timestamp: 0 }
}

// Get all active clients in a period
async function getAllActiveClients(duration: string = '1h'): Promise<string[]> {
  const now = Math.floor(Date.now() / 1000)
  const start = now - parseDuration(duration)

  const result = await queryRange(
    'count by (client_name) (openmemory_requests_total)',
    start,
    now,
    '1m'
  )

  const clients = new Set<string>()
  result.data.result.forEach((series) => {
    const clientName = series.metric.client_name || 'unknown'
    clients.add(clientName)
  })

  return Array.from(clients)
}

// Format range query results (already aggregated) into series by client
function formatRangeSeriesByClient(result: PrometheusQueryResult, allClients?: string[], labelKey: string = 'client_name'): Array<{ time: number, [client: string]: number }> {
  const timeMap = new Map<number, Record<string, number>>()
  const allTimestamps = new Set<number>()

  result.data.result.forEach((series) => {
    const clientName = series.metric[labelKey] || 'unknown'
    const values = series.values || []
    values.forEach(([timestamp, value]) => {
      allTimestamps.add(timestamp)
      if (!timeMap.has(timestamp)) timeMap.set(timestamp, {})
      timeMap.get(timestamp)![clientName] = parseFloat(value)
    })
  })

  // Fill in zeros for all clients at all timestamps
  if (allClients && allClients.length > 0) {
    allTimestamps.forEach((timestamp) => {
      if (!timeMap.has(timestamp)) timeMap.set(timestamp, {})
      const timestampData = timeMap.get(timestamp)!
      allClients.forEach((client) => {
        if (!(client in timestampData)) {
          timestampData[client] = 0
        }
      })
    })
  }

  return Array.from(timeMap.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([timestamp, clients]) => ({
      time: timestamp,
      ...clients
    }))
}

// CRUD operation time series
export async function getCreatesByClient(duration: string = '1h'): Promise<Array<{ time: number, [client: string]: number }>> {
  const now = Math.floor(Date.now() / 1000)
  const start = now - parseDuration(duration)
  const step = chooseStep(duration)

  const [allClients, result] = await Promise.all([
    getAllActiveClients(duration),
    queryRange(
      'sum by (client_name) (openmemory_requests_total{operation="create"})',
      start,
      now,
      step
    )
  ])

  return formatRangeSeriesByClient(result, allClients)
}

export async function getReadsByClient(duration: string = '1h'): Promise<Array<{ time: number, [client: string]: number }>> {
  const now = Math.floor(Date.now() / 1000)
  const start = now - parseDuration(duration)
  const step = chooseStep(duration)

  const [allClients, result] = await Promise.all([
    getAllActiveClients(duration),
    queryRange(
      'sum by (client_name) (openmemory_requests_total{operation="read"})',
      start,
      now,
      step
    )
  ])

  return formatRangeSeriesByClient(result, allClients)
}

export async function getUpdatesByClient(duration: string = '1h'): Promise<Array<{ time: number, [client: string]: number }>> {
  const now = Math.floor(Date.now() / 1000)
  const start = now - parseDuration(duration)
  const step = chooseStep(duration)

  const [allClients, result] = await Promise.all([
    getAllActiveClients(duration),
    queryRange(
      'sum by (client_name) (openmemory_requests_total{operation="update"})',
      start,
      now,
      step
    )
  ])

  return formatRangeSeriesByClient(result, allClients)
}

export async function getDeletesByClient(duration: string = '1h'): Promise<Array<{ time: number, [client: string]: number }>> {
  const now = Math.floor(Date.now() / 1000)
  const start = now - parseDuration(duration)
  const step = chooseStep(duration)

  const [allClients, result] = await Promise.all([
    getAllActiveClients(duration),
    queryRange(
      'sum by (client_name) (openmemory_requests_total{operation="delete"})',
      start,
      now,
      step
    )
  ])

  return formatRangeSeriesByClient(result, allClients)
}

export async function getErrorsByClient(duration: string = '1h'): Promise<Array<{ time: number, [client: string]: number }>> {
  const now = Math.floor(Date.now() / 1000)
  const start = now - parseDuration(duration)
  const step = chooseStep(duration)

  const [allClients, result] = await Promise.all([
    getAllActiveClients(duration),
    queryRange(
      'sum by (client_name) (openmemory_errors_total)',
      start,
      now,
      step
    )
  ])

  return formatRangeSeriesByClient(result, allClients)
}
