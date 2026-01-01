import { NextRequest, NextResponse } from 'next/server'

const PROMETHEUS_URL = process.env.PROMETHEUS_URL || 'http://localhost:9090'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const query = searchParams.get('query')

  if (!query) {
    return NextResponse.json({ error: 'Query parameter is required' }, { status: 400 })
  }

  try {
    const prometheusResponse = await fetch(
      `${PROMETHEUS_URL}/api/v1/query?query=${encodeURIComponent(query)}`
    )

    if (!prometheusResponse.ok) {
      throw new Error(`Prometheus returned ${prometheusResponse.status}`)
    }

    const data = await prometheusResponse.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching from Prometheus:', error)
    return NextResponse.json(
      { error: 'Failed to fetch data from Prometheus' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { query, start, end, step } = body

    if (!query) {
      return NextResponse.json({ error: 'Query parameter is required' }, { status: 400 })
    }

    const params = new URLSearchParams({
      query,
      ...(start && { start: start.toString() }),
      ...(end && { end: end.toString() }),
      ...(step && { step: step.toString() }),
    })

    const endpoint = start && end ? 'query_range' : 'query'
    const prometheusResponse = await fetch(`${PROMETHEUS_URL}/api/v1/${endpoint}?${params}`)

    if (!prometheusResponse.ok) {
      throw new Error(`Prometheus returned ${prometheusResponse.status}`)
    }

    const data = await prometheusResponse.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching from Prometheus:', error)
    return NextResponse.json(
      { error: 'Failed to fetch data from Prometheus' },
      { status: 500 }
    )
  }
}
