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

function generateLogs(count: number) {
  const logs = []
  const now = Date.now()

  for (let i = 0; i < count; i++) {
    const client = CLIENTS[Math.floor(Math.random() * CLIENTS.length)]
    const operation = OPERATIONS[Math.floor(Math.random() * OPERATIONS.length)]
    const status = STATUSES[Math.floor(Math.random() * STATUSES.length)]
    const descriptionList = DESCRIPTIONS[status as keyof typeof DESCRIPTIONS]
    const description = descriptionList[Math.floor(Math.random() * descriptionList.length)]

    // Random time within last 24 hours
    const timestamp = now - Math.floor(Math.random() * 24 * 60 * 60 * 1000)

    logs.push({
      timestamp,
      client,
      operation,
      status: status === "Success" ? "200" : status === "Warning" ? "300" : "500", // Mapping to status codes as expected by frontend
      method: operation === "Read" ? "GET" : operation === "Delete" ? "DELETE" : "POST"
    })
  }

  return logs.sort((a, b) => b.timestamp - a.timestamp)
}

export async function GET(request: Request) {
  const logs = generateLogs(50)
  return NextResponse.json({ logs })
}
