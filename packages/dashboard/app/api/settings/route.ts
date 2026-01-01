import fs from 'fs'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const CONFIG_PATH = '/data/config.json'

export async function GET() {
  let apiKey = process.env.OM_API_KEY || 'not-set'

  try {
     if (fs.existsSync(CONFIG_PATH)) {
        const raw = fs.readFileSync(CONFIG_PATH, 'utf-8')
        const conf = JSON.parse(raw)
        if (conf.api_key) apiKey = conf.api_key
     }
  } catch (e) {
      // ignore
  }

  return NextResponse.json({
    apiKey: apiKey,
    endpoint: process.env.CYBERMEM_URL || 'http://localhost:8080'
  })
}
