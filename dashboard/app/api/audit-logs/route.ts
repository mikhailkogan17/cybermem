import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    // STRICT SOURCE: Traefik Logs (via db-exporter /api/logs)
    // We are deliberately NOT using OpenMemory /memory/all anymore.
    // This ensures we see the raw "X-Client-Name" (e.g. "antigravity")
    // instead of the DB "user_id" which might be anonymous.
    const DB_EXPORTER_URL = 'http://cybermem-db-exporter:8000'
    const limit = 50

    // Fetch logs from db-exporter (which reads cybermem_access_log table populated by log-exporter)
    // This table contains ONLY Traefik access logs.
    const response = await fetch(`${DB_EXPORTER_URL}/api/logs?limit=${limit}`, {
      cache: 'no-store'
    })

    if (!response.ok) {
        console.error('Failed to fetch audit logs from db-exporter:', response.status, response.statusText)
    }

    const data = await response.json()
    const accessLogs = data.logs || []

    // Map Access Logs (Traefik) to Dashboard Audit Log format
    const logs = accessLogs.map((log: any) => {
        // Resolve client name
        // log-exporter stores "client_name" from X-Client-Name header
        const rawClientId = log.client_name || 'unknown'

        // Convert timestamp (ms) to ISO string
        const date = new Date(log.timestamp)

        return {
            timestamp: date.toISOString(),
            client: rawClientId,
            operation: log.operation === 'other' ? 'API Request' : log.operation, // 'create', 'read', etc.
            status: log.is_error ? 'Error' : 'Success',
            method: log.method,
            description: `${log.method} ${log.endpoint} -> ${log.status}`, // Descriptive text
            rawStatus: log.status
        }
    })

    return NextResponse.json({ logs })
  } catch (error) {
    console.error('Audit Log Error:', error)
    return NextResponse.json({ logs: [] })
  }
}
