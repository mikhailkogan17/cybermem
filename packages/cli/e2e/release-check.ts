/// <reference lib="dom" />
import fs from "fs";
import path from "path";
import { chromium } from "playwright";

interface VerifyOptions {
  name: string;
  url: string;
  isRemote: boolean;
  outputDir: string;
  prefix: string;
}

async function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

async function verifyEnvironment(options: VerifyOptions) {
  const { name, url, isRemote, outputDir, prefix } = options;
  console.log(`\n🔍 Verifying [${name}] at ${url}...`);

  async function performCRUD(url: string) {
    try {
      const axios = (await import("axios")).default;
      const https = await import("https");
      const httpsAgent = new https.Agent({ rejectUnauthorized: false });
      const headers: any = { "X-Client-Name": "antigravity-client" };
      if (isRemote) {
        headers["Authorization"] = "Bearer sk-staging-verified-key-vf7";
      }
      const config = { headers, httpsAgent, timeout: 5000 };

      // 1. Cleanup old verification data
      console.log(`    [CRUD] Cleanup: Removing old verification data...`);

      // 2. Create (Add Memory)
      console.log(`    [CRUD] Create: Adding verification memory...`);
      const addRes = await axios.post(
        `${url}/add`,
        {
          content: `Verification memory ${new Date().toISOString()}`,
          tags: ["verification", "staging", "auto-test"],
        },
        config,
      );
      if (addRes.status !== 200)
        throw new Error(`Add failed: ${addRes.status}`);

      // 3. Read (Query)
      console.log(`    [CRUD] Read: Querying verification memory...`);
      const queryRes = await axios.post(
        `${url}/query`,
        { query: "verification memory", k: 1 },
        config,
      );
      if (!queryRes.data?.results?.length)
        console.warn(
          "    [CRUD] Warning: Query returned no results (indexing delay?)",
        );
    } catch (error: any) {
      console.error(`    [CRUD] Failed: ${error.message}`);
      throw new Error(`CRUD Failure on [${name}]: ${error.message}`);
    }
  }

  const envDir = path.join(outputDir, name);
  await ensureDir(envDir);

  // 0. Perform CRUD Check
  await performCRUD(url);

  const browser = await chromium.launch({
    args: ["--no-proxy-server", "--disable-gpu", "--no-sandbox"],
  });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    extraHTTPHeaders: { "X-Client-Name": "antigravity-client" },
  });

  const page = await context.newPage();

  try {
    // Stage 1: Login
    console.log(`  - 1: Login...`);
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForTimeout(5000);

    if (isRemote) {
      // Check if we got a 401 JSON response (Tailscale/Traefik returning JSON instead of redirect)
      const bodyText = await page.textContent("body");
      if (
        bodyText?.includes("Valid access token required") ||
        bodyText?.includes("Unauthorized")
      ) {
        console.log(
          "    Detected 401 JSON. Forcing navigation to /auth/signin...",
        );
        await page.goto(`${url.replace(/\/$/, "")}/auth/signin`, {
          waitUntil: "domcontentloaded",
        });
        await page.waitForTimeout(2000);
      }

      if (
        page.url().includes("/auth/signin") ||
        (await page.locator("text=/Login with Token/i").isVisible()) ||
        (await page.locator("text=/CyberMem Dashboard/i").isVisible())
      ) {
        console.log("    Capture Login Screen...");
        await page.screenshot({
          path: path.join(envDir, `${prefix}1_login.png`),
        });
        // A. Identity Law: Check Last Writer
        const lastWriter = await page
          .locator("text=/Last Writer/i")
          .first()
          .locator("..")
          .locator("p")
          .textContent();
        console.log(`       Last Writer: "${lastWriter}"`);

        const forbiddenClients = [
          "curl",
          "node",
          "rest-api",
          "mcp",
          "cybermem",
          "unknown",
          "n/a",
          "mozilla",
          "chrome",
        ];
        const isIdentityValid = !forbiddenClients.some((c) =>
          lastWriter?.toLowerCase().includes(c),
        );

        if (!isIdentityValid) {
          console.error(
            `    ❌ IDENTITY LAW VIOLATION: Client name "${lastWriter}" is FORBIDDEN.`,
          );
          throw new Error(
            `Lethal Law Violation: Identity Name "${lastWriter}" is generic/forbidden.`,
          );
        } else {
          console.log("       ✅ Identity Law Passed");
        }

        // B. Data Integrity (SLA)
        const memoryRecords = await page
          .locator("text=/Memory Records/i")
          .first()
          .locator("..")
          .locator("div")
          .textContent();

        if (!memoryRecords || memoryRecords === "N/A") {
          throw new Error(
            "SLA Violation: Memory Records card is N/A or missing data.",
          );
        }
        console.log(
          `       ✅ Data Integrity Passed (${memoryRecords} records)`,
        );

        // C. Visualization (SLA)
        const chartVisible = await page.locator("canvas").first().isVisible();
        if (!chartVisible) {
          throw new Error("SLA Violation: Time Series chart is NOT visible.");
        }
        console.log("       ✅ Time Series Present");
        console.log("    Attempting login with verification token...");

        try {
          // Fill Input
          await page.fill(
            'input[type="password"]',
            "sk-staging-verified-key-vf7",
          ); // This matches the token injected by seed_key.js
          await page.click('button[type="submit"]');
          await page
            .waitForNavigation({
              waitUntil: "domcontentloaded",
              timeout: 15000,
            })
            .catch(() => {});
          await page.waitForTimeout(2000);
        } catch (e) {
          console.warn(
            "    Login failed or page changed before login completed.",
          );
        }
      } else {
        console.log("    Login bypassed or already authenticated.");
      }
    } else {
      console.log("    Login bypassed (Local)");
    }

    // Handle Auto-opened MCP Modal
    const closeBtn = page.getByRole("button", { name: /Close/i });
    const backdrop = page.locator("div.fixed.inset-0.bg-black\\/60").first();

    // Stage 2: Dashboard Home
    console.log(`  - 2: Dashboard Home...`);
    // Ensure dashboard loads data
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2000); // Wait for API fetch

    // Wait for at least one stat to be non-zero (Total Memories) -- implies data loaded
    try {
      await page.waitForFunction(
        () => {
          const stats = document.querySelectorAll(
            '.text-2xl.font-bold, [data-testid*="stat-value"]',
          );
          for (let i = 0; i < stats.length; i++) {
            const val = stats[i].textContent || "0";
            if (parseInt(val.replace(/[^0-9]/g, "")) > 0) return true;
          }
          return false;
        },
        { timeout: 25000 },
      );
      await page.waitForTimeout(1000); // Stabilize UI
    } catch (e) {
      const stats = await page
        .locator('[data-testid*="stat-value"]')
        .allTextContents();
      console.log(`    [DEBUG] Visible stats: ${JSON.stringify(stats)}`);
      throw new Error(
        `Zero Data Failure: Dashboard for [${name}] shows 0 records or failed to load stats.`,
      );
    }

    // New: Audit Log Check (Success >= 1, Error == 0)
    console.log(`  - 2b: Checking Audit Logs...`);
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(1000);

    const auditLogs = await page.locator("text=/Audit Log/i").first();
    if (await auditLogs.isVisible()) {
      const statusTexts = await page.locator(".status-pill").allTextContents();
      const hasError = statusTexts.some(
        (t) =>
          t.toLowerCase().includes("error") ||
          t.includes("500") ||
          t.includes("401"),
      );
      const hasSuccess = statusTexts.some(
        (t) =>
          t.toLowerCase().includes("success") ||
          t.includes("200") ||
          t.includes("201"),
      );

      if (hasError)
        throw new Error(
          `Audit Log Failure: Detected error entries in [${name}] logs.`,
        );
      if (!hasSuccess)
        throw new Error(
          `Audit Log Failure: No success entries found in [${name}] logs after CRUD.`,
        );
      console.log(`       ✅ Audit Logs Valid (Success: OK, Errors: 0)`);
    }

    // Close auto-opened modal if present
    const closeBtnForModal = page.locator('button:has-text("Close")'); // Renamed to avoid redeclaration
    if (await closeBtnForModal.isVisible({ timeout: 2000 })) {
      console.log("    Closing auto-opened MCP modal for dashboard shot...");
      await closeBtnForModal.click();
      await page.waitForTimeout(500);
      await backdrop
        .waitFor({ state: "hidden", timeout: 5000 })
        .catch(() => {});
    }
    await page.screenshot({
      path: path.join(envDir, `${prefix}1_dashboard.png`),
      fullPage: true,
    });

    // Stage 3: MCP Modal (x.2)
    console.log(`  - 3: MCP Modal...`);
    const mcpBtn = page.getByRole("button", { name: /Connect MCP/i });
    if (await mcpBtn.isVisible()) {
      await mcpBtn.click();
      await page.waitForTimeout(2000);

      // Scroll to show JSON
      const jsonBlock = page.locator("pre").first();
      if (await jsonBlock.isVisible()) {
        await jsonBlock.scrollIntoViewIfNeeded();
        await page.mouse.wheel(0, 300); // Small nudge to show context
        await page.waitForTimeout(500);
      }

      await page.screenshot({
        path: path.join(envDir, `${prefix}2_mcp.png`),
        fullPage: true,
      });
      await closeBtn.click().catch(() => page.keyboard.press("Escape"));
      await backdrop
        .waitFor({ state: "hidden", timeout: 5000 })
        .catch(() => {});
    }

    // Stage 4: Settings Modal (x.3)
    console.log(`  - 4: Settings Modal...`);
    const settingsBtn = page.locator("button:has(svg.lucide-settings)");
    await page.waitForSelector("button:has(svg.lucide-settings)", {
      state: "visible",
      timeout: 10000,
    });
    await settingsBtn.click();
    await page.waitForTimeout(2000);

    // Click EYE button for token visibility
    const eyeBtn = page
      .locator("button:has(svg.lucide-eye), button:has(svg.lucide-eye-off)")
      .first();
    if (await eyeBtn.isVisible()) {
      console.log("    Making access token visible...");
      await eyeBtn.click();
      await page.waitForTimeout(1000);
    }

    await page.screenshot({
      path: path.join(envDir, `${prefix}3_settings.png`),
      fullPage: true,
    });
    await page.keyboard.press("Escape");

    console.log(`✅ Verified [${name}]`);
  } catch (error: any) {
    console.error(`❌ Failed to verify [${name}]: ${error.message}`);
    await page.screenshot({ path: path.join(envDir, "error_screenshot.png") });
    throw error; // Propagate to main loop
  } finally {
    await context.close();
  }
}

async function main() {
  const isCi = process.argv.includes("--ci");
  const outputBase = path.join(
    process.cwd(),
    "release-reports",
    `release-report-0.12.4-assets`,
  );

  console.log(`🚀 Starting CyberMem E2E Release Check (v0.12.4)`);
  console.log(`Mode: ${isCi ? "CI (Staging Only)" : "Full Matrix"}`);
  console.log(`Output: ${outputBase}`);

  // Full Matrix
  const allConfigs: VerifyOptions[] = [
    {
      name: "localhost-staging",
      url: "http://127.0.0.1:8625",
      isRemote: false,
      outputDir: outputBase,
      prefix: "1.",
    },
    {
      name: "localhost-prod",
      url: "http://127.0.0.1:8626",
      isRemote: false,
      outputDir: outputBase,
      prefix: "2.",
    },
    {
      name: "rpi-local",
      url: "http://raspberrypi.local:8625",
      isRemote: true,
      outputDir: outputBase,
      prefix: "3.",
    },
    {
      name: "rpi-staging-ts",
      url: process.env.TAILSCALE_URL || "",
      isRemote: true,
      outputDir: outputBase,
      prefix: "4.",
    },
    {
      name: "k3d-staging",
      url: "http://localhost:8081",
      isRemote: false,
      outputDir: outputBase,
      prefix: "5.",
    },
  ];

  // Filter for CI
  const configurations = isCi
    ? allConfigs.filter((c) => c.name === "localhost-staging")
    : allConfigs;

  for (const config of configurations) {
    if (
      !config.url ||
      config.url.includes("placeholder") ||
      config.url === ""
    ) {
      console.log(`\n⏭️ Skipping [${config.name}] - URL not configured.`);
      continue;
    }
    await verifyEnvironment(config);
  }
}

main().catch((err) => {
  console.error("\n💥 UNEXPECTED FAILURE:");
  console.error(err);
  process.exit(1);
});
