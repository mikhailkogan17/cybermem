import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// MARKETING MOCK DATA
export async function GET(request: Request) {
  const logs = [
    {
      timestamp: new Date().toISOString(),
      client: "Claude Desktop",
      operation: "Write",
      status: "Success",
      method: "POST",
      description: "Added new memory: 'User prefers dark mode'",
      rawStatus: "200"
    },
    {
      timestamp: new Date(Date.now() - 1000 * 60).toISOString(),
      client: "Cursor",
      operation: "Read",
      status: "Success",
      method: "POST",
      description: "Queried context",
      rawStatus: "200"
    },
    {
      timestamp: new Date(Date.now() - 1000 * 120).toISOString(),
      client: "Windsurf",
      operation: "Update",
      status: "Success",
      method: "POST",
      description: "Updated memory context",
      rawStatus: "200"
    },
    {
      timestamp: new Date(Date.now() - 1000 * 300).toISOString(),
      client: "Warp",
      operation: "Read",
      status: "Warning",
      method: "GET",
      description: "High latency detected",
      rawStatus: "429"
    },
    {
      timestamp: new Date(Date.now() - 1000 * 600).toISOString(),
      client: "Claude Desktop",
      operation: "Create",
      status: "Success",
      method: "POST",
      description: "Stored conversation summary",
      rawStatus: "201"
    },
    {
       timestamp: new Date(Date.now() - 1000 * 900).toISOString(),
       client: "VSCode",
       operation: "Delete",
       status: "Error",
       method: "DELETE",
       description: "Unauthorized memory access",
       rawStatus: "403"
    }
  ]
  return NextResponse.json({ logs })
}
