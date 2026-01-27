import * as fs from "fs";
import * as path from "path";
import type { Browser } from "playwright";
import { chromium } from "playwright";

/**
 * 14 Screenshots Verification Tool
 *
 * Environments: localhost, rpi-local, rpi-tailscale, k3d
 * Pages:
 *   - login (only rpi-tailscale and k3d)
 *   - filled_dashboard
 *   - mcp_config (client-setup with full JSON)
 *   - settings
 *
 * Total: 3 + 3 + 4 + 4 = 14 screenshots
 */

const ENVIRONMENTS = {
  localhost: {
    name: "localhost",
    baseUrl: "http://localhost:8626",
    needsLogin: false,
  },
  "rpi-local": {
    name: "rpi-local",
    baseUrl: "http://raspberrypi.local:8626",
    needsLogin: false,
  },
  "rpi-tailscale": {
    name: "rpi-tailscale",
    baseUrl: process.env.TAILSCALE_URL || "",
    basePath: "/cybermem/dashboard", // Tailscale funnel routes dashboard here
    needsLogin: true,
  },
  k3d: {
    name: "k3d",
    baseUrl: "http://localhost:8626", // k3d port-forwards to same port
    needsLogin: true, // k3d simulates remote access
  },
};

const SCREENSHOT_DIR = path.resolve(process.cwd(), "tools/screenshots");

async function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

async function captureEnv(envKey: string, browser: Browser) {
  const env = ENVIRONMENTS[envKey as keyof typeof ENVIRONMENTS];
  if (!env) {
    console.error(`Unknown environment: ${envKey}`);
    return 0;
  }

  if (!env.baseUrl) {
    console.log(`⏭️ Skipping ${env.name} (URL not configured)`);
    return 0;
  }

  console.log(`\n📸 Capturing ${env.name} (${env.baseUrl})...`);

  // Determine base path for page routes (some envs like tailscale use prefix)
  const basePath = (env as any).basePath || "";

  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    extraHTTPHeaders: {
      "X-Client-Name": "antigravity-client",
    },
  });

  const page = await context.newPage();
  const baseDir = path.join(SCREENSHOT_DIR, envKey);
  await ensureDir(baseDir);

  let capturedCount = 0;

  try {
    // Check if environment is reachable
    try {
      await page.goto(`${env.baseUrl}${basePath}/`, { timeout: 5000 });
    } catch (e) {
      console.log(`  ❌ Environment unreachable: ${env.baseUrl}`);
      await context.close();
      return 0;
    }

    // 1. Login Page (only for envs that need it)
    if (env.needsLogin) {
      console.log(`  - Login Page...`);
      // Navigate to a protected route to trigger login redirect or check auth page
      await page.goto(
        `${env.baseUrl}${basePath}/api/auth/token?error=no_token`,
        {
          waitUntil: "networkidle",
        },
      );
      await page.screenshot({ path: path.join(baseDir, "01_login.png") });
      capturedCount++;
    }

    // 2. Dashboard (filled) - Wait for actual data to load
    console.log(`  - Dashboard...`);
    await page.goto(`${env.baseUrl}${basePath}/`, { waitUntil: "networkidle" });

    // Wait for dashboard content to load and verify data is present
    try {
      // Wait for stat cards to appear (indicating dashboard loaded)
      await page.waitForSelector('[data-testid="stat-card"]', {
        timeout: 5000,
      });

      // Check if data is present (not "0" or "N/A")
      const memoryCountText = await page
        .textContent('[data-testid="memory-count"]')
        .catch(() => "0");
      console.log(`    Memory count: ${memoryCountText}`);

      // Additional wait to ensure charts and data finish loading
      await page.waitForTimeout(1500);
    } catch (e) {
      console.log(
        `    ⚠️ Warning: Could not verify data presence on dashboard`,
      );
      await page.waitForTimeout(1000);
    }

    await page.screenshot({
      path: path.join(
        baseDir,
        env.needsLogin ? "02_dashboard.png" : "01_dashboard.png",
      ),
      fullPage: true,
    });
    capturedCount++;

    // 3. MCP Config Modal - Click button to open modal instead of navigating to page
    console.log(`  - MCP Config Modal...`);
    await page.goto(`${env.baseUrl}${basePath}/`, { waitUntil: "networkidle" });

    try {
      // Click the "Connect MCP" or "Client Setup" button to open modal
      const connectButton = page
        .locator('button:has-text("Connect MCP"), a[href="/client-setup"]')
        .first();
      await connectButton.waitFor({ timeout: 3000 });
      await connectButton.click();

      // Wait for modal to appear and JSON config to render
      await page.waitForSelector("pre, code", { timeout: 3000 });
      await page.waitForTimeout(500);

      await page.screenshot({
        path: path.join(
          baseDir,
          env.needsLogin ? "03_mcp_modal.png" : "02_mcp_modal.png",
        ),
        fullPage: true,
      });
    } catch (e) {
      // Fallback: navigate directly to client-setup page
      console.log(`    ⚠️ Could not open modal, using direct navigation`);
      await page.goto(`${env.baseUrl}${basePath}/client-setup`, {
        waitUntil: "networkidle",
      });
      await page.waitForTimeout(500);
      await page.screenshot({
        path: path.join(
          baseDir,
          env.needsLogin ? "03_mcp_config.png" : "02_mcp_config.png",
        ),
        fullPage: true,
      });
    }
    capturedCount++;

    // 4. Settings - Click settings button instead of direct navigation
    console.log(`  - Settings...`);
    await page.goto(`${env.baseUrl}${basePath}/`, { waitUntil: "networkidle" });

    try {
      // Click settings button/link
      const settingsButton = page
        .locator('a[href="/settings"], button:has-text("Settings")')
        .first();
      await settingsButton.waitFor({ timeout: 3000 });
      await settingsButton.click();

      // Wait for settings page to load
      await page.waitForSelector("input, select", { timeout: 3000 });
      await page.waitForTimeout(500);
    } catch (e) {
      // Fallback: navigate directly
      console.log(
        `    ⚠️ Could not click settings button, using direct navigation`,
      );
      await page.goto(`${env.baseUrl}${basePath}/settings`, {
        waitUntil: "networkidle",
      });
      await page.waitForTimeout(500);
    }

    await page.screenshot({
      path: path.join(
        baseDir,
        env.needsLogin ? "04_settings.png" : "03_settings.png",
      ),
      fullPage: true,
    });
    capturedCount++;

    console.log(`✅ Captured ${env.name}: ${capturedCount} screenshots`);
  } catch (error) {
    console.error(`❌ Error capturing ${env.name}:`, error);
  } finally {
    await context.close();
  }

  return capturedCount;
}

async function main() {
  const args = process.argv.slice(2);
  const targetEnv = args[0] || "all";

  console.log("🎯 14 Screenshots Verification Tool");
  console.log(`   Target: ${targetEnv}`);
  console.log(`   X-Client-Name: antigravity-client\n`);

  const browser = await chromium.launch();
  let totalScreenshots = 0;

  if (targetEnv === "all") {
    for (const key of Object.keys(ENVIRONMENTS)) {
      totalScreenshots += await captureEnv(key, browser);
    }
  } else {
    totalScreenshots = await captureEnv(targetEnv, browser);
  }

  await browser.close();

  console.log(`\n✨ Done. Total screenshots: ${totalScreenshots}`);
  console.log(`   Output: ${SCREENSHOT_DIR}`);

  if (totalScreenshots < 14 && targetEnv === "all") {
    console.log(
      `\n⚠️ Warning: Expected 14 screenshots, got ${totalScreenshots}`,
    );
    console.log("   Some environments may be offline or misconfigured.");
  }
}

main().catch(console.error);
