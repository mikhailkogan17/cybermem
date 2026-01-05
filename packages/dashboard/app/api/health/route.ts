import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

interface ServiceStatus {
  name: string
  status: 'ok' | 'error' | 'warning'
  message?: string
  latencyMs?: number
}

interface SystemHealth {
  overall: 'ok' | 'degraded' | 'error'
  services: ServiceStatus[]
  timestamp: string
}

async function checkService(name: string, url: string, timeout = 3000): Promise<ServiceStatus> {
  const start = Date.now()
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    const res = await fetch(url, {
      signal: controller.signal,
      cache: 'no-store'
    })
    clearTimeout(timeoutId)

    const latencyMs = Date.now() - start

    if (res.ok) {
      return { name, status: 'ok', latencyMs }
    }
    return {
      name,
      status: 'warning',
      message: `HTTP ${res.status}`,
      latencyMs
    }
  } catch (error: any) {
    return {
      name,
      status: 'error',
      message: error.name === 'AbortError' ? 'Timeout' : (error.message || 'Connection failed')
    }
  }
}

export async function GET(request: NextRequest) {
  // Rate limiting
  const rateLimit = checkRateLimit(request)
  if (!rateLimit.allowed) {
    return rateLimitResponse(rateLimit.resetIn)
  }

  // Use environment variables with sensible defaults for local Docker stack
  const prometheusUrl = process.env.PROMETHEUS_URL || 'http://localhost:9092'
  const openMemoryUrl = process.env.CYBERMEM_URL || 'http://localhost:8626'
  const vectorUrl = process.env.VECTOR_URL // Vector is optional

  const checks: Promise<ServiceStatus>[] = [
    checkService('OpenMemory API', `${openMemoryUrl}/health`),
    checkService('Prometheus', `${prometheusUrl}/-/ready`),
  ]

  // Only check Vector if configured
  if (vectorUrl) {
    checks.push(checkService('Vector', `${vectorUrl}/health`))
  }

  const services = await Promise.all(checks)

  // Determine overall status
  const hasError = services.some(s => s.status === 'error')
  const hasWarning = services.some(s => s.status === 'warning')

  const health: SystemHealth = {
    overall: hasError ? 'error' : hasWarning ? 'degraded' : 'ok',
    services,
    timestamp: new Date().toISOString()
  }

  return NextResponse.json(health, {
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'X-RateLimit-Remaining': String(rateLimit.remaining)
    }
  })
}
