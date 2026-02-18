import { expect, test } from "@playwright/test";
import { execSync } from "child_process";
import * as path from "path";

// This suite runs against the Next.js API Routes (Backend)
// IMPORTANT: This uses REAL database with clean state!
const DASHBOARD_URL = process.env.DASHBOARD_URL || "http://localhost:3000";
// Normalize MCP URL: strip /mcp suffix to get the base for legacy HTTP endpoints (/add, /query)
const RAW_MCP_URL = process.env.MCP_URL || "http://localhost:8626";
const MCP_API_URL = RAW_MCP_URL.replace(/\/mcp\/?$/, "");

// Tailscale environments require auth token
const isLocalhost =
  DASHBOARD_URL.includes("localhost") || DASHBOARD_URL.includes("127.0.0.1");
const CYBERMEM_TOKEN = process.env.CYBERMEM_TOKEN || "";

// Helper to build headers with optional auth
function getHeaders(clientName: string): Record<string, string> {
  const headers: Record<string, string> = { "X-Client-Name": clientName };
  if (!isLocalhost && CYBERMEM_TOKEN) {
    headers["X-API-Key"] = CYBERMEM_TOKEN;
  }
  return headers;
}

const SQLITE_PATH = path.join(
  process.env.HOME || "",
  ".cybermem",
  "data",
  "openmemory.sqlite",
);

// Helper to run CLI commands
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

// JSON-RPC Helper for MCP
async function mcpRpc(
  request: any,
  method: string,
  params: any = {},
  id: number | null = 1,
  sessionId?: string,
) {
  const headers = getHeaders("antigravity-client");
  headers["Accept"] = "application/json, text/event-stream";
  if (sessionId) headers["Mcp-Session-Id"] = sessionId;

  const resp = await request.post(`${RAW_MCP_URL}/mcp`, {
    data: { jsonrpc: "2.0", id, method, params },
    headers,
  });

  const body = await resp.json();
  const newSessionId = resp.headers()["mcp-session-id"];
  return { body, status: resp.status(), sessionId: newSessionId || sessionId };
}

test.describe("Dashboard:E2E:API (Deep Verification)", () => {
  const TEST_CLIENT = `e2e-api-journey-${Date.now()}`;

  // Note: Reset is handled by global-setup.ts (runs ONCE before all tests)
  test.beforeAll(async ({}, testInfo) => {
    // Attach environment info
    await testInfo.attach("🔧 Test Environment", {
      body: `Dashboard URL: ${DASHBOARD_URL}\nMCP API URL: ${MCP_API_URL}\nSQLite Path: ${SQLITE_PATH}\nTest Client: ${TEST_CLIENT}\n\n✅ Clean state provided by global-setup.ts`,
      contentType: "text/plain",
    });
  });

  test("1. Health Check", async ({ request }, testInfo) => {
    await test.step("📊 GET /api/health — Verify System Status", async () => {
      console.log("📊 GET /api/health");

      const response = await request.get(`${DASHBOARD_URL}/api/health`, {
        headers: getHeaders("antigravity-client"),
      });

      const body = await response.json();
      console.log("   Response:", JSON.stringify(body, null, 2));

      expect(response.status()).toBe(200);
      expect(body.overall).toBe("ok");
      expect(body.services.length).toBeGreaterThan(0);

      await testInfo.attach("📊 Health Check Result", {
        body: `Status: ${response.status()}\nOverall: ${
          body.overall
        }\nServices: ${body.services
          .map((s: any) => `${s.name}: ${s.status}`)
          .join(", ")}`,
        contentType: "text/plain",
      });
    });
  });

  test("2. Full Journey: MCP Write → Metrics → Audit Logs", async ({
    request,
  }, testInfo) => {
    const uniqueContent = `Journey Test ${Date.now()}`;

    console.log("🔄 FULL JOURNEY TEST START");
    console.log(`   Test Client: ${TEST_CLIENT}`);
    console.log(`   Content: ${uniqueContent}`);

    // Step 1: Initialize MCP Session
    let sessionId: string | undefined;

    await test.step("🤝 MCP — Initialize Session", async () => {
      console.log("🤝 JSON-RPC: initialize");
      const initRes = await mcpRpc(
        request,
        "initialize",
        {
          protocolVersion: "2024-11-05",
          capabilities: {},
          clientInfo: { name: TEST_CLIENT, version: "1.0.0" },
        },
        1,
      );
      expect(initRes.status).toBe(200);
      sessionId = initRes.sessionId;
      console.log(`   Session ID: ${sessionId}`);

      // Send initialized notification
      await mcpRpc(request, "notifications/initialized", {}, null, sessionId);
    });

    // Step 2: Trigger MCP Write via JSON-RPC
    await test.step("📤 CRUD — POST /mcp — Create new memory", async () => {
      console.log("📤 POST /mcp (JSON-RPC: tools/call add_memory)");

      const rpcRes = await mcpRpc(
        request,
        "tools/call",
        {
          name: "add_memory",
          arguments: {
            content: uniqueContent,
            tags: ["journey"],
          },
        },
        2,
        sessionId,
      );

      console.log(`   Status: ${rpcRes.status}`);
      console.log(`   Response: ${JSON.stringify(rpcRes.body, null, 2)}`);

      expect(rpcRes.status).toBe(200);
      expect(rpcRes.body.result).toBeDefined();

      await testInfo.attach("📝 CRUD — CREATE (RPC)", {
        body: `Endpoint: POST ${RAW_MCP_URL}/mcp\nSession: ${sessionId}\nResponse:\n${JSON.stringify(
          rpcRes.body,
          null,
          2,
        )}`,
        contentType: "text/plain",
      });
    });

    // Step 2: Verify Metrics
    await test.step("📊 Discovery — Metrics Reflect Write Activity", async () => {
      console.log("📊 GET /api/metrics");

      const resp = await request.get(`${DASHBOARD_URL}/api/metrics`, {
        headers: getHeaders("antigravity-client"),
      });

      const data = await resp.json();
      console.log(`   Last Writer: ${data.stats.lastWriter.name}`);
      console.log(`   Total Requests: ${data.stats.totalRequests}`);
      console.log(
        `   Creates Time Series Length: ${data.timeSeries.creates.length}`,
      );

      expect(data.stats.lastWriter.name).toContain(TEST_CLIENT);
      expect(data.stats.totalRequests).toBeGreaterThan(0);

      await testInfo.attach("📊 Metrics Snapshot", {
        body: `Last Writer: ${data.stats.lastWriter.name}\nTotal Requests: ${data.stats.totalRequests}\nCreates Time Series: ${data.timeSeries.creates.length} entries`,
        contentType: "text/plain",
      });
    });

    // Step 3: Verify Audit Logs
    await test.step("📋 Discovery — Audit Log Contains Journey Entry", async () => {
      console.log("📋 GET /api/audit-logs");

      const resp = await request.get(`${DASHBOARD_URL}/api/audit-logs`, {
        headers: getHeaders("antigravity-client"),
      });

      const data = await resp.json();
      const latestLog = data.logs.find((l: any) =>
        l.client.includes(TEST_CLIENT),
      );
      console.log(`   Found Log: ${latestLog ? "YES" : "NO"}`);
      if (latestLog) {
        console.log(`   Log Details: ${JSON.stringify(latestLog, null, 2)}`);
      }

      expect(latestLog).toBeDefined();
      expect(latestLog.operation).toBe("Write");

      await testInfo.attach("📋 Audit Log Entry", {
        body: `Found: ${latestLog ? "YES" : "NO"}\nClient: ${
          latestLog?.client
        }\nOperation: ${latestLog?.operation}\nStatus: ${latestLog?.status}`,
        contentType: "text/plain",
      });
    });

    console.log("✅ FULL JOURNEY TEST COMPLETE");

    await testInfo.attach("✅ Journey Complete", {
      body: `Test Client: ${TEST_CLIENT}\nContent: ${uniqueContent}\n\nVerified:\n✅ MCP Write (POST /add)\n✅ Metrics (GET /api/metrics) — Last Writer confirmed\n✅ Audit Logs (GET /api/audit-logs) — Entry found`,
      contentType: "text/plain",
    });
  });

  test("3. Config & Settings", async ({ request }, testInfo) => {
    // MCP Config
    await test.step("⚙️ Config — GET /api/mcp-config", async () => {
      console.log("⚙️  GET /api/mcp-config?type=json");

      const configResp = await request.get(
        `${DASHBOARD_URL}/api/mcp-config?type=json`,
        {
          headers: getHeaders("antigravity-client"),
        },
      );

      const config = await configResp.json();
      console.log(`   Config Type: ${config.configType}`);

      expect(configResp.status()).toBe(200);
      expect(config.configType).toBe("json");
      expect(config.config.mcpServers).toBeDefined();

      await testInfo.attach("⚙️ MCP Config", {
        body: `Config Type: ${config.configType}\nmcpServers: ${Object.keys(
          config.config.mcpServers,
        ).join(", ")}`,
        contentType: "text/plain",
      });
    });

    // Settings
    await test.step("⚙️ Settings — GET /api/settings", async () => {
      console.log("⚙️  GET /api/settings");

      const settingsResp = await request.get(`${DASHBOARD_URL}/api/settings`, {
        headers: getHeaders("antigravity-client"),
      });

      const settings = await settingsResp.json();
      console.log(`   Instance Type: ${settings.instanceType}`);
      console.log(`   Endpoint: ${settings.endpoint}`);

      expect(settingsResp.status()).toBe(200);
      expect(settings).toHaveProperty("apiKey");
      expect(settings).toHaveProperty("endpoint");

      await testInfo.attach("⚙️ Settings", {
        body: `Instance Type: ${settings.instanceType}\nEndpoint: ${
          settings.endpoint
        }\nAPI Key: ${
          settings.apiKey ? "***" + settings.apiKey.slice(-4) : "N/A"
        }`,
        contentType: "text/plain",
      });
    });

    await test.step("⚙️ Settings Fallback — Verify tokenSource and Masking", async () => {
      console.log("⚙️  GET /api/settings (Fallback/Auto-gen Verification)");

      const settingsResp = await request.get(`${DASHBOARD_URL}/api/settings`, {
        headers: getHeaders("antigravity-client"),
      });

      const settings = await settingsResp.json();
      console.log(`   Token Source: ${settings.tokenSource}`);

      expect(settingsResp.status()).toBe(200);
      expect(settings).toHaveProperty("tokenSource");
      // Verify apiKeyMasked is masked (not the raw apiKey field)
      if (settings.apiKeyMasked && settings.apiKeyMasked !== "not-set") {
        expect(settings.apiKeyMasked.length).toBeLessThanOrEqual(14); // 7 + 3 + 4 = 14
        expect(settings.apiKeyMasked).toMatch(/^sk-.*\.\.\..*$/);
      }
      // Verify apiKey contains the raw token (for UI copy functionality)
      if (settings.apiKey && settings.apiKey !== "not-set") {
        expect(settings.apiKey).toMatch(/^sk-[a-f0-9]{32}$/);
      }
    });
  });
});
