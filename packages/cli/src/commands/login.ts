/**
 * CyberMem CLI Auth Module
 *
 * Token storage and browser-based OAuth login flow.
 */

import chalk from "chalk";
import * as fs from "fs";
import * as http from "http";
import * as os from "os";
import * as path from "path";

const AUTH_DIR = path.join(os.homedir(), ".cybermem");
const TOKEN_FILE = path.join(AUTH_DIR, "token.json");
const AUTH_URL = process.env.CYBERMEM_AUTH_URL || "https://cybermem.dev";

interface StoredToken {
  access_token: string;
  expires_at: string;
  email?: string;
  name?: string;
}

/**
 * Ensure the .cybermem directory exists
 */
function ensureAuthDir(): void {
  if (!fs.existsSync(AUTH_DIR)) {
    fs.mkdirSync(AUTH_DIR, { recursive: true, mode: 0o700 });
  }
}

/**
 * Save token to disk
 */
function saveToken(
  token: string,
  expiresIn: number,
  email?: string,
  name?: string,
): void {
  ensureAuthDir();

  const expiresAt = new Date(Date.now() + expiresIn * 1000);
  const data: StoredToken = {
    access_token: token,
    expires_at: expiresAt.toISOString(),
    email,
    name,
  };

  fs.writeFileSync(TOKEN_FILE, JSON.stringify(data, null, 2), { mode: 0o600 });
}

/**
 * Start OAuth login flow
 * Opens browser and waits for callback with token
 */
export async function login(): Promise<void> {
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
      // Redirect to landing auth endpoint which starts GitHub flow
      // We pass our local callbackUrl as 'redirect' param to the intermediate CLI callback handler
      const authUrl = `${AUTH_URL}/api/auth/signin?callbackUrl=${encodeURIComponent(`${AUTH_URL}/api/auth/cli/callback?redirect=${encodeURIComponent(callbackUrl)}`)}`;

      console.log(chalk.blue("🔐 Opening browser for GitHub login..."));
      console.log(chalk.gray(`   If browser doesn't open, visit: ${authUrl}`));

      // Open browser
      const open = async (url: string) => {
        const { default: openBrowser } = await import("open");
        await openBrowser(url);
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
        let email: string | undefined;
        let name: string | undefined;
        try {
          const payload = JSON.parse(
            Buffer.from(token.split(".")[1], "base64").toString(),
          );
          email = payload.email;
          name = payload.name;
        } catch {
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
        console.log(
          chalk.green("✅ Successfully logged in as:"),
          chalk.bold(email || name || "Unknown"),
        );
        console.log(chalk.gray(`   Token saved to: ${TOKEN_FILE}`));

        server.close();
        resolve();
      });

      // Timeout after 5 minutes
      setTimeout(
        () => {
          server.close();
          reject(new Error("Login timeout - no callback received"));
        },
        5 * 60 * 1000,
      );
    });
  });
}
