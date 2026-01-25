import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import fs from "fs";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const CONFIG_PATH = "/data/config.json";

// Detect the correct MCP endpoint based on request host
function getMcpEndpoint(request: NextRequest): {
  endpoint: string;
  isLocal: boolean;
} {
  const host = request.headers.get("host") || "localhost:3000";
  const hostname = host.split(":")[0];

  // Priority 1: Explicit public override (for VPS/Proxy)
  if (process.env.CYBERMEM_PUBLIC_URL) {
    const url = process.env.CYBERMEM_PUBLIC_URL;
    return {
      endpoint: url.endsWith("/mcp") ? url : `${url.replace(/\/$/, "")}/mcp`,
      isLocal: false,
    };
  }

  // Priority 2: Tailscale domain (from env or detect)
  const tailscaleDomain = process.env.TAILSCALE_DOMAIN;

  // Priority 3: Based on request host
  if (hostname === "localhost" || hostname === "127.0.0.1") {
    // Local development
    return { endpoint: "http://localhost:8626/mcp", isLocal: true };
  }

  if (hostname.endsWith(".local")) {
    // LAN access (raspberrypi.local)
    // If Tailscale domain is available, prefer it for remote config
    if (tailscaleDomain) {
      return {
        endpoint: `https://${tailscaleDomain}/cybermem/mcp`,
        isLocal: false,
        // Also provide LAN endpoint as fallback
      };
    }
    return { endpoint: `http://${hostname}:8626/mcp`, isLocal: true };
  }

  if (hostname.includes(".ts.net")) {
    // Tailscale Funnel access
    return { endpoint: `https://${hostname}/cybermem/mcp`, isLocal: false };
  }

  // Fallback: use request host
  const protocol = request.headers.get("x-forwarded-proto") || "http";
  return { endpoint: `${protocol}://${hostname}:8626/mcp`, isLocal: false };
}

export async function GET(request: NextRequest) {
  // Rate limiting check
  const rateLimit = checkRateLimit(request);
  if (!rateLimit.allowed) {
    return rateLimitResponse(rateLimit.resetIn);
  }

  let apiKey = process.env.OM_API_KEY || "not-set";

  // Try to read from HttpOnly cookie first
  const cookieKey = request.cookies.get("cybermem_api_key")?.value;
  if (cookieKey) {
    apiKey = cookieKey;
  }

  // Fallback to config file
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const raw = fs.readFileSync(CONFIG_PATH, "utf-8");
      const conf = JSON.parse(raw);
      if (conf.api_key && apiKey === "not-set") apiKey = conf.api_key;
    }
  } catch (e) {
    // ignore
  }

  // Get dynamic endpoint based on request host
  const { endpoint, isLocal } = getMcpEndpoint(request);

  // isManaged = Local Mode (localhost auto-login)
  const isManaged = isLocal;

  return NextResponse.json(
    {
      token: apiKey,
      apiKey: apiKey,
      endpoint,
      isManaged,
      isLocal,
      dashboardVersion: "v0.8.0",
      mcpVersion: "v0.8.0",
    },
    {
      headers: {
        "X-RateLimit-Remaining": String(rateLimit.remaining),
      },
    },
  );
}
