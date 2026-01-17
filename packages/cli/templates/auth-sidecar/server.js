/**
 * CyberMem Auth Sidecar
 *
 * Simple ForwardAuth service for Traefik that validates:
 * 1. JWT tokens from OAuth (Bearer token)
 * 2. API keys (X-API-Key header) - deprecated fallback
 * 3. Local requests (localhost bypass)
 */

const http = require("http");
const fs = require("fs");
const crypto = require("crypto");

// Config from environment
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || "cybermem-dev-secret";
const API_KEY_FILE = process.env.API_KEY_FILE || "/.env";

// Load API key from file
function loadApiKey() {
  try {
    const content = fs.readFileSync(API_KEY_FILE, "utf-8");
    const match = content.match(/OM_API_KEY=(.+)/);
    return match ? match[1].trim() : null;
  } catch {
    return null;
  }
}

// Simple JWT validation (HS256 only)
function validateJwt(token) {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const [headerB64, payloadB64, signatureB64] = parts;

    // Verify signature
    const data = `${headerB64}.${payloadB64}`;
    const signature = crypto
      .createHmac("sha256", JWT_SECRET)
      .update(data)
      .digest("base64url");

    if (signature !== signatureB64) {
      console.log("JWT signature mismatch");
      return null;
    }

    // Decode payload
    const payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString());

    // Check expiration
    if (payload.exp && payload.exp < Date.now() / 1000) {
      console.log("JWT expired");
      return null;
    }

    return payload;
  } catch (err) {
    console.log("JWT validation error:", err.message);
    return null;
  }
}

// Check if request is from localhost
function isLocalRequest(req) {
  const forwarded = req.headers["x-forwarded-for"];
  const realIp = req.headers["x-real-ip"];
  const ip = forwarded?.split(",")[0] || realIp || req.socket.remoteAddress;

  return ip === "127.0.0.1" || ip === "::1" || ip === "localhost";
}

// ForwardAuth handler
const server = http.createServer((req, res) => {
  // Health check
  if (req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok" }));
    return;
  }

  // ForwardAuth endpoint
  const authHeader = req.headers["authorization"];
  const apiKeyHeader = req.headers["x-api-key"];

  // 1. Check JWT (Authorization: Bearer <token>)
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.substring(7);
    const payload = validateJwt(token);

    if (payload) {
      console.log(`Auth OK: JWT (${payload.email || payload.sub})`);
      res.writeHead(200, {
        "X-User-Id": payload.sub || "",
        "X-User-Email": payload.email || "",
        "X-User-Name": payload.name || "",
        "X-Auth-Method": "jwt",
      });
      res.end();
      return;
    }
  }

  // 2. Check API Key (X-API-Key header) - deprecated
  const expectedKey = loadApiKey();
  if (apiKeyHeader && expectedKey && apiKeyHeader === expectedKey) {
    console.log("Auth OK: API Key (deprecated)");
    res.writeHead(200, {
      "X-Auth-Method": "api-key",
      "X-Auth-Deprecated": "true",
    });
    res.end();
    return;
  }

  // 3. Local bypass (development)
  if (isLocalRequest(req)) {
    console.log("Auth OK: Local bypass");
    res.writeHead(200, {
      "X-Auth-Method": "local",
    });
    res.end();
    return;
  }

  // 4. Unauthorized
  console.log("Auth FAILED: No valid credentials");
  res.writeHead(401, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "Unauthorized" }));
});

server.listen(PORT, () => {
  console.log(`Auth sidecar listening on port ${PORT}`);
});
