import { auth } from "@/auth";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/**
 * Dashboard Middleware
 *
 * 1. LOCAL BYPASS: localhost and 127.0.0.1 skip auth
 * 2. REMOTE: Require GitHub OAuth
 * 3. CSRF Protection for mutations
 */
export async function middleware(request: NextRequest) {
  const host = request.headers.get("host") || "";

  // LOCAL BYPASS: Skip auth for localhost (development)
  const isLocal = host.includes("localhost") || host.includes("127.0.0.1");

  if (!isLocal) {
    // REMOTE: Check GitHub OAuth session
    const session = await auth();

    if (!session?.user) {
      const signInUrl = new URL("/auth/signin", request.url);
      signInUrl.searchParams.set("callbackUrl", request.nextUrl.pathname);
      return NextResponse.redirect(signInUrl);
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
    "/((?!api/auth|api/health|_next|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
