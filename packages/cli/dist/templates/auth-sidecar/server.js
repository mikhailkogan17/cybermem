/**
 * CyberMem Auth Sidecar
 *
 * ForwardAuth service for Traefik that validates:
 * 1. Bearer tokens (sk-xxx) against SQLite access_keys table
 * 2. Local requests bypass (localhost, *.local domains)
 *
 * NO EXTERNAL DEPENDENCIES - uses built-in crypto and sqlite3.
 */

const http = require("http");
const crypto = require("crypto");
const path = require("path");
const sqlite3 = require("sqlite3").verbose();

const PORT = process.env.PORT || 3001;
const DB_PATH = process.env.OM_DB_PATH || "/data/openmemory.sqlite";

// Ensure schema exists
function initSchema() {
  const db = new sqlite3.Database(DB_PATH);
  db.serialize(() => {
    db.run(
      `
      CREATE TABLE IF NOT EXISTS access_keys (
        key_id TEXT PRIMARY KEY,
        key_hash TEXT UNIQUE NOT NULL,
        user_id TEXT NOT NULL,
        name TEXT,
        is_active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `,
      (err) => {
        if (err) console.error("SCHEMA ERROR:", err.message);
        else console.log("Schema verified for access_keys");
        db.close();
      },
    );
  });
}

initSchema();

// Hash token using same PBKDF2 as CLI (for verification)
function hashToken(token) {
  return new Promise((resolve, reject) => {
    const salt = crypto
      .createHash("sha256")
      .update("cybermem-salt-v1")
      .digest("hex")
      .slice(0, 16);
    crypto.pbkdf2(token, salt, 100000, 64, "sha512", (err, key) => {
      if (err) reject(err);
      else resolve(key.toString("hex"));
    });
  });
}

// Verify token against SQLite access_keys table
async function verifyToken(token) {
  try {
    const db = new sqlite3.Database(DB_PATH);

    const tokenHash = await hashToken(token);

    return new Promise((resolve, reject) => {
      db.get(
        "SELECT user_id, name FROM access_keys WHERE key_hash = ? AND is_active = 1",
        [tokenHash],
        (err, row) => {
          db.close();
          if (err) {
            console.log("DB error:", err.message);
            resolve(null);
          } else if (row) {
            // Update last_used_at
            const updateDb = new sqlite3.Database(DB_PATH);
            updateDb.run(
              "UPDATE access_keys SET last_used_at = datetime('now') WHERE key_hash = ?",
              [tokenHash],
            );
            updateDb.close();
            resolve({ userId: row.user_id, name: row.name });
          } else {
            resolve(null);
          }
        },
      );
    });
  } catch (err) {
    console.log("Token verification error:", err.message);
    return null;
  }
}

// Check if request is from localhost or local network
function isLocalRequest(req) {
  const forwarded = req.headers["x-forwarded-for"];
  const realIp = req.headers["x-real-ip"];
  const host = req.headers["x-forwarded-host"] || req.headers["host"] || "";
  const ip =
    forwarded?.split(",")[0]?.trim() || realIp || req.socket.remoteAddress;

  // IP-based local check
  const isLocalIp =
    ip === "127.0.0.1" ||
    ip === "::1" ||
    ip === "::ffff:127.0.0.1" ||
    ip === "localhost";

  // Host-based local check (raspberrypi.local, localhost, *.local)
  const isLocalHost =
    host.includes("localhost") ||
    host.includes("127.0.0.1") ||
    host.includes("raspberrypi.local") ||
    host.match(/\.local(:\d+)?$/);

  return isLocalIp || isLocalHost;
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

  // 1. Local bypass - no auth required for localhost
  if (isLocalRequest(req)) {
    console.log("Auth OK: Local bypass");
    res.writeHead(200, {
      "X-Auth-Method": "local",
      "X-User-Id": "local",
    });
    res.end();
    return;
  }

  // 2. Check Bearer token (sk-xxx format)
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.substring(7);

    if (token.startsWith("sk-")) {
      const result = await verifyToken(token);

      if (result) {
        console.log(`Auth OK: Token (${result.name || result.userId})`);
        res.writeHead(200, {
          "X-User-Id": result.userId,
          "X-Auth-Method": "token",
          "X-Token-Name": result.name || "",
        });
        res.end();
        return;
      }
    }
  }

  // 3. Check X-API-Key header (sk-xxx format)
  if (apiKeyHeader?.startsWith("sk-")) {
    const result = await verifyToken(apiKeyHeader);

    if (result) {
      console.log(`Auth OK: API-Key Header (${result.name || result.userId})`);
      res.writeHead(200, {
        "X-User-Id": result.userId,
        "X-Auth-Method": "api-key",
        "X-Token-Name": result.name || "",
      });
      res.end();
      return;
    }
  }

  // 4. Unauthorized
  console.log("Auth FAILED: No valid token");
  console.log("Headers:", JSON.stringify(req.headers));
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
  console.log(`DB path: ${DB_PATH}`);
});
