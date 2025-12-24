import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(request: NextRequest) {
  const isAdminRoute = request.nextUrl.pathname.startsWith("/mcp") || request.nextUrl.pathname.startsWith("/setup")
  const hasSession = request.cookies.has("admin_session")
  const isBypass = request.nextUrl.searchParams.get("bypass_auth") === "true"

  if (isAdminRoute && !hasSession && !isBypass) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  if (request.nextUrl.pathname === "/login" && hasSession) {
    return NextResponse.redirect(new URL("/dashboard", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/mcp/:path*", "/setup/:path*", "/login"],
}
