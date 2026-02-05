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

  // 1. LOCAL BYPASS: Skip auth for local development and trusted networks
  const authMethod = request.headers.get("x-auth-method");
  const userId = request.headers.get("x-user-id");

  const isLocal =
    host.includes("localhost") ||
    host.includes("127.0.0.1") ||
    host.includes("raspberrypi.local") ||
    host.startsWith("10.") ||
    authMethod === "local" ||
    userId === "local";

  if (isLocal) {
    const responseHeaders = new Headers(request.headers);
    responseHeaders.set("X-User-Id", "local");
    return NextResponse.next({
      request: {
        headers: responseHeaders,
      },
    });
  }

  if (!isLocal) {
    // REMOTE: Check cookie token
    const token = request.cookies.get("cybermem_token")?.value;

    // We do NOT redirect here anymore to avoid 307 loops and respect Law #6.
    // Unauthorized requests will simply not have the X-User-Id header,
    // and the UI (app/page.tsx) will render the LoginModal with a 200 OK.
    if (
      !token &&
      !userId &&
      !request.nextUrl.pathname.startsWith("/api/auth")
    ) {
      console.log("MiddleWare: No token/userId found for remote request");
    }
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
