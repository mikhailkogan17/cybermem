// Prefer explicit PROMETHEUS_URL, fall back to NEXT_PUBLIC, then local Prometheus default port (mapped to 9092 in docker-compose)
const PROMETHEUS_URL = process.env.PROMETHEUS_URL || process.env.NEXT_PUBLIC_PROMETHEUS_URL || 'http://localhost:9092'

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
  try {
    const controller = new AbortController()
    const id = setTimeout(() => controller.abort(), 1500)

    const response = await fetch(`${PROMETHEUS_URL}/api/v1/query?query=${encodeURIComponent(promql)}`, {
      signal: controller.signal
    })
    clearTimeout(id)

    if (!response.ok) {
      throw new Error(`Prometheus query failed: ${response.statusText}`)
    }
    return response.json()
  } catch (error) {
    console.warn('Prometheus query failed, using mock data:', error)
    return getMockData(promql)
  }
}

// Mock data generator
function getMockData(query: string): PrometheusQueryResult {
  const now = Math.floor(Date.now() / 1000)

  // Helper to create metric format
  const createMetric = (value: number, labels: Record<string, string> = {}) => ({
    metric: labels,
    value: [now, value.toString()] as [number, string]
  })

  // Handle various queries
  let result: any[] = []

  if (query.includes('openmemory_requests_total')) {
    if (query.includes('sum by (client_name)')) {
      result = [
        createMetric(150, { client_name: 'Claude Desktop' }),
        createMetric(80, { client_name: 'Cursor' }),
        createMetric(45, { client_name: 'VS Code' })
      ]
    } else {
      result = [createMetric(275)]
    }
  } else if (query.includes('success_rate')) {
    result = [createMetric(98.5)]
  } else if (query.includes('memory_records') || query.includes('memories_total')) {
    result = [createMetric(42)]
  } else if (query.includes('client_count')) {
    result = [createMetric(3)]
  }

  return {
    status: 'success',
    data: {
      resultType: 'vector',
      result
    }
  }
}

async function queryRange(promql: string, start: number, end: number, step: string = '1m'): Promise<PrometheusQueryResult> {
  try {
    const url = `${PROMETHEUS_URL}/api/v1/query_range?query=${encodeURIComponent(promql)}&start=${start}&end=${end}&step=${step}`

    const controller = new AbortController()
    const id = setTimeout(() => controller.abort(), 1500)

    const response = await fetch(url, { signal: controller.signal })
    clearTimeout(id)

    if (!response.ok) {
       throw new Error(`Prometheus range query failed: ${response.statusText}`)
    }
    return response.json()
  } catch (error) {
    console.warn('Prometheus range query failed, using mock data:', error)
    return getMockRangeData(promql, start, end, step)
  }
}

function getMockRangeData(query: string, start: number, end: number, step: string): PrometheusQueryResult {
  const stepSeconds = parseDuration(step) || 60
  const values: [number, string][] = []

  for (let t = start; t <= end; t += stepSeconds) {
    // Generate some random-looking but consistent data
    // Generate small random deltas (0-5) for integration compatibility
    // Previous "rate-like" values (20-30) caused massive ramps when integrated over time
    const val = Math.random() > 0.7 ? Math.floor(Math.random() * 5) : 0
    values.push([t, val.toString()])
  }

  return {
    status: 'success',
    data: {
      resultType: 'matrix',
      result: [{
        metric: { client_name: 'Mock Client' },
        values: values
      }]
    }
  }
}

export async function getTotalRequests(duration: string = '15m'): Promise<number> {
  const result = await query('sum(openmemory_requests_total)')
  return result.data.result[0]?.value ? parseFloat(result.data.result[0].value[1]) : 0
}

export async function getRequestsByClient(duration: string = '15m'): Promise<Record<string, number>> {
  const result = await query('sum by (client_name) (openmemory_requests_total)')
  const byClient: Record<string, number> = {}
  result.data.result.forEach((item) => {
    const clientId = item.metric.client_name || 'unknown'
    byClient[clientId] = item.value ? parseFloat(item.value[1]) : 0
  })
  return byClient
}

export async function getRequestsByMethod(duration: string = '15m'): Promise<{ reads: Record<string, number>, writes: Record<string, number> }> {
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
  const stepSeconds = parseDuration(step)

  // Use sum (Cumulative) to show total requests over time
  const result = await queryRange(
    `sum by (client_name) (openmemory_requests_total)`,
    start,
    now,
    step
  )

  return formatRangeSeriesByClient(result, start, now, stepSeconds)
}

export async function getRequestsTimeSeriesByMethod(method: string, duration: string = '1h'): Promise<Array<{ time: number, [client: string]: number | string }>> {
  const now = Math.floor(Date.now() / 1000)
  const start = now - parseDuration(duration)
  const step = chooseStep(duration)
  const stepSeconds = parseDuration(step)

  const result = await queryRange(
    `sum by (client_name) (openmemory_requests_total{method="${method}"})`,
    start,
    now,
    step
  )

  return formatRangeSeriesByClient(result, start, now, stepSeconds)
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

  const step = chooseStep(duration)

  const result = await queryRange(
    'sum(rate(openmemory_requests_total{status=~"2.."}[5m])) / sum(rate(openmemory_requests_total[5m]))',
    start,
    now,
    step
  )

  const series = result.data.result[0]
  const values = series?.values || []

  // Fill gaps
  const timeSeries: Array<{ time: number, value: number }> = []
  const valueMap = new Map<number, number>()
  values.forEach(([t, v]) => valueMap.set(t, parseFloat(v) * 100))

  const stepSeconds = parseDuration(chooseStep(duration))
  for (let t = start; t <= now; t += stepSeconds) {
    // Find closest value
    let val = 100 // Default to 100% if no data
    for (let offset = -1; offset <= 1; offset++) {
      if (valueMap.has(t + offset)) {
        val = valueMap.get(t + offset)!
        break
      }
    }
    timeSeries.push({ time: t, value: val })
  }

  return timeSeries
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
  if (seconds <= 3600) return '4m'      // 1h -> 4m (15 pts). More reliable than 2m.
  if (seconds <= 6 * 3600) return '5m' // 6h -> 5m (72 pts)
  if (seconds <= 24 * 3600) return '15m' // 24h -> 15m (96 pts)
  if (seconds <= 7 * 86400) return '1h'  // 7d -> 1h (168 pts)
  return '4h'                            // >7d -> 4h (e.g. 90d -> 540 pts)
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

// Helper to fill gaps in sparkline data
function fillSparklineGaps(values: Array<[number, string]>, start: number, end: number, step: number, defaultValue: number = 0): number[] {
  const result: number[] = []
  const valueMap = new Map<number, number>()

  values.forEach(([ts, val]) => {
    valueMap.set(ts, parseFloat(val))
  })

  for (let t = start; t <= end; t += step) {
    // Find closest timestamp within step/2
    // But query_range usually returns aligned timestamps.
    // We'll just check for exact match or use the closest if needed,
    // but for now exact match on the step grid is expected from Prometheus if aligned.
    // Actually Prometheus timestamps might be slightly off?
    // query_range aligns to step if start is aligned.
    // Let's just look for the value.

    // To be safe against slight misalignments, we can look for a value in [t, t+step)
    // But simplest is to trust Prometheus alignment or use the map.
    // If we want to be robust:
    let found = false
    if (valueMap.has(t)) {
      result.push(valueMap.get(t)!)
      found = true
    } else {
      // Try to find a value close to t
      // This is O(N*M) but N is small (20-100 points).
      // Optimization: values are sorted.
    }

    if (!found) {
       result.push(defaultValue)
    }
  }

  // If we just iterate the map, we miss gaps.
  // So iterating time is correct.
  // Let's refine the map lookup.
  // Prometheus returns seconds.

  return result
}

// Improved version that handles the map lookup correctly
function fillSparklineData(values: Array<[number, string]>, start: number, end: number, step: number, defaultValue: number = 0): number[] {
  const map = new Map<number, number>()
  values.forEach(([t, v]) => map.set(t, parseFloat(v)))

  const result: number[] = []
  // Align start to step if needed? Prometheus start is respected.
  // We assume start/end/step match the query.

  for (let t = start; t <= end; t += step) {
    // Allow for small jitter (1s)
    let val = defaultValue
    for (let offset = -1; offset <= 1; offset++) {
      if (map.has(t + offset)) {
        val = map.get(t + offset)!
        break
      }
    }
    result.push(val)
  }
  return result
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
  const stepSeconds = parseDuration(step)
  const [allClients, totalResult, errorResult] = await Promise.all([
    getAllActiveClients(duration),
    queryRange(
      `sum by (client_name) (openmemory_requests_total)`,
      start,
      now,
      step
    ),
    queryRange(
      `sum by (client_name) (openmemory_errors_total)`,
      start,
      now,
      step
    )
  ])

  const timeMap = new Map<number, Record<string, { total: number, errors: number }>>()

  // Initialize all timestamps
  for (let t = start; t <= now; t += stepSeconds) {
    timeMap.set(t, {})
    allClients.forEach(client => {
      timeMap.get(t)![client] = { total: 0, errors: 0 }
    })
  }

  // Collect totals
  totalResult.data.result.forEach((series) => {
    const clientId = series.metric.client_name || 'unknown'

    series.values?.forEach(([timestamp, value]) => {
      // Find closest timestamp
      let targetTs = timestamp
      if (!timeMap.has(timestamp)) {
        for (let offset = -1; offset <= 1; offset++) {
          if (timeMap.has(timestamp + offset)) {
            targetTs = timestamp + offset
            break
          }
        }
      }

      if (timeMap.has(targetTs)) {
        const clients = timeMap.get(targetTs)!
        if (!clients[clientId]) clients[clientId] = { total: 0, errors: 0 }
        clients[clientId].total = parseFloat(value)
      }
    })
  })

  // Collect errors
  errorResult.data.result.forEach((series) => {
    const clientId = series.metric.client_name || 'unknown'

    series.values?.forEach(([timestamp, value]) => {
      // Find closest timestamp
      let targetTs = timestamp
      if (!timeMap.has(timestamp)) {
        for (let offset = -1; offset <= 1; offset++) {
          if (timeMap.has(timestamp + offset)) {
            targetTs = timestamp + offset
            break
          }
        }
      }

      if (timeMap.has(targetTs)) {
        const clients = timeMap.get(targetTs)!
        if (!clients[clientId]) clients[clientId] = { total: 0, errors: 0 }
        clients[clientId].errors = parseFloat(value)
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

export async function getTopWriter(duration: string = '15m'): Promise<{ name: string, count: number }> {
  // Get client with most write requests in the specified duration
  const promDuration = toPromDuration(duration)
  const result = await query(`topk(1, sum by (client_name) (increase(openmemory_requests_total{operation=~"create|update|delete"}[${promDuration}])))`)

  if (result.data.result.length === 0) {
    return { name: 'N/A', count: 0 }
  }

  const item = result.data.result[0]
  const count = item.value ? Math.round(parseFloat(item.value[1])) : 0

  return {
    name: item.metric.client_name || 'unknown',
    count
  }
}

export async function getTopReader(duration: string = '15m'): Promise<{ name: string, count: number }> {
  // Get client with most read requests in the specified duration
  const promDuration = toPromDuration(duration)
  const result = await query(`topk(1, sum by (client_name) (increase(openmemory_requests_total{operation="read"}[${promDuration}])))`)

  if (result.data.result.length === 0) {
    return { name: 'N/A', count: 0 }
  }

  const item = result.data.result[0]
  const count = item.value ? Math.round(parseFloat(item.value[1])) : 0

  return {
    name: item.metric.client_name || 'unknown',
    count
  }
}

export async function getLastWriter(): Promise<{ name: string, timestamp: number }> {
  try {
    // Look for writers in the last 5 minutes to identify "current/last" activity
    const result = await query('topk(1, sum by (client_name) (increase(openmemory_requests_total{operation=~"create|update|delete"}[5m])))')
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
    // Look for readers in the last 5 minutes to identify "current/last" activity
    const result = await query('topk(1, sum by (client_name) (increase(openmemory_requests_total{operation="read"}[5m])))')
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
  const promDuration = toPromDuration(duration)

  // Use instant query with increase() over the whole duration to find clients with ANY activity
  // This is significantly lighter than querying count() over time with queryRange
  const result = await query(
    `sum by (client_name) (increase(openmemory_requests_total[${promDuration}])) > 0`
  )

  const clients = new Set<string>()
  result.data.result.forEach((series) => {
    const clientName = series.metric.client_name || 'unknown'
    clients.add(clientName)
  })

  return Array.from(clients)
}

// Format range query results (already aggregated) into series by client
function formatRangeSeriesByClient(
  result: PrometheusQueryResult,
  start: number,
  end: number,
  stepSeconds: number,
  allClients?: string[],
  labelKey: string = 'client_name',
  isCumulative: boolean = true,
  integrate: boolean = false
): Array<{ time: number, [client: string]: number }> {
  const timeMap = new Map<number, Record<string, number>>()

  // Initialize all timestamps with 0s
  for (let t = start; t <= end; t += stepSeconds) {
    timeMap.set(t, {})
    if (allClients) {
      allClients.forEach(client => {
        timeMap.get(t)![client] = 0
      })
    }
  }

  result.data.result.forEach((series) => {
    const clientName = series.metric[labelKey] || 'unknown'
    const values = series.values || []
    values.forEach(([timestamp, value]) => {
      // Find closest timestamp in our map (to handle slight jitter)
      let targetTs = timestamp
      if (!timeMap.has(timestamp)) {
        // Try to find within 1 second
        for (let offset = -1; offset <= 1; offset++) {
          if (timeMap.has(timestamp + offset)) {
            targetTs = timestamp + offset
            break
          }
        }
      }

      if (timeMap.has(targetTs)) {
        timeMap.get(targetTs)![clientName] = parseFloat(value)
      }
    })
  })

  // Fill in zeros for all clients at all timestamps
  if (allClients && allClients.length > 0) {
    // Iterate over all timestamps in the map
    Array.from(timeMap.keys()).forEach((timestamp) => {
      const timestampData = timeMap.get(timestamp)!
      allClients.forEach((client) => {
        if (!(client in timestampData)) {
          timestampData[client] = 0
        }
      })
    })
  }

  const sortedSeries = Array.from(timeMap.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([timestamp, clients]) => ({
      time: timestamp,
      ...clients
    }))

  // "Tare" logic: Subtract the initial value (at t=0 of the graph) from all subsequent values
  // This ensures the graph starts at 0 and shows cumulative growth relative to the start of the period.
  // "Tare" logic: Subtract the initial value (at t=0 of the graph) from all subsequent values
  // Only apply if isCumulative is true
  if (isCumulative && sortedSeries.length > 0) {
    const initialValues: Record<string, number> = {}
    // Initialize with the values from the first point
    const firstPoint = sortedSeries[0] as Record<string, any>
    Object.keys(firstPoint).forEach(key => {
      if (key !== 'time') {
        initialValues[key] = firstPoint[key] as number
      }
    })

    // Subtract initial values from all points
    return sortedSeries.map(point => {
      const p = point as Record<string, any>
      const newPoint: any = { time: p.time }
      Object.keys(p).forEach(key => {
        if (key !== 'time') {
          const rawValue = p[key] as number
          const startValue = initialValues[key] || 0
          // Ensure we don't go below zero (in case of resets)
          newPoint[key] = Math.max(0, rawValue - startValue)
        }
      })
      return newPoint
    })
  }

  // Integration logic: Accumulate values over time
  // Used when we query 'increase' (deltas) but want to show 'Total' (cumulative)
  if (integrate && sortedSeries.length > 0) {
     // We need to track running total for EACH client
     const runningTotals: Record<string, number> = {}

     // Initialize (optional, assume 0)

     return sortedSeries.map(point => {
        const p = point as Record<string, any>
        const newPoint: any = { time: p.time }

        Object.keys(p).forEach(key => {
           if (key !== 'time') {
              const delta = p[key] as number
              runningTotals[key] = (runningTotals[key] || 0) + delta
              newPoint[key] = Math.round(runningTotals[key])
           }
        })
        return newPoint
     })
  }

  return sortedSeries
}

// CRUD operation time series
export async function getCreatesByClient(duration: string = '1h'): Promise<Array<{ time: number, [client: string]: number }>> {
  const now = Math.floor(Date.now() / 1000)
  const start = now - parseDuration(duration)
  const step = chooseStep(duration)
  const stepSeconds = parseDuration(step)

  const [allClients, result] = await Promise.all([
    getAllActiveClients(duration),
    queryRange(
      `sum by (client_name) (increase(openmemory_requests_total{operation="create"}[${step}]))`,
      start,
      now,
      step
    )
  ])

  return formatRangeSeriesByClient(result, start, now, stepSeconds, allClients, 'client_name', false, true)
}

export async function getReadsByClient(duration: string = '1h'): Promise<Array<{ time: number, [client: string]: number }>> {
  const now = Math.floor(Date.now() / 1000)
  const start = now - parseDuration(duration)
  const step = chooseStep(duration)
  const stepSeconds = parseDuration(step)

  const [allClients, result] = await Promise.all([
    getAllActiveClients(duration),
    queryRange(
      `sum by (client_name) (increase(openmemory_requests_total{operation="read"}[${step}]))`,
      start,
      now,
      step
    )
  ])

  return formatRangeSeriesByClient(result, start, now, stepSeconds, allClients, 'client_name', false, true)
}

export async function getUpdatesByClient(duration: string = '1h'): Promise<Array<{ time: number, [client: string]: number }>> {
  const now = Math.floor(Date.now() / 1000)
  const start = now - parseDuration(duration)
  const step = chooseStep(duration)
  const stepSeconds = parseDuration(step)

  const [allClients, result] = await Promise.all([
    getAllActiveClients(duration),
    queryRange(
      `sum by (client_name) (increase(openmemory_requests_total{operation="update"}[${step}]))`,
      start,
      now,
      step
    )
  ])

  return formatRangeSeriesByClient(result, start, now, stepSeconds, allClients, 'client_name', false, true)
}

export async function getDeletesByClient(duration: string = '1h'): Promise<Array<{ time: number, [client: string]: number }>> {
  const now = Math.floor(Date.now() / 1000)
  const start = now - parseDuration(duration)
  const step = chooseStep(duration)
  const stepSeconds = parseDuration(step)

  const [allClients, result] = await Promise.all([
    getAllActiveClients(duration),
    queryRange(
      `sum by (client_name) (increase(openmemory_requests_total{operation="delete"}[${step}]))`,
      start,
      now,
      step
    )
  ])

  return formatRangeSeriesByClient(result, start, now, stepSeconds, allClients, 'client_name', false, true)
}

export async function getErrorsByClient(duration: string = '1h'): Promise<Array<{ time: number, [client: string]: number }>> {
  const now = Math.floor(Date.now() / 1000)
  const start = now - parseDuration(duration)
  const step = chooseStep(duration)
  const stepSeconds = parseDuration(step)

  const [allClients, result] = await Promise.all([
    getAllActiveClients(duration),
    queryRange(
      `sum by (client_name) (increase(openmemory_errors_total[${step}]))`,
      start,
      now,
      step
    )
  ])

  return formatRangeSeriesByClient(result, start, now, stepSeconds, allClients, 'client_name', false, true)
}
