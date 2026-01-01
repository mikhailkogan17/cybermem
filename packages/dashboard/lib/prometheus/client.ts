// Prefer explicit PROMETHEUS_URL, fall back to NEXT_PUBLIC, then local Prometheus default port (mapped to 9092 in docker-compose)
export const PROMETHEUS_URL = process.env.PROMETHEUS_URL || process.env.NEXT_PUBLIC_PROMETHEUS_URL || 'http://localhost:9092'

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

export async function query(promql: string): Promise<PrometheusQueryResult> {
  try {
    const controller = new AbortController()
    const id = setTimeout(() => controller.abort(), 1500)

    const response = await fetch(`${PROMETHEUS_URL}/api/v1/query?query=${encodeURIComponent(promql)}`, {
      signal: controller.signal,
      cache: 'no-store'
    })
    clearTimeout(id)

    if (!response.ok) {
      throw new Error(`Prometheus query failed: ${response.statusText}`)
    }
    return response.json()
  } catch (error) {
    console.error('Prometheus query failed:', error)
    return { status: 'error', data: { resultType: 'vector', result: [] } }
  }
}

export async function queryRange(promql: string, start: number, end: number, step: string = '1m'): Promise<PrometheusQueryResult> {
  try {
    const url = `${PROMETHEUS_URL}/api/v1/query_range?query=${encodeURIComponent(promql)}&start=${start}&end=${end}&step=${step}`

    const controller = new AbortController()
    const id = setTimeout(() => controller.abort(), 1500)

    const response = await fetch(url, {
      signal: controller.signal,
      cache: 'no-store'
    })
    clearTimeout(id)

    if (!response.ok) {
       throw new Error(`Prometheus range query failed: ${response.statusText}`)
    }
    return response.json()
  } catch (error) {
    console.error('Prometheus range query failed:', error)
    return { status: 'error', data: { resultType: 'matrix', result: [] } }
  }
}
