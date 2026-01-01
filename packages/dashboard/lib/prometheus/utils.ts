import { PrometheusQueryResult } from './client'

export function parseDuration(duration: string): number {
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

export function chooseStep(duration: string): string {
  const seconds = parseDuration(duration)
  if (seconds <= 3600) return '4m'      // 1h -> 4m (15 pts). More reliable than 2m.
  if (seconds <= 6 * 3600) return '5m' // 6h -> 5m (72 pts)
  if (seconds <= 24 * 3600) return '15m' // 24h -> 15m (96 pts)
  if (seconds <= 7 * 86400) return '1h'  // 7d -> 1h (168 pts)
  return '4h'                            // >7d -> 4h (e.g. 90d -> 540 pts)
}

// PromQL doesn't support M/Y, map them to days so query_range stays valid
export function toPromDuration(duration: string): string {
  const match = duration.match(/^(\d+)([smhdwMyY])$/)
  if (!match) return duration
  const amount = parseInt(match[1])
  const unit = match[2]
  if (unit === 'M') return `${amount * 30}d`
  if (unit === 'Y' || unit === 'y') return `${amount * 365}d`
  return `${amount}${unit}`
}

// Improved version that handles the map lookup correctly
export function fillSparklineData(values: Array<[number, string]>, start: number, end: number, step: number, defaultValue: number = 0): number[] {
  const map = new Map<number, number>()
  values.forEach(([t, v]) => map.set(t, parseFloat(v)))

  const result: number[] = []

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

// Format range query results (already aggregated) into series by client
export function formatRangeSeriesByClient(
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
  if (integrate && sortedSeries.length > 0) {
      const runningTotals: Record<string, number> = {}

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
