import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit'
import crypto from 'crypto'
import fs from 'fs'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  // Rate limiting check
  const rateLimit = checkRateLimit(req);
  if (!rateLimit.allowed) {
    return rateLimitResponse(rateLimit.resetIn);
  }

  try {
    const apiKey = `sk-${crypto.randomBytes(16).toString('hex')}`
    const sharedEnvPath = '/app/shared.env'
    const configPath = '/data/config.json'

    // Write OM_API_KEY=... to shared file mounted at /.env in OpenMemory
    fs.writeFileSync(sharedEnvPath, `OM_API_KEY=${apiKey}\n`)

    // Also persist to config.json
    let config: Record<string, any> = {}
    try {
      if (fs.existsSync(configPath)) {
        config = JSON.parse(fs.readFileSync(configPath, 'utf-8'))
      }
    } catch {}
    config.api_key = apiKey
    fs.mkdirSync('/data', { recursive: true })
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2))

    // Create response with HttpOnly cookie
    const response = NextResponse.json({ success: true, apiKey })
    response.cookies.set('cybermem_api_key', apiKey, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 60 * 60 * 24 * 365 // 1 year
    })

    return response
  } catch (error) {
    console.error('[Settings] Failed to regenerate API Key:', error)
    return NextResponse.json({ error: 'Failed to regenerate API Key' }, { status: 500 })
  }
}
