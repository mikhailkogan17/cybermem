import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit'
import fs from 'fs'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const CONFIG_PATH = '/data/config.json'

export async function GET(request: NextRequest) {
  // Rate limiting check
  const rateLimit = checkRateLimit(request);
  if (!rateLimit.allowed) {
    return rateLimitResponse(rateLimit.resetIn);
  }

  let apiKey = process.env.OM_API_KEY || 'not-set'

  // Try to read from HttpOnly cookie first
  const cookieKey = request.cookies.get('cybermem_api_key')?.value
  if (cookieKey) {
    apiKey = cookieKey
  }

  // Fallback to config file
  try {
     if (fs.existsSync(CONFIG_PATH)) {
        const raw = fs.readFileSync(CONFIG_PATH, 'utf-8')
        const conf = JSON.parse(raw)
        if (conf.api_key && apiKey === 'not-set') apiKey = conf.api_key
     }
  } catch (e) {
      // ignore
  }

  // Endpoint resolution:
  // 1. Env var CYBERMEM_URL
  // 2. Default to localhost:8088/memory (Managed Mode)
  const rawEndpoint = process.env.CYBERMEM_URL;
  const endpoint = rawEndpoint || 'http://localhost:8088/memory';
  const isManaged = !rawEndpoint;

  return NextResponse.json({
    apiKey: apiKey,
    endpoint,
    isManaged
  }, {
    headers: {
      'X-RateLimit-Remaining': String(rateLimit.remaining)
    }
  })
}
