import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import fs from "fs";
import { NextRequest, NextResponse } from "next/server";
import os from "os";
import path from "path";

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

// Detect hardware type
function getInstanceType(): "local" | "rpi" | "vps" {
  // Explicit override
  if (process.env.CYBERMEM_INSTANCE) {
    const val = process.env.CYBERMEM_INSTANCE.toLowerCase();
    if (val === "rpi") return "rpi";
    if (val === "vps") return "vps";
    return "local";
  }

  const hostname = os.hostname().toLowerCase();
  const arch = process.arch;

  // RPi detection: hostname has 'raspberry' OR it's arm/arm64 on linux
  if (
    hostname.includes("raspberry") ||
    (process.platform === "linux" && (arch === "arm" || arch === "arm64"))
  ) {
    return "rpi";
  }

  // Cloud/VPS detection (heuristic)
  if (process.env.VERCEL || process.env.KUBERNETES_SERVICE_HOST) {
    return "vps";
  }

  return "local";
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

  // Detect instance type
  const instanceType = getInstanceType();

  // isManaged = Local Mode (localhost auto-login)
  const isManaged = isLocal;

  // Read version from package.json
  let version = "v0.11.4"; // Default fallback
  try {
    const pkgPath = path.join(process.cwd(), "package.json");
    if (fs.existsSync(pkgPath)) {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
      version = `v${pkg.version}`;
    }
  } catch (e) {
    // ignore
  }

  return NextResponse.json(
    {
      token: apiKey,
      apiKey: apiKey,
      endpoint,
      isManaged,
      isLocal,
      instanceType,
      dashboardVersion: version,
      mcpVersion: version,
    },
    {
      headers: {
        "X-RateLimit-Remaining": String(rateLimit.remaining),
      },
    },
  );
}
