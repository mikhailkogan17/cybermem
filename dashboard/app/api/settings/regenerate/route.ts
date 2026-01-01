
import crypto from 'crypto'
import fs from 'fs'
import { NextResponse } from 'next/server'
import path from 'path'

export const dynamic = 'force-dynamic'

const CONFIG_PATH = '/data/config.json'

export async function POST() {
  try {
    // Generate new key
    const randomPart = crypto.randomBytes(16).toString('hex')
    const newKey = `sk-${randomPart}`

    // Write to shared volume
    const config = {
      api_key: newKey,
      updated_at: new Date().toISOString()
    }

    // Ensure directory exists
    const dir = path.dirname(CONFIG_PATH)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }

    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2))

    console.log(`[Dashboard] Regenerated API Key: ${newKey}`)

    return NextResponse.json({
      success: true,
      apiKey: newKey
    })
  } catch (error) {
    console.error('[Dashboard] Failed to regenerate key:', error)
    return NextResponse.json({ error: 'Failed to regenerate key' }, { status: 500 })
  }
}
