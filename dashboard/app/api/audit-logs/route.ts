import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const CLIENTS = ["Claude Code", "v0", "Cursor", "GitHub Copilot", "Windsurf"]
const OPERATIONS = ["Read", "Write", "Update", "Delete", "Create"]
const STATUSES = ["Success", "Success", "Success", "Warning", "Error"]
const DESCRIPTIONS = {
  "Success": ["Operation completed successfully", "Resource accessed", "Data synchronized"],
  "Warning": ["High latency detected", "Rate limit approaching", "Deprecation warning"],
  "Error": ["Unauthorized access", "Internal server error", "Timeout exceeded", "Validation failed"]
}

export async function GET(request: Request) {
  try {
    // Fetch logs from db-exporter service
    // timeout 2s to not hang
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 2000)

    const res = await fetch('http://db-exporter:8000/api/logs?limit=100', {
      signal: controller.signal,
      cache: 'no-store'
    })
    clearTimeout(timeoutId)

    if (!res.ok) {
        throw new Error(`Failed to fetch logs: ${res.statusText}`)
    }

    const data = await res.json()
    const rawLogs = data.logs || []

    const logs = rawLogs.map((log: any) => {
        const statusCode = parseInt(log.status) || 0
        let status = "Success"
        if (statusCode === 0 || statusCode >= 400) status = "Error"
        else if (statusCode >= 300) status = "Warning"

        // Capitalize operation
        const operation = log.operation.charAt(0).toUpperCase() + log.operation.slice(1)

        return {
            timestamp: log.timestamp,
            client: log.client_name || "Unknown",
            operation: operation,
            status: status,
            method: log.method,
            description: log.endpoint,
            rawStatus: log.status
        }
    })

    return NextResponse.json({ logs })
  } catch (error) {
    console.error("Error fetching audit logs:", error)
    // Return empty list on error to avoid breaking UI with 500
    return NextResponse.json({ logs: [] })
  }
}
