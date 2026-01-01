
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const endpoint = process.env.OPENMEMORY_URL || 'http://openmemory:8080'
    const apiKey = process.env.OM_API_KEY || ''

    // We need to pass the API Key if openmemory requires it.
    // However, restart endpoint might be protected.
    // But wait, the Dashboard process might not have the "latest" key if it was just regenerated in /data/config.json but not reloaded in process.env?
    // But I updated api/settings/route.ts to read from file.
    // Here I should also read from file?
    // Actually, openmemory auth middleware checks key.
    // I need to send the correct key.

    // Let's rely on reading key from file too.
    let currentKey = apiKey
    try {
        const fs = require('fs')
        if (fs.existsSync('/data/config.json')) {
             const conf = JSON.parse(fs.readFileSync('/data/config.json', 'utf-8'))
             if (conf.api_key) currentKey = conf.api_key
        }
    } catch(e) {}

    const res = await fetch(`${endpoint}/api/system/restart`, {
      method: 'POST',
      headers: {
        'x-api-key': currentKey,
        'Content-Type': 'application/json'
      }
    })

    if (!res.ok) {
        return NextResponse.json({ error: 'Failed to trigger restart' }, { status: res.status })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Dashboard] Failed to restart server:', error)
    return NextResponse.json({ error: 'Failed to restart server' }, { status: 500 })
  }
}
