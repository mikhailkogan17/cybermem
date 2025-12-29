import { queryRange } from './client'
import { getAllActiveClients } from './metrics'
import { chooseStep, formatRangeSeriesByClient, parseDuration } from './utils'

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
    `sum by (client_name) (openmemory_requests_total{operation="${method}"})`,
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
