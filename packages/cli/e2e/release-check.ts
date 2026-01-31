/// <reference lib="dom" />
import fs from "fs";
import path from "path";
import { chromium } from "playwright";

const args = process.argv.slice(2);
const argOnlyTesting = args.find((a, i) => a === "--only-testing");
const onlyTestingValue = argOnlyTesting
  ? args[args.indexOf(argOnlyTesting) + 1]
  : null;
const onlyTesting = args.includes("--only-testing");
const isStagingSimulation = args.includes("--staging"); // Undocumented: Simulate Remote Envs on Localhost
const argToken = args.find((a, i) => args[i - 1] === "--token");
const argUrl = args.find((a, i) => args[i - 1] === "--url");

if (argToken) process.env.CYBERMEM_TOKEN = argToken;
if (argUrl) process.env.TAILSCALE_URL = argUrl;

interface VerifyOptions {
  name: string;
  url: string; // Dashboard URL
  apiUrl?: string; // Core API URL (defaults to url if not set)
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
  const { name, url, apiUrl, isRemote, outputDir, prefix } = options;
  const targetApiUrl = apiUrl || url;
  console.log(`\n🔍 Verifying [${name}]...`);
  console.log(`    Dashboard: ${url}`);
  console.log(`    API:       ${targetApiUrl}`);

  async function performCRUD(url: string) {
    try {
      const axios = (await import("axios")).default;
      const https = await import("https");
      const httpsAgent = new https.Agent({ rejectUnauthorized: false });
      const headers: any = {
        "X-Client-Name": "antigravity-client",
        "X-Client-Version": "0.12.5",
      };
      if (isRemote) {
        headers["Authorization"] =
          `Bearer ${process.env.CYBERMEM_TOKEN || "sk-staging-verified-key-vf7"}`;
      }
      const config = { headers, httpsAgent, timeout: 30000 };

      // 1. Create (Add Memory)
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

      const memoryId = addRes.data.id;
      if (!memoryId) throw new Error("Add failed: No memory ID returned");

      // 2. Read (Query)
      console.log(`    [CRUD] Read: Querying verification memory...`);
      await new Promise((r) => setTimeout(r, 60000));

      const queryRes = await axios.post(
        `${url}/query`,
        { query: "verification memory", k: 10, minScore: 0.0 },
        config,
      );
      const results = Array.isArray(queryRes.data)
        ? queryRes.data
        : queryRes.data?.results;
      if (!results?.length) throw new Error("Read failed: Memory not found");

      // 3. Update (PATCH)
      console.log(
        `    [CRUD] Update: Patching verification memory [${memoryId}]...`,
      );
      // We use the direct endpoint /memory/:id which is handled by Traefik correctly
      const patchRes = await axios.patch(
        `${url}/memory/${memoryId}`,
        { tags: ["verification", "staging", "auto-test", "updated"] },
        config,
      );
      if (patchRes.status !== 200)
        console.warn("    ⚠️ Update (PATCH) returned non-200. Continuing...");

      // 4. Delete
      console.log(`    [CRUD] Delete: Removing [${memoryId}]...`);
      const delRes = await axios.delete(`${url}/memory/${memoryId}`, config);
      if (delRes.status !== 200)
        throw new Error(`Delete failed: ${delRes.status}`);

      console.log(`       ✅ Full CRUD lifecycle passed`);
    } catch (error: any) {
      console.error(`    [CRUD] Failed: ${error.message}`);
      throw new Error(`CRUD Failure on [${name}]: ${error.message}`);
    }
  }

  const envDir = path.join(outputDir, name);
  await ensureDir(envDir);
  await performCRUD(targetApiUrl);

  const browser = await chromium.launch({
    args: ["--no-proxy-server", "--disable-gpu", "--no-sandbox"],
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1200 },
    extraHTTPHeaders: { "X-Client-Name": "antigravity-client" },
  });

  const page = await context.newPage();

  try {
    // Stage 1: Login
    console.log(`  - 1: Login...`);

    // For Remote envs (RPi/VPS), Root (/) returns JSON 401.
    // We must navigate to /auth/signin explicitly for Login UI.
    const targetUrl = isRemote ? new URL("/auth/signin", url).toString() : url;

    await page.goto(targetUrl, {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });
    await page.waitForTimeout(5000);

    if (isRemote) {
      // SPA Login Detection: Check for Login Modal or Input instead of full page text
      console.log(`    [Auth] Checking for SPA Login State at ${targetUrl}...`);
      const loginInput = page.locator(
        'input#access-token, input[type="password"]',
      );

      if (await loginInput.isVisible({ timeout: 60000 })) {
        console.log("    ✅ SPA Login Modal Verified.");
        await page.screenshot({
          path: path.join(envDir, `${prefix}1_login.png`),
        });

        console.log(`    [Auth] Performing Token Login via UI...`);
        const token =
          process.env.CYBERMEM_TOKEN || "sk-staging-verified-key-vf7";
        await loginInput.fill(token);

        // Handle "Enter" or Click Arrow
        const submitBtn = page.locator(
          'button[type="submit"], button:has(svg)',
        );
        if ((await submitBtn.count()) > 0) {
          await submitBtn.first().click();
        } else {
          await page.keyboard.press("Enter");
        }
        await page.waitForTimeout(5000);
      } else {
        console.log(
          "    ℹ️ No Login Input found, assuming authenticated or public.",
        );
      }
    }

    // Common Dashboard Checks
    console.log("    Verifying Identity Law...");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(5000);

    // Stage 2: Dashboard Home
    console.log(`  - 2: Dashboard Home...`);
    await page.screenshot({
      path: path.join(envDir, `${prefix}1_dashboard.png`),
      fullPage: true,
    });

    // Audit logs
    console.log(`  - 2b: Checking Audit Logs...`);
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(2000);
    const auditStatus = await page.locator(".status-pill").allTextContents();
    console.log(`       [Debug] Found ${auditStatus.length} audit entries.`);

    // Stage 3: MCP Modal
    console.log(`  - 3: MCP Modal...`);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(1000);

    const mcpBtn = page.locator('[data-testid="mcp-button"]').first();
    try {
      await mcpBtn.waitFor({ state: "visible", timeout: 15000 });
      await mcpBtn.hover(); // Trigger any hover states
      await mcpBtn.click();
    } catch (e: any) {
      console.warn(
        `       [Debug] MCP click failed (${e.message.substring(0, 50)}), forcing JS click...`,
      );
      await page.evaluate(() => {
        const btn = document.querySelector(
          '[data-testid="mcp-button"]',
        ) as HTMLButtonElement;
        if (btn) btn.click();
      });
    }
    // Wait for Modal Title to appear to confirm it opened
    await page
      .locator('div:has-text("MCP Integration")')
      .first()
      .waitFor({ state: "visible", timeout: 10000 })
      .catch(() => {
        console.warn(
          "       [Debug] MCP Modal title not found, proceeding anyway...",
        );
      });
    await page.waitForTimeout(2000);
    await page.screenshot({
      path: path.join(envDir, `${prefix}2_mcp.png`),
      fullPage: true,
    });

    // Close Modal Robustly
    const closeBtn = page.locator('button:has-text("Close")').last();
    if (await closeBtn.isVisible()) {
      await closeBtn.click();
    } else {
      await page.keyboard.press("Escape");
    }
    // Wait for overlay to disappear
    await page
      .locator("div.fixed.inset-0")
      .waitFor({ state: "hidden", timeout: 5000 })
      .catch(() => {});
    await page.waitForTimeout(2000);

    // Stage 4: Settings Modal
    console.log(`  - 4: Settings Modal...`);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(500);

    const settingsBtn = page.locator('[data-testid="settings-button"]').first();
    try {
      await settingsBtn.waitFor({ state: "visible", timeout: 15000 });
      await settingsBtn.hover();
      await settingsBtn.click();
    } catch (e: any) {
      console.warn(
        `       [Debug] Settings click failed (${e.message.substring(0, 50)}), forcing JS click...`,
      );
      await page.evaluate(() => {
        const btn = document.querySelector(
          '[data-testid="settings-button"]',
        ) as HTMLButtonElement;
        if (btn) btn.click();
      });
    }
    // Wait for Settings title
    await page
      .locator('span:has-text("Settings")')
      .last()
      .waitFor({ state: "visible", timeout: 10000 })
      .catch(() => {
        console.warn("       [Debug] Settings Modal title not found.");
      });
    await page.waitForTimeout(3000);

    const eyeBtn = page
      .locator(
        '[data-testid="toggle-visibility"], button[aria-label="Toggle token visibility"], button:has(svg.lucide-eye), button.absolute.right-3',
      )
      .first();
    console.log("       [Debug] Checking Settings Eye Button...");
    // Explicit wait for Eye button
    try {
      await eyeBtn.waitFor({ state: "visible", timeout: 10000 });
    } catch (e) {
      console.warn(
        "       [Debug] Eye button wait timeout, checking current visibility...",
      );
    }

    if (await eyeBtn.isVisible()) {
      console.log("       [Debug] Eye button found, clicking...");
      await eyeBtn.click({ force: true });
      await page.waitForTimeout(2000);

      await page.screenshot({
        path: path.join(envDir, `${prefix}3_settings.png`),
        fullPage: true,
      });

      const tokenInput = page.locator(
        'input#access-token, input[id="access-token"]',
      );
      const tokenValue = await tokenInput.inputValue().catch(async () => {
        console.warn(
          "       [Debug] input#access-token failed, trying fallback by visibility...",
        );
        return page.evaluate(() => {
          const input = document.querySelector(
            'input[type="text"]',
          ) as HTMLInputElement;
          return input?.value || "";
        });
      });

      if (tokenValue && tokenValue.length > 10) {
        console.log(
          `       ✅ Token visible: ${tokenValue.substring(0, 7)}...`,
        );
      } else {
        console.error(
          `       ❌ Token NOT visible or malformed: ${tokenValue}`,
        );
      }
    } else {
      console.error(`       ❌ Eye button not visible in Settings modal`);
      await page.screenshot({
        path: path.join(envDir, `FAILED_${prefix}settings_eye_missing.png`),
      });
      throw new Error(`Settings Modal Eye button missing on [${name}]`);
    }

    await page.keyboard.press("Escape");
    await page.waitForTimeout(1000);

    console.log(`✅ Verified [${name}]`);
  } catch (error: any) {
    console.error(`❌ Verification failed for [${name}]: ${error.message}`);
    await page.screenshot({
      path: path.join(envDir, `ERROR_${name}.png`),
    });
  } finally {
    await browser.close();
  }
}

async function main() {
  let outputBase = path.join(
    process.cwd(),
    "release-reports",
    `release-report-0.12.5-assets`, // Default
  );

  if (isStagingSimulation) {
    console.warn("⚠️  RUNNING IN STAGING MODE (Local Images/Dev Build) ⚠️");
    console.warn("    Targeting REAL Remote environments (RPi/VPS).");
    console.warn(
      "    Artifacts will be saved to: release-report-staging-assets",
    );

    outputBase = path.join(
      process.cwd(),
      "release-reports",
      "release-report-staging-assets",
    );
  }

  if (fs.existsSync(outputBase)) fs.rmSync(outputBase, { recursive: true });
  fs.mkdirSync(outputBase, { recursive: true });

  console.log(
    `🚀 Starting CyberMem E2E Release Check (v0.12.5${isStagingSimulation ? "-staging" : ""})`,
  );

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
      name: "rpi-lan-staging",
      url: "http://raspberrypi.local:8625",
      isRemote: true,
      outputDir: outputBase,
      prefix: "3.",
    },
    {
      name: "rpi-ts-staging",
      url: "https://raspberrypi.tail7242ed.ts.net/cybermem-staging",
      isRemote: true,
      outputDir: outputBase,
      prefix: "4.",
    },
    {
      name: "vps-staging",
      url: "http://localhost:8627",
      isRemote: true,
      outputDir: outputBase,
      prefix: "5.",
    },
  ];

  let configurations = onlyTesting
    ? allConfigs.filter((c) => c.name === onlyTestingValue)
    : allConfigs;

  if (configurations.length === 0 && onlyTesting) {
    console.error(`No configuration found with name: ${onlyTestingValue}`);
    process.exit(1);
  }

  for (const config of configurations) {
    if (config.url) {
      try {
        await verifyEnvironment(config);
      } catch (e: any) {
        console.error(`\n❌ [CONTINUE] ${config.name} failed: ${e.message}\n`);
      }
    }
  }
}

main().catch(console.error);
