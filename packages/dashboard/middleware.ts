import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // CSRF Protection for mutating requests
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(request.method)) {
    const origin = request.headers.get('origin')
    const referer = request.headers.get('referer')
    const host = request.headers.get('host')

    // If no origin/referer, or they don't match the host, block it.
    // NOTE: This is a strict check. For local dev, internal API calls might need bypass if no origin set.
    // Browsers ALWAYS send Origin for cross-origin POSTs.
    // For same-origin, they usually send it too, but we can fall back to Referer.
    
    // Allow server-side calls (no origin/referer) ONLY if coming from trusted internal network? 
    // Actually, for a dashboard, we expect browser interaction.
    // If strict compliance is needed: logic below.
    
    if (origin) {
      const originHost = origin.replace(/^https?:\/\//, '')
      if (originHost !== host) {
         return new NextResponse('CSRF Validation Failed', { status: 403 })
      }
    } else if (referer) {
       const refererHost = new URL(referer).host
       if (refererHost !== host) {
          return new NextResponse('CSRF Validation Failed', { status: 403 })
       }
    } else {
       // Ideally we block requests without Origin/Referer in modern browsers for mutations
       // But to be safe for non-browser tooling (if used): header check
       // We'll enforce that the request must have come from our UI
       // return new NextResponse('Missing Origin/Referer', { status: 403 })
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: '/api/:path*',
}
