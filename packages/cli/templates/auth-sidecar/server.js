/**
 * CyberMem Auth Sidecar
 *
 * ForwardAuth service for Traefik that validates:
 * 1. Bearer tokens (sk-xxx) against Docker Secret file (SSoT)
 * 2. Local requests bypass (localhost, *.local domains)
 *
 * NO EXTERNAL DEPENDENCIES - uses built-in crypto and fs.
 */

const http = require("http");
const crypto = require("crypto");
const path = require("path");
const fs = require("fs");
const SECRET_PATH = process.env.API_KEY_FILE || "/run/secrets/om_api_key";
let cachedToken = null;

const PORT = process.env.PORT || 3001;

// Load token from secret file once at startup (SSoT)
function loadSecret() {
  try {
    // 1. Check environment variable first (Direct)
    if (process.env.OM_API_KEY) {
      cachedToken = process.env.OM_API_KEY.trim();
      console.log("SSoT Token loaded from OM_API_KEY env");
      return;
    }

    // 2. Check secret/env file (Mapped)
    if (fs.existsSync(SECRET_PATH)) {
      const content = fs.readFileSync(SECRET_PATH, "utf8").trim();

      // Check if it's a shell-formatted env file (OM_API_KEY=sk-...)
      const envMatch = content.match(/OM_API_KEY=["']?(sk-[a-zA-Z0-9]+)["']?/);
      if (envMatch) {
        cachedToken = envMatch[1];
        console.log(`SSoT Token extracted from env file: ${SECRET_PATH}`);
      } else {
        // Assume raw token file
        cachedToken = content;
        console.log(`SSoT Token loaded from raw file: ${SECRET_PATH}`);
      }
    } else {
      console.warn(
        `SECRET WARNING: ${SECRET_PATH} not found. Remote auth will fail.`,
      );
    }
  } catch (err) {
    console.error("SECRET LOAD ERROR:", err.message);
  }
}

loadSecret();

// Verify token against SSoT (file-based)
async function verifyToken(token) {
  if (!cachedToken) {
    // Try one more time if not loaded (e.g. race condition/debug)
    loadSecret();
  }

  if (cachedToken && token === cachedToken) {
    return { userId: "admin", name: "SSoT-Admin" };
  }

  return null;
}

// Check if request is from localhost or local network
function isLocalRequest(req) {
  const forwarded = req.headers["x-forwarded-for"];
  const realIp = req.headers["x-real-ip"];
  const host = req.headers["x-forwarded-host"] || req.headers["host"] || "";
  const ip =
    forwarded?.split(",")[0]?.trim() || realIp || req.socket.remoteAddress;

  // 1. First reject Tailscale/Remote requests (.ts.net, 100.x.x.x)
  // CRITICAL: Tailscale requests (via Funnel) must NEVER be treated as local.
  // If host contains .ts.net, it's external.
  // NOTE: Legacy CYBERMEM_TAILSCALE env-flag logic was removed on purpose.
  //       We now auto-detect Tailscale by host/IP (".ts.net" / "100.x.x.x"),
  //       so .local bypass works regardless of CYBERMEM_TAILSCALE being set.
  if (host.includes(".ts.net") || (typeof ip === "string" && ip.startsWith("100."))) {
    return false;
  }

  // 2. Allow .local (mDNS) bypass for RPi LAN access
  const hostname = host.split(":")[0];
  if (hostname.endsWith(".local")) {
    return true;
  }

  // Host-based check REMOVED for security (CVE-2026-001)
  // We only trust loopback IP if not on Tailscale.

  // Allow localhost bypass ONLY for local Dev environment (Docker Desktop)
  const isDev = process.env.CYBERMEM_INSTANCE === "local";
  if (isDev && (host.startsWith("localhost") || host.startsWith("127.0.0.1"))) {
    return true;
  }

  const isLocalIp =
    ip === "127.0.0.1" ||
    ip === "::1" ||
    ip === "::ffff:127.0.0.1" ||
    ip === "localhost";

  return isLocalIp;
}

// ForwardAuth handler
const server = http.createServer(async (req, res) => {
  // Health check
  if (req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok", mode: "token-auth" }));
    return;
  }

  const authHeader = req.headers["authorization"];
  const apiKeyHeader = req.headers["x-api-key"];

  // 1. Resolve URI
  const requestUri = req.headers["x-forwarded-uri"] || req.url || "/";
  console.log(`[Auth-Sidecar] Processing ${req.method} ${requestUri}`);

  // 2. Public Paths Bypass
  // We allow Dashboard roots, login paths and essential assets to bypass SSoT token check
  // The Dashboard itself handles its own session auth.
  const prefixPublicPaths = [
    "/auth",
    "/api/auth",
    "/api/health",
    // "/api/metrics", // LEAK FIXED
    // "/api/stats",   // LEAK FIXED
    "/api/settings",
    "/_next",
    "/favicon",
    "/static",
    "/public",
    "/health",
    "/login",
    // "/metrics",     // LEAK FIXED
    "/clients.json",
  ];

  const exactPublicPaths = [
    "/",
    "/cybermem",
    "/cybermem-staging",
    "/cybermem/",
    "/cybermem-staging/",
  ];

  const isPublic =
    exactPublicPaths.includes(requestUri) ||
    prefixPublicPaths.some((p) => requestUri.startsWith(p));

  if (isPublic) {
    console.log(`[Auth-Sidecar] ✅ Public bypass: ${requestUri}`);
    res.writeHead(200, { "X-Auth-Method": "public" });
    res.end();
    return;
  }

  // 3. Local bypass
  const isK3d = process.env.CYBERMEM_INSTANCE === "k3d";
  if (!isK3d && isLocalRequest(req)) {
    console.log(`[Auth-Sidecar] ✅ Local bypass: ${requestUri}`);
    res.writeHead(200, {
      "X-Auth-Method": "local",
      "X-User-Id": "local",
    });
    res.end();
    return;
  }

  // 4. Token Auth Verification Helper
  const verifyRequestToken = async (received) => {
    if (!received) return null;
    const result = await verifyToken(received);
    if (!result) {
      console.log(
        `[Auth-Sidecar] DEBUG Mismatch: received [${received.substring(0, 5)}...] (len:${received.length}) vs cached [${cachedToken?.substring(0, 5)}...] (len:${cachedToken?.length})`,
      );
    }
    return result;
  };

  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.substring(7);
    const result = await verifyRequestToken(token);
    if (result) {
      console.log(
        `[Auth-Sidecar] ✅ Auth OK (Bearer): ${result.name || result.userId}`,
      );
      res.writeHead(200, {
        "X-User-Id": result.userId,
        "X-Auth-Method": "token",
        "X-Token-Name": result.name || "",
      });
      res.end();
      return;
    }
  }

  if (apiKeyHeader?.startsWith("sk-")) {
    const result = await verifyRequestToken(apiKeyHeader);
    if (result) {
      console.log(
        `[Auth-Sidecar] ✅ Auth OK (X-API-Key): ${result.name || result.userId}`,
      );
      res.writeHead(200, {
        "X-User-Id": result.userId,
        "X-Auth-Method": "api-key",
        "X-Token-Name": result.name || "",
      });
      res.end();
      return;
    }
  }

  // 5. Unauthorized
  console.log(`[Auth-Sidecar] ❌ Auth FAILED: ${requestUri}`);
  res.writeHead(401, { "Content-Type": "application/json" });
  res.end(
    JSON.stringify({
      error: "Unauthorized",
      message:
        "Valid access token required. Get your token from Dashboard Settings.",
    }),
  );
});

server.listen(PORT, () => {
  console.log(`Auth sidecar (token-auth) listening on port ${PORT}`);
});
