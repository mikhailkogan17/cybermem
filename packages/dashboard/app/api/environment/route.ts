import { NextResponse } from "next/server";

/**
 * Environment detection API for dynamic MCP URL configuration
 *
 * Priority:
 * 1. Tailscale hostname (if TAILSCALE_HOSTNAME env var is set)
 * 2. LAN .local domain (if raspberrypi.local or similar)
 * 3. VPS public URL (if CYBERMEM_PUBLIC_URL env var is set)
 * 4. localhost:8626 (fallback)
 */
export async function GET(request: Request) {
  const MCP_PORT = process.env.MCP_PORT || "8626";

  // Check for Tailscale hostname first (highest priority for remote access)
  const tailscaleHostname = process.env.TAILSCALE_HOSTNAME;
  if (tailscaleHostname) {
    return NextResponse.json({
      url: `https://${tailscaleHostname}`,
      type: "tailscale",
      editable: false,
      hint: "Using Tailscale Funnel for secure remote access",
    });
  }

  // Check for VPS public URL
  const publicUrl = process.env.CYBERMEM_PUBLIC_URL;
  if (publicUrl) {
    const formattedUrl = publicUrl.endsWith("/")
      ? publicUrl.slice(0, -1)
      : publicUrl;
    return NextResponse.json({
      url: formattedUrl,
      type: "vps",
      editable: true,
      hint: "Configure CYBERMEM_PUBLIC_URL to change this URL",
    });
  }

  // Detect from request headers (for LAN access)
  const host = request.headers.get("host") || "";

  // Check if accessing via .local domain (Raspberry Pi LAN)
  if (host.includes(".local")) {
    const hostname = host.split(":")[0];
    return NextResponse.json({
      url: `http://${hostname}:${MCP_PORT}`,
      type: "lan",
      editable: false,
      hint: "Detected LAN access via mDNS (.local)",
    });
  }

  // Check if accessing via IP address (likely LAN or VPS)
  const ipMatch = host.match(/^(\d+\.\d+\.\d+\.\d+)/);
  if (ipMatch) {
    const protocol = request.headers.get("x-forwarded-proto") || "http";
    return NextResponse.json({
      url: `${protocol}://${ipMatch[1]}:${MCP_PORT}`,
      type: "ip",
      editable: true,
      hint: "Detected IP-based access",
    });
  }

  // Default to localhost
  return NextResponse.json({
    url: `http://localhost:${MCP_PORT}`,
    type: "local",
    editable: false,
    hint: "Running locally",
  });
}
