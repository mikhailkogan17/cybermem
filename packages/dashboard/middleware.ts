import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/**
 * Dashboard Middleware
 *
 * 1. LOCAL BYPASS: localhost, 127.0.0.1, raspberrypi.local skip auth
 * 2. REMOTE: Check cybermem_token cookie
 * 3. CSRF Protection for mutations
 */
export async function middleware(request: NextRequest) {
  const host = request.headers.get("host") || "";

  // LOCAL BYPASS: Skip auth for local development and trusted networks
  const isLocal =
    host.includes("localhost") ||
    host.includes("127.0.0.1") ||
    host.includes("raspberrypi.local");

  if (!isLocal) {
    // REMOTE: Check cookie token
    const token = request.cookies.get("cybermem_token")?.value;

    if (!token) {
      // Redirect to token auth page with error
      const authUrl = new URL("/api/auth/token", request.url);
      authUrl.searchParams.set("error", "no_token");
      return NextResponse.redirect(authUrl);
    }

    // Note: Full token verification happens in the token endpoint
    // Cookie existence is enough for middleware (token was validated when set)
  }

  // CSRF Protection for mutating requests
  if (["POST", "PUT", "DELETE", "PATCH"].includes(request.method)) {
    const origin = request.headers.get("origin");
    const referer = request.headers.get("referer");

    if (origin) {
      const originHost = origin.replace(/^https?:\/\//, "");
      if (originHost !== host) {
        return new NextResponse("CSRF Validation Failed", { status: 403 });
      }
    } else if (referer) {
      const refererHost = new URL(referer).host;
      if (refererHost !== host) {
        return new NextResponse("CSRF Validation Failed", { status: 403 });
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Match all routes except:
    // - API auth routes
    // - Next.js internals
    // - Static files
    // - Health check (for monitoring)
    "/((?!api/auth|api/health|api/environment|_next|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
