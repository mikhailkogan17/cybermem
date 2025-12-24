import { cookies } from "next/headers"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  const body = await request.json()
  const { password } = body

  // In a real app, use a more secure check.
  // For this MVP, we check against the env var.
  console.log("Auth attempt:", { received: password, expected: process.env.ADMIN_PASSWORD })
  if (password === process.env.ADMIN_PASSWORD) {
    const response = NextResponse.json({ success: true })
    response.cookies.set("admin_session", "true", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7, // 1 week
      path: "/",
    })
    return response
  }

  return NextResponse.json({ success: false }, { status: 401 })
}

export async function DELETE() {
  const response = NextResponse.json({ success: true })
  response.cookies.delete("admin_session")
  return response
}
