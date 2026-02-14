import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit";
import fs from "fs";
import { NextRequest, NextResponse } from "next/server";
import os from "os";
import path from "path";

export const dynamic = "force-dynamic";

const CONFIG_PATH = "/data/config.json";

// Detect the correct MCP endpoint based on request host and environment
function getMcpEndpoint(request: NextRequest): {
  endpoint: string;
  isLocal: boolean;
} {
  const host = request.headers.get("host") || "localhost:8626";
  const hostname = host.split(":")[0];
  const port = host.split(":")[1] || "";
  const env = process.env.CYBERMEM_ENV || "prod";
  const isStaging = env === "staging";
  const isTailscale =
    process.env.CYBERMEM_TAILSCALE === "true" || host.includes(".ts.net");

  // Priority 1: Explicit public override
  if (process.env.CYBERMEM_PUBLIC_URL) {
    const url = process.env.CYBERMEM_PUBLIC_URL;
    return {
      endpoint: url.endsWith("/mcp") ? url : `${url.replace(/\/$/, "")}/mcp`,
      isLocal: false,
    };
  }

  // Priority 2: Tailscale / Funnel (Port-Based)
  if (isTailscale) {
    const protocol = request.headers.get("x-forwarded-proto") || "https";
    const displayPort = isStaging ? "8443" : "443";
    // If port is already in the host, it will be used. Hostname is enough.
    return {
      endpoint: `${protocol}://${hostname}${port ? ":" + port : displayPort === "443" ? "" : ":" + displayPort}/mcp`,
      isLocal: false,
    };
  }

  // Priority 3: Localhost / LAN
  if (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname.endsWith(".local")
  ) {
    // Port detection priority: Host header > X-Forwarded-Port > TRAEFIK_PORT env > env-based default
    const forwardedPort = request.headers.get("x-forwarded-port") || "";
    const traefikPort = process.env.TRAEFIK_PORT || "";
    const effectivePort = port || forwardedPort || traefikPort;

    const isStandardPort =
      effectivePort === "8625" ||
      effectivePort === "8626" ||
      effectivePort === "8627";
    // If accessed via non-standard port (k3d 8081), suggest placeholder
    const isLoopback = hostname === "localhost" || hostname === "127.0.0.1";
    const isRemote = !isStandardPort && isLoopback;

    const displayHost = isRemote ? "YOUR_VPS_IP" : hostname;
    // Use detected port if standard, otherwise fall back to env-based default
    const displayPort = isStandardPort
      ? effectivePort
      : isStaging
        ? "8625"
        : "8626";

    return {
      endpoint: `http://${displayHost}:${displayPort}/mcp`,
      isLocal: isLoopback && !isRemote,
    };
  }

  // Fallback
  const protocol = request.headers.get("x-forwarded-proto") || "http";
  const displayPort = port || (isStaging ? "8625" : "8626");
  return {
    endpoint: `${protocol}://${hostname}:${displayPort}/mcp`,
    isLocal: false,
  };
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
  let tokenSource = "env";

  // Try to read from HttpOnly cookie first
  const cookieKey = request.cookies.get("cybermem_api_key")?.value;
  if (cookieKey) {
    apiKey = cookieKey;
    tokenSource = "cookie";
  }

  // Fallback to config file
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const raw = fs.readFileSync(CONFIG_PATH, "utf-8");
      const conf = JSON.parse(raw);
      if (conf.api_key && apiKey === "not-set") {
        apiKey = conf.api_key;
        tokenSource = "config";
      }
    }
  } catch (e) {
    // ignore
  }

  // Priority: Docker Secrets (Standard production way)
  try {
    const secretPath = "/run/secrets/om_api_key";
    if (fs.existsSync(secretPath)) {
      const secret = fs.readFileSync(secretPath, "utf-8").trim();
      if (secret) {
        if (secret.startsWith("sk-")) {
          apiKey = secret;
          tokenSource = "docker-secret";
        } else {
          // Fallback: support env-file format like "OM_API_KEY=sk-..."
          const envMatch = secret.match(
            /OM_API_KEY=["']?(sk-[a-zA-Z0-9]+)["']?/,
          );
          if (envMatch) {
            apiKey = envMatch[1];
            tokenSource = "docker-secret-env";
          } else {
            console.warn(
              `[Settings API] Token at ${secretPath} doesn't match expected format (sk-* or OM_API_KEY=sk-*)`,
            );
          }
        }
      }
    }
  } catch (e) {
    // ignore
  }

  // Fallback: Auto-generated token location
  try {
    const fallbackPath = "/data/.cybermem_token";
    if (apiKey === "not-set" && fs.existsSync(fallbackPath)) {
      const token = fs.readFileSync(fallbackPath, "utf-8").trim();
      if (token) {
        if (token.startsWith("sk-")) {
          apiKey = token;
          tokenSource = "fallback";
        } else {
          console.warn(
            `[Settings API] Token at ${fallbackPath} doesn't match expected format (sk-*)`,
          );
        }
      }
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

  // Mask the token for public display
  const maskToken = (token: string) => {
    if (!token || token === "not-set") return token;
    if (token.length <= 10) return "****";
    // sk-abcd...efgh
    return `${token.slice(0, 7)}...${token.slice(-4)}`;
  };

  const maskedApiKey = maskToken(apiKey);

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

  // Environment detection SSoT: Trust environment variables set during stack start
  const env = process.env.CYBERMEM_ENV || "prod";
  const instance = process.env.CYBERMEM_INSTANCE || "local";

  return NextResponse.json(
    {
      apiKey: apiKey,
      apiKeyMasked: maskedApiKey,
      tokenSource: apiKey === "not-set" ? "not-set" : tokenSource,
      endpoint,
      isManaged,
      isLocal,
      instanceType,
      env: env,
      instance: instance,
      tailscale: process.env.CYBERMEM_TAILSCALE === "true",
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
