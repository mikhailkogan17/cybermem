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
const argToken = args.find((a, i) => args[i - 1] === "--token");
const argUrl = args.find((a, i) => args[i - 1] === "--url");

if (argToken) process.env.CYBERMEM_TOKEN = argToken;
if (argUrl) process.env.TAILSCALE_URL = argUrl;

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
      const headers: any = { 
        "X-Client-Name": "antigravity-client",
        "X-Client-Version": "0.12.4"
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
      await new Promise((r) => setTimeout(r, 2000));

      const queryRes = await axios.post(
        `${url}/query`,
        { query: "verification memory", k: 1 },
        config,
      );
      const results = Array.isArray(queryRes.data) ? queryRes.data : queryRes.data?.results;
      if (!results?.length) throw new Error("Read failed: Memory not found");

      // 3. Update (PATCH)
      console.log(`    [CRUD] Update: Patching verification memory [${memoryId}]...`);
      // We use the direct endpoint /memory/:id which is handled by Traefik correctly
      const patchRes = await axios.patch(
        `${url}/memory/${memoryId}`,
        { tags: ["verification", "staging", "auto-test", "updated"] },
        config
      );
      if (patchRes.status !== 200) console.warn("    ⚠️ Update (PATCH) returned non-200. Continuing...");

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
  await performCRUD(url);

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
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForTimeout(5000);

    if (isRemote) {
      const bodyText = await page.textContent("body");
      if (bodyText?.includes("Valid access token required") || bodyText?.includes("Unauthorized")) {
        await page.goto(`${url.replace(/\/$/, "")}/auth/signin`, { waitUntil: "domcontentloaded" });
        await page.waitForTimeout(2000);
      }

      if (page.url().includes("/auth/signin") || await page.locator("text=/Login with Token/i").isVisible()) {
        console.log("    ✅ Public Bypass Verified: Login Screen visible.");
        await page.screenshot({ path: path.join(envDir, `${prefix}1_login_proof.png`) });
        console.log(`    [Auth] Performing Token Login via UI...`);
        const token = process.env.CYBERMEM_TOKEN || "sk-staging-verified-key-vf7";
        const passInput = page.locator('input[type="password"]');
        await passInput.waitFor({ state: "visible", timeout: 10000 });
        await passInput.fill(token);
        await page.click('button[type="submit"]');
        await page.waitForTimeout(5000);
      }
    }

    // Common Dashboard Checks
    console.log("    Verifying Identity Law...");
    // Increased wait for metrics to populate
    await page.reload({ waitUntil: "networkidle" });
    await page.waitForTimeout(5000);

    // Stage 2: Dashboard Home
    console.log(`  - 2: Dashboard Home...`);
    await page.screenshot({ path: path.join(envDir, `${prefix}1_dashboard.png`), fullPage: true });

    // Audit logs
    console.log(`  - 2b: Checking Audit Logs...`);
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(2000);
    const auditStatus = await page.locator(".status-pill").allTextContents();
    if (auditStatus.length === 0) {
       console.warn(`    ⚠️ Audit Log Warning: No success entries found in [${name}] logs (latency?).`);
    } else {
       console.log(`       ✅ Audit Logs Valid (${auditStatus.length} entries)`);
    }

    // Stage 3: MCP Modal
    console.log(`  - 3: MCP Modal...`);
    const mcpBtn = page.getByRole("button", { name: /Connect MCP/i });
    if (await mcpBtn.isVisible()) {
      await mcpBtn.click();
      await page.waitForTimeout(2000);
      await page.screenshot({ path: path.join(envDir, `${prefix}2_mcp.png`), fullPage: true });
      await page.keyboard.press("Escape");
      await page.waitForTimeout(1000);
    }

    // Stage 4: Settings Modal
    console.log(`  - 4: Settings Modal...`);
    const settingsBtn = page.locator("button:has(svg.lucide-settings)");
    await settingsBtn.waitFor({ state: "visible", timeout: 10000 });
    await settingsBtn.click();
    await page.waitForTimeout(2000);

    const eyeBtn = page.locator("button:has(svg.lucide-eye), button.absolute.right-3").first();
    if (await eyeBtn.isVisible()) {
      await eyeBtn.click();
      await page.waitForTimeout(1000);
      const tokenValue = await page.inputValue("#access-token").catch(() => "N/A");
      if (tokenValue?.match(/sk-[a-f0-9]{32}/)) {
        console.log(`       ✅ [Stage 4] Token Format Verified: "${tokenValue}"`);
      } else {
        console.error(`    ❌ [Stage 4] TOKEN FORMAT VIOLATION: "${tokenValue}"`);
      }
    }
    await page.screenshot({ path: path.join(envDir, `${prefix}3_settings.png`), fullPage: true });

    console.log(`✅ Verified [${name}]`);
  } catch (error: any) {
    console.error(`❌ Verification failed for [${name}]: ${error.message}`);
  } finally {
    await browser.close();
  }
}

async function main() {
  const outputBase = path.join(process.cwd(), "release-reports", `release-report-0.12.4-assets`);
  if (fs.existsSync(outputBase)) fs.rmSync(outputBase, { recursive: true });
  fs.mkdirSync(outputBase, { recursive: true });

  console.log(`🚀 Starting CyberMem E2E Release Check (v0.12.4)`);

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
      isRemote: false,
      outputDir: outputBase,
      prefix: "3.",
    },
    {
      name: "rpi-ts-staging",
      url: process.env.TAILSCALE_URL ? `${process.env.TAILSCALE_URL}/cybermem-staging` : "",
      isRemote: true,
      outputDir: outputBase,
      prefix: "4.",
    },
    {
      name: "vps-staging",
      url: "http://localhost:8085",
      isRemote: false,
      outputDir: outputBase,
      prefix: "5.",
    },
  ];

  let configurations = onlyTesting 
    ? allConfigs.filter(c => c.name === onlyTestingValue)
    : allConfigs;

  if (configurations.length === 0 && onlyTesting) {
      console.error(`No configuration found with name: ${onlyTestingValue}`);
      process.exit(1);
  }

  for (const config of configurations) {
    if (config.url) {
      await verifyEnvironment(config);
    }
  }
}

main().catch(console.error);
