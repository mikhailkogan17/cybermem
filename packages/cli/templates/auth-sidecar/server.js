/**
 * CyberMem Auth Sidecar
 *
 * ForwardAuth service for Traefik that validates:
 * 1. JWT tokens (RS256) with embedded public key
 * 2. API keys (X-API-Key header) - deprecated fallback
 * 3. Local requests (localhost bypass)
 *
 * NO SECRETS REQUIRED - public key is embedded.
 */

const http = require("http");
const fs = require("fs");
const crypto = require("crypto");

const PORT = process.env.PORT || 3001;
const API_KEY_FILE = process.env.API_KEY_FILE || "/.env";

// RSA Public Key for JWT verification (embedded - no secrets!)
const PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAkrWPslHt+dcX/lckX4mw
AaI4koCqn7NqEkTtuyJuzFv969Da0ghhWdTIRR6H8pYfsTtqtX2UAZox8i5IJ9t9
JS8nBfbL2fFiuEz51LMNKMSLw7j2dJT/g5iIdT64LyJZ/9+kLMXC
EBWPIyEvx4GMzKSf2L+jNaUY/0J8n/JNAbKtIplKtfOU/tNWuoZfcj3SnoxrmApN
Xw+LsE26EM2Gq7MKLQf3r3GUIm2dBgs7XUNJRiezrPgFzekiaiDyFsNhhk1jkx2I
ljQgSslGQ4dODE73KB07b0Qi7zPWAtGlCyDQD5RLICzht1mMENta7x+TlPJfDv8g
XeEmW5ihAgMBAAE=
-----END PUBLIC KEY-----`;

// Load API key from file (deprecated fallback)
function loadApiKey() {
  try {
    const content = fs.readFileSync(API_KEY_FILE, "utf-8");
    const match = content.match(/OM_API_KEY=(.+)/);
    return match ? match[1].trim() : null;
  } catch {
    return null;
  }
}

// RS256 JWT validation
function validateJwt(token) {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const [headerB64, payloadB64, signatureB64] = parts;

    // Decode header to check algorithm
    const header = JSON.parse(Buffer.from(headerB64, "base64url").toString());
    if (header.alg !== "RS256") {
      console.log("JWT: unsupported algorithm", header.alg);
      return null;
    }

    // Verify RS256 signature
    const data = `${headerB64}.${payloadB64}`;
    const signature = Buffer.from(signatureB64, "base64url");

    const verify = crypto.createVerify("RSA-SHA256");
    verify.update(data);

    if (!verify.verify(PUBLIC_KEY, signature)) {
      console.log("JWT: signature verification failed");
      return null;
    }

    // Decode payload
    const payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString());

    // Check expiration
    if (payload.exp && payload.exp < Date.now() / 1000) {
      console.log("JWT: token expired");
      return null;
    }

    // Check issuer
    if (payload.iss !== "cybermem.dev") {
      console.log("JWT: invalid issuer", payload.iss);
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

  const authHeader = req.headers["authorization"];
  const apiKeyHeader = req.headers["x-api-key"];

  // 1. Check Bearer token (JWT or API Key)
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.substring(7);

    // 1a. Check if Bearer token is actually an API key (MCP clients like Claude Desktop)
    const expectedKey = loadApiKey();
    if (expectedKey && token === expectedKey) {
      console.log("Auth OK: Bearer API Key");
      res.writeHead(200, {
        "X-Auth-Method": "bearer-api-key",
      });
      res.end();
      return;
    }

    // 1b. Try JWT RS256 validation
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

  // 2. Check API Key (deprecated fallback)
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
  console.log(`Auth sidecar (RS256) listening on port ${PORT}`);
});
