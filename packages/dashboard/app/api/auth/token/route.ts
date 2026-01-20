/**
 * Token Authentication Endpoint
 *
 * Validates JWT token and sets cookie for browser sessions.
 * Called by: cybermem-cli dashboard (opens browser with ?token=xxx)
 */

import { verifyToken } from "@/lib/auth";
import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  const error = req.nextUrl.searchParams.get("error");

  // Check for error redirect
  if (error) {
    return new Response(
      `<!DOCTYPE html>
      <html>
      <head><title>Auth Error</title></head>
      <body style="background:#0a0a0a;color:#fff;font-family:system-ui;display:flex;justify-content:center;align-items:center;height:100vh;margin:0">
        <div style="text-align:center">
          <h1 style="color:#ef4444">Authentication Required</h1>
          <p style="color:#888">Run: <code style="background:#222;padding:4px 8px;border-radius:4px">npx @cybermem/cli dashboard</code></p>
        </div>
      </body>
      </html>`,
      { status: 401, headers: { "Content-Type": "text/html" } },
    );
  }

  if (!token) {
    return new Response(JSON.stringify({ error: "No token provided" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Validate JWT
  const payload = await verifyToken(token);

  if (!payload) {
    return new Response(JSON.stringify({ error: "Invalid token" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Set cookie and redirect to dashboard home
  const response = new Response(null, {
    status: 302,
    headers: {
      Location: "/",
      "Set-Cookie": `cybermem_token=${token}; HttpOnly; Path=/; Max-Age=${30 * 24 * 60 * 60}; SameSite=Lax`,
    },
  });

  return response;
}
