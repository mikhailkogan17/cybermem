import crypto from 'crypto'
import fs from 'fs'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const apiKey = `sk-${crypto.randomBytes(16).toString('hex')}`
    const sharedEnvPath = '/app/shared.env'

    // Write OM_API_KEY=... to shared file mounted at /.env in OpenMemory
    fs.writeFileSync(sharedEnvPath, `OM_API_KEY=${apiKey}\n`)

    return NextResponse.json({ success: true, apiKey })
  } catch (error) {
    console.error('[Settings] Failed to regenerate API Key:', error)
    return NextResponse.json({ error: 'Failed to regenerate API Key' }, { status: 500 })
  }
}
