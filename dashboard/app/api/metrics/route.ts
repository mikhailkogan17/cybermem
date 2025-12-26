import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

// MARKETING MOCK DATA
export async function GET(request: Request) {
  // Generate 30 data points for the last 30 minutes
  const mockTimeSeries = Array.from({ length: 30 }, (_, i) => {
    const timestamp = new Date(Date.now() - (29 - i) * 60000).toISOString()
    // Return timestamp as 'time' (or let frontend handle it) and specific client keys
    // The frontend helper 'formatSeries' uses 'time' property if it exists, or likely 'timestamp' if strictly typed elsewhere?
    // Looking at chart-card.tsx: `const date = new Date((point.time as number) * 1000)` ... wait.
    // The real Prometheus API returns unix timestamps. My mock returned ISO strings.
    // BUT the previous mock worked (charts showed up), just with wrong keys.
    // Let's look at `chart-card.tsx` again.
    // Line 55: `new Date((point.time as number) * 1000)` suggests it expects UNIX seconds.
    // BUT my previous mock mockTimeSeries returned `{ timestamp: ISOString, value }`.
    // And `formatSeries` mapped `point.time`.
    // If my previous mock used `timestamp` key, `chart-card.tsx` might have been failing to parse date?
    // Wait, the user said "charts are populated" but with "value" key.
    // If I look at the previous mock:
    /*
      const mockTimeSeries = Array.from({ length: 30 }, (_, i) => ({
        timestamp: new Date(Date.now() - (29 - i) * 60000).toISOString(),
        value: ...
      }))
    */
    // `metrics/route.ts` line 113: `requests: requestsTimeSeries`. `getRequestsTimeSeries` returns array of objects.
    // The frontend `chart-card.tsx` uses `apiData.timeSeries.creates`.

    // Let's assume the frontend handles whatever `metrics/route.ts` returns, but `chart-card.tsx` specifically:
    // `const date = new Date((point.time as number) * 1000)`
    // This looks like it expects `time` to be seconds.
    // However, if I send `timestamp` (ISO string), `new Date(undefined * 1000)` is Invalid Date.
    // Maybe the user's chart WAS showing invalid dates or just empty X-axis? The user complaint was "timestamp value" in legend.

    // I will return `time` as unix seconds to be safe and correct.
    const time = Math.floor((Date.now() - (29 - i) * 60000) / 1000)

    return {
      time: time,
      "Claude Desktop": Math.floor(Math.random() * 20) + 5,
      "Cursor": Math.floor(Math.random() * 45) + 10,
      "Windsurf": Math.floor(Math.random() * 10) + 2
    }
  })

  // For the generic `requests` and `responseTime` which might be single series:
  const genericSeries = mockTimeSeries.map(d => ({
    time: d.time,
    value: Math.floor(Math.random() * 100) + 50
  }))

  return NextResponse.json({
    stats: {
      memoryRecords: 12584,
      totalClients: 8,
      successRate: 99.8,
      totalRequests: 45210,
      topWriter: "Claude Desktop",
      topReader: "Cursor",
      lastWriter: "Windsurf",
      lastReader: "Warp"
    },
    clientStats: {
      reads: {
        "Claude Desktop": 1205,
        "Cursor": 3400,
        "Windsurf": 890,
        "Warp": 450,
        "VSCode": 2100
      },
      writes: {
        "Claude Desktop": 850,
        "Cursor": 120,
        "Windsurf": 450,
        "Warp": 10,
        "VSCode": 300
      },
      successRate: {
        "Claude Desktop": 100,
        "Cursor": 99.5,
        "Windsurf": 100,
        "Warp": 100,
        "VSCode": 98.2
      }
    },
    // The structure expected by chart-card.tsx is:
    // apiData.timeSeries.creates/reads/etc -> array of objects
    timeSeries: {
      requests: genericSeries,
      responseTime: genericSeries.map(d => ({ ...d, value: Math.random() * 50 })),
      successRate: genericSeries.map(d => ({ ...d, value: 99.8 })),
      successRateByClient: {},
      // Here are the multi-series ones used by ChartsSection
      writes: mockTimeSeries,
      creates: mockTimeSeries,
      reads: mockTimeSeries.map(d => ({
        time: d.time,
        "Claude Desktop": d["Claude Desktop"] * 2,
        "Cursor": d["Cursor"] * 1.5,
        "Windsurf": d["Windsurf"]
      })),
      updates: mockTimeSeries.map(d => ({
        time: d.time,
        "Claude Desktop": Math.floor(Math.random() * 5),
        "Cursor": Math.floor(Math.random() * 10),
      })),
      deletes: mockTimeSeries.map(d => ({
         time: d.time,
         "Claude Desktop": Math.floor(Math.random() * 2),
      })),
      errors: []
    },
    sparklines: {
      memoryRecords: Array(20).fill(0).map(() => 12000 + Math.random() * 500),
      totalRequests: Array(20).fill(0).map(() => 45000 + Math.random() * 200),
      totalClients: Array(20).fill(8),
      successRate: Array(20).fill(99.8)
    }
  })
}
