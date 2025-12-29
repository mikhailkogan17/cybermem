import { query } from './client'
import { toPromDuration } from './utils'

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

export async function getMemoryRecordsCount(): Promise<number> {
  // Get total memories across all clients
  const result = await query('sum(openmemory_memories_total)')
  return result.data.result[0]?.value ? parseFloat(result.data.result[0].value[1]) : 0
}

export async function getClientCount(): Promise<number> {
  const result = await query('count(count by (client_name) (openmemory_memories_total))')
  return result.data.result[0]?.value ? parseFloat(result.data.result[0].value[1]) : 0
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

export async function getTopWriter(duration: string = '15m'): Promise<{ name: string, count: number }> {
  // Get client with most write requests in the specified duration
  const promDuration = toPromDuration(duration)

  // Try with increase() first (deltas)
  let queryStr = `topk(1, sum by (client_name) (increase(openmemory_requests_total{operation=~"create|update|delete"}[${promDuration}])))`
  let result = await query(queryStr)

  // Fallback: If no increase detected (singular data point or very low traffic),
  if (result.data.result.length === 0) {
     // First fallback: Check raw total requests
     queryStr = `topk(1, sum by (client_name) (openmemory_requests_total{operation=~"create|update|delete"}))`
     result = await query(queryStr)

     // Second fallback: Check actual memories stored (from db-exporter, reliable)
     if (result.data.result.length === 0) {
        queryStr = `topk(1, sum by (client) (openmemory_memories_total))`
        result = await query(queryStr)
     }
  }

  if (result.data.result.length === 0) {
    return { name: 'N/A', count: 0 }
  }

  const item = result.data.result[0]
  let count = item.value ? Math.round(parseFloat(item.value[1])) : 0
  const rawName = item.metric.client_name || item.metric.client || 'unknown'

  return {
    name: rawName,
    count
  }
}

export async function getTopReader(duration: string = '15m'): Promise<{ name: string, count: number }> {
  // Get client with most read requests in the specified duration
  const promDuration = toPromDuration(duration)
  const result = await query(`topk(1, sum by (client_name) (increase(openmemory_requests_total{operation="read"}[${promDuration}])))`)

  if (result.data.result.length === 0) {
     // Fallback to raw total requests (Traefik) only
     const valResult = await query(`topk(1, sum by (client_name) (openmemory_requests_total{operation="read"}))`)
     result.data.result = valResult.data.result
  }

  if (result.data.result.length === 0) {
      return { name: 'N/A', count: 0 }
  }

  const item = result.data.result[0]
  const count = item.value ? Math.round(parseFloat(item.value[1])) : 0
  const rawName = item.metric.client_name || 'unknown'

  return {
    name: rawName,
    count
  }
}

export async function getLastWriter(): Promise<{ name: string, timestamp: number }> {
  try {
    // Look for writers in the last 1h
    const result = await query('topk(1, sum by (client_name) (increase(openmemory_requests_total{operation=~"create|update|delete"}[1h])))')

    if (result.data.result.length > 0 && result.data.result[0].value) {
      const item = result.data.result[0]
      const count = item.value ? parseFloat(item.value[1]) : 0
      if (count > 0) {
         const rawName = item.metric.client_name || 'unknown'
         return {
          name: rawName,
          timestamp: Date.now()
        }
      }
    }

    // Fallback: Check total requests (lifetime) - still within Traefik source
    const totalResult = await query('topk(1, sum by (client_name) (openmemory_requests_total{operation=~"create|update|delete"}))')
    if (totalResult.data.result.length > 0) {
        const item = totalResult.data.result[0]
        if (item?.value) {
          const rawName = item.metric.client_name || 'unknown'
          return {
              name: rawName,
              timestamp: Date.now() // Approximate
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
        const rawName = result.data.result[0].metric.client_name || 'unknown'
        return {
          name: rawName,
          timestamp: Date.now()
        }
      }
    }

    // Fallback: look at total reads (lifetime) if no recent increase
    const totalResult = await query('topk(1, sum by (client_name) (openmemory_requests_total{operation="read"}))')
    if (totalResult.data.result.length > 0) {
       const item = totalResult.data.result[0]
       if (item?.value) {
          const rawName = item.metric.client_name || 'unknown'
          return {
             name: rawName,
             timestamp: Date.now() // Approximate
          }
       }
    }
  } catch (e) {
    console.error('getLastReader error:', e)
  }
  return { name: 'N/A', timestamp: 0 }
}

// Get all active clients in a period
export async function getAllActiveClients(duration: string = '1h'): Promise<string[]> {
  const promDuration = toPromDuration(duration)

  // Use instant query with increase() over the whole duration to find clients with ANY activity
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
