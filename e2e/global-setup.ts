/**
 * Global Setup - Runs ONCE before ALL tests
 *
 * This performs a clean state reset using the CyberMem CLI.
 * MCP:E2E:CRUD tests do NOT need reset - they work with existing data.
 *
 * IMPORTANT: This setup is SKIPPED on RPi-prod environments.
 */

import { FullConfig } from "@playwright/test";
import { execSync } from "child_process";

// Environment detection
const DASHBOARD_URL = process.env.DASHBOARD_URL || "http://localhost:8626";
const MCP_URL = process.env.MCP_URL || "http://localhost:8626";
const isLocalhost =
  !DASHBOARD_URL.includes("raspberrypi") &&
  !DASHBOARD_URL.includes(".ts.net") &&
  (DASHBOARD_URL.includes("localhost") || DASHBOARD_URL.includes("127.0.0.1"));

function runCLI(cmd: string): { stdout: string; success: boolean } {
  try {
    const stdout = execSync(cmd, {
      encoding: "utf-8",
      timeout: 120000, // 2 min timeout
      env: { ...process.env, FORCE_COLOR: "0" },
    });
    return { stdout, success: true };
  } catch (error: any) {
    return { stdout: error.stdout || error.message, success: false };
  }
}

async function waitForMCPReady(
  url: string,
  timeoutMs: number = 45000,
): Promise<boolean> {
  const startTime = Date.now();
  const baseUrl = url.replace(/\/mcp$/, "");
  const healthUrl = baseUrl + "/health";
  const addUrl = baseUrl + "/add";

  console.log(`⏳ Waiting for MCP API at ${healthUrl}...`);

  let consecutiveSuccesses = 0;
  const requiredSuccesses = 5; // Need 5 successful calls in a row

  while (Date.now() - startTime < timeoutMs) {
    try {
      const response = await fetch(healthUrl, {
        headers: { "X-Client-Name": "e2e-global-setup" },
        signal: AbortSignal.timeout(5000),
      });

      if (response.ok) {
        consecutiveSuccesses++;
        if (consecutiveSuccesses >= requiredSuccesses) {
          if (consecutiveSuccesses >= requiredSuccesses) {
            console.log(`   ✅ Health OK, MCP API ready`);
            return true;
          }
        }
      } else {
        consecutiveSuccesses = 0;
      }
    } catch {
      consecutiveSuccesses = 0;
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  console.log(`   ⚠️ MCP API not ready after ${timeoutMs}ms`);
  return false;
}

async function globalSetup(_config: FullConfig) {
  console.log("\n🔧 GLOBAL SETUP — CyberMem E2E Test Environment\n");

  // Safety guard: NEVER reset on RPi-prod
  if (!isLocalhost) {
    console.log("⚠️  SKIPPING RESET — Remote/RPi environment detected");
    console.log(`   URL: ${DASHBOARD_URL}`);
    console.log("   Reset operations are ONLY allowed on localhost.\n");
    return;
  }

  // CRITICAL: In CI, we trust the workflow to have installed the CLI
  // Rerunning install would trigger a rebuild or npm fetch, breaking the flow
  if (process.env.CI) {
    console.log("🤖 CI Environment detected.");
    console.log("   Skipping CLI install/reset (trusting workflow step).");
    console.log("   Verifying API readiness...");

    // We expect the workflow to have started services
    const ready = await waitForMCPReady(MCP_URL);
    if (!ready) {
      throw new Error(`❌ MCP API at ${MCP_URL} failed to become ready in CI`);
    }
    console.log("   ✅ Clean state provided by workflow");
    return;
  }

  // Step 1: Reset database

  // Step 1: Reset database
  console.log(
    "🧹 [1/2] Wiping database via node packages/cli/dist/index.js reset -f",
  );
  const resetResult = runCLI("node packages/cli/dist/index.js reset -f");
  if (resetResult.success) {
    console.log("   ✅ Database reset successfully");
  } else {
    console.log(
      "   ⚠️  Reset failed (may not exist yet):",
      resetResult.stdout.substring(0, 200),
    );
  }

  // Step 2: Start/ensure CyberMem services
  console.log(
    "🚀 [2/2] Starting CyberMem via node packages/cli/dist/index.js install",
  );
  const installResult = runCLI("node packages/cli/dist/index.js install");
  if (installResult.success) {
    console.log("   ✅ CyberMem services started");

    // Check for access token
    const tokenMatch = installResult.stdout.match(/sk-[a-f0-9]{32,64}/i);
    if (tokenMatch) {
      console.log(`   🔐 Access Token: ${tokenMatch[0].substring(0, 15)}...`);
    }
  } else {
    console.log(
      "   ⚠️  Install failed:",
      installResult.stdout.substring(0, 200),
    );
  }

  // Step 2.5: Force-restart MCP container to ensure fresh SQLite connections
  // This prevents SQLITE_CORRUPT errors caused by stale WAL/journal files
  // lingering from the reset step
  console.log("🔄 [2.5/3] Restarting MCP container for clean DB state...");
  const restartResult = runCLI(
    "docker-compose -p cybermem -f packages/cli/templates/docker-compose.yml restart mcp-server",
  );
  if (restartResult.success) {
    console.log("   ✅ MCP container restarted");
  } else {
    console.log(
      "   ⚠️  Restart failed:",
      restartResult.stdout.substring(0, 200),
    );
  }
  // Small delay for container to initialize
  await new Promise((resolve) => setTimeout(resolve, 3000));

  // Step 3: Wait for MCP API to be fully ready (prevents "Bad Gateway")
  console.log("🔄 [3/3] Health check — waiting for MCP API...");
  const isReady = await waitForMCPReady(MCP_URL, 30000);

  if (!isReady) {
    console.log("   ⚠️ Proceeding anyway, but first test may fail");
  }

  console.log("\n✅ GLOBAL SETUP COMPLETE — Ready for tests\n");
}

export default globalSetup;
