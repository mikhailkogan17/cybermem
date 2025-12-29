
import { getAllClients } from '@/lib/client-metadata'
import { NextResponse } from 'next/server'

export async function GET() {
  const clients = getAllClients()
  return NextResponse.json(clients)
}
