"use strict";
/**
 * CyberMem MCP Auth Module
 *
 * Token storage and browser-based OAuth login flow.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.getToken = getToken;
exports.isLoggedIn = isLoggedIn;
exports.getUserInfo = getUserInfo;
exports.logout = logout;
exports.showStatus = showStatus;
exports.login = login;
const fs = __importStar(require("fs"));
const http = __importStar(require("http"));
const os = __importStar(require("os"));
const path = __importStar(require("path"));
const AUTH_DIR = path.join(os.homedir(), ".cybermem");
const TOKEN_FILE = path.join(AUTH_DIR, "token.json");
const AUTH_URL = process.env.CYBERMEM_AUTH_URL || "https://cybermem.dev";
/**
 * Ensure the .cybermem directory exists
 */
function ensureAuthDir() {
    if (!fs.existsSync(AUTH_DIR)) {
        fs.mkdirSync(AUTH_DIR, { recursive: true, mode: 0o700 });
    }
}
/**
 * Get stored token if valid
 */
function getToken() {
    try {
        if (!fs.existsSync(TOKEN_FILE)) {
            return null;
        }
        const data = JSON.parse(fs.readFileSync(TOKEN_FILE, "utf-8"));
        // Check expiration
        if (new Date(data.expires_at) < new Date()) {
            console.error("Token expired, please run --login");
            return null;
        }
        return data.access_token;
    }
    catch {
        return null;
    }
}
/**
 * Check if user is logged in with valid token
 */
function isLoggedIn() {
    return getToken() !== null;
}
/**
 * Get user info from stored token
 */
function getUserInfo() {
    try {
        if (!fs.existsSync(TOKEN_FILE)) {
            return null;
        }
        const data = JSON.parse(fs.readFileSync(TOKEN_FILE, "utf-8"));
        return { email: data.email, name: data.name };
    }
    catch {
        return null;
    }
}
/**
 * Save token to disk
 */
function saveToken(token, expiresIn, email, name) {
    ensureAuthDir();
    const expiresAt = new Date(Date.now() + expiresIn * 1000);
    const data = {
        access_token: token,
        expires_at: expiresAt.toISOString(),
        email,
        name,
    };
    fs.writeFileSync(TOKEN_FILE, JSON.stringify(data, null, 2), { mode: 0o600 });
}
/**
 * Remove stored token
 */
function logout() {
    if (fs.existsSync(TOKEN_FILE)) {
        fs.unlinkSync(TOKEN_FILE);
        console.log("✅ Logged out successfully");
    }
    else {
        console.log("Already logged out");
    }
}
/**
 * Show current auth status
 */
function showStatus() {
    const token = getToken();
    const userInfo = getUserInfo();
    if (token && userInfo) {
        console.log("✅ Logged in as:", userInfo.email || userInfo.name || "Unknown");
        if (userInfo.name)
            console.log("   Name:", userInfo.name);
    }
    else {
        console.log("❌ Not logged in");
        console.log("   Run: npx @cybermem/mcp --login");
    }
}
/**
 * Start OAuth login flow
 * Opens browser and waits for callback with token
 */
async function login() {
    return new Promise((resolve, reject) => {
        // Find available port
        const server = http.createServer();
        server.listen(0, "127.0.0.1", () => {
            const address = server.address();
            if (!address || typeof address === "string") {
                reject(new Error("Failed to start callback server"));
                return;
            }
            const port = address.port;
            const callbackUrl = `http://localhost:${port}/callback`;
            const authUrl = `${AUTH_URL}/api/auth/signin?callbackUrl=${encodeURIComponent(`${AUTH_URL}/api/auth/cli/callback?redirect=${encodeURIComponent(callbackUrl)}`)}`;
            console.log("🔐 Opening browser for GitHub login...");
            console.log(`   If browser doesn't open, visit: ${authUrl}`);
            // Open browser
            const open = async (url) => {
                const { exec } = await import("child_process");
                const cmd = process.platform === "darwin"
                    ? `open "${url}"`
                    : process.platform === "win32"
                        ? `start "${url}"`
                        : `xdg-open "${url}"`;
                exec(cmd);
            };
            open(authUrl);
            // Handle callback
            server.on("request", async (req, res) => {
                if (!req.url?.startsWith("/callback")) {
                    res.writeHead(404);
                    res.end("Not found");
                    return;
                }
                const url = new URL(req.url, `http://localhost:${port}`);
                const token = url.searchParams.get("token");
                if (!token) {
                    res.writeHead(400);
                    res.end("Missing token");
                    server.close();
                    reject(new Error("No token received"));
                    return;
                }
                // Decode token to get user info (JWT payload)
                let email;
                let name;
                try {
                    const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64").toString());
                    email = payload.email;
                    name = payload.name;
                }
                catch {
                    // Ignore decode errors
                }
                // Save token (30 days expiry)
                saveToken(token, 30 * 24 * 60 * 60, email, name);
                // Send success page
                res.writeHead(200, { "Content-Type": "text/html" });
                res.end(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>CyberMem - Logged In</title>
            <style>
              body { font-family: system-ui; text-align: center; padding: 50px; background: #0a0a0a; color: #fff; }
              h1 { color: #22c55e; }
              .logo { font-size: 48px; margin-bottom: 20px; }
            </style>
          </head>
          <body>
            <div class="logo">🧠</div>
            <h1>Successfully Logged In!</h1>
            <p>You can close this window and return to your terminal.</p>
            <p style="color: #888;">Logged in as: ${email || name || "Unknown"}</p>
          </body>
          </html>
        `);
                console.log("");
                console.log("✅ Successfully logged in as:", email || name || "Unknown");
                console.log("   Token saved to:", TOKEN_FILE);
                server.close();
                resolve();
            });
            // Timeout after 5 minutes
            setTimeout(() => {
                server.close();
                reject(new Error("Login timeout - no callback received"));
            }, 5 * 60 * 1000);
        });
    });
}
