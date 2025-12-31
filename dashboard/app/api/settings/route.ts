import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  return NextResponse.json({
    apiKey: process.env.OM_API_KEY || 'not-set',
    endpoint: process.env.OPENMEMORY_URL || 'http://localhost:8080'
  })
}
