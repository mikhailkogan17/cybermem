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

// MCP JSON-RPC helper using Node fetch (handles SSE responses from FastMCP)
async function mcpRpc(
  method: string,
  params: any = {},
  id: number | null = 1,
  sessionId?: string,
  clientName: string = "antigravity-client",
): Promise<{ body: any; status: number; sessionId?: string }> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json, text/event-stream",
    "X-Client-Name": clientName,
  };
  if (!isLocalhost && CYBERMEM_TOKEN) {
    headers["X-API-Key"] = CYBERMEM_TOKEN;
  }
  if (sessionId) headers["Mcp-Session-Id"] = sessionId;

  const payload: any = { jsonrpc: "2.0", method, params: params || {} };
  if (id !== null) payload.id = id;

  const resp = await fetch(`${MCP_API_URL}/mcp`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  const newSessionId = resp.headers.get("mcp-session-id") || sessionId;
  const contentType = resp.headers.get("content-type") || "";

  // For notifications (no id), the server returns 202 with no body
  if (id === null || resp.status === 202) {
    return { body: {}, status: resp.status, sessionId: newSessionId };
  }

  // If JSON, parse directly
  if (contentType.includes("application/json")) {
    const body = await resp.json();
    return { body, status: resp.status, sessionId: newSessionId };
  }

  // If SSE, parse data lines from the stream
  if (contentType.includes("text/event-stream")) {
    const reader = resp.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let result: any = null;

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6).trim();
            if (data) {
              try {
                const parsed = JSON.parse(data);
                // Take the first response that matches our request id
                if (parsed.id === id || !result) {
                  result = parsed;
                }
              } catch {
                /* continuation frame */
              }
            }
          }
        }

        // Once we have a result, stop reading
        if (result) {
          reader.cancel().catch(() => {});
          break;
        }
      }
    } catch {
      // Stream ended or was cancelled
    }

    if (!result) {
      throw new Error(`No SSE data received for method=${method}`);
    }
    return { body: result, status: resp.status, sessionId: newSessionId };
  }

  // Fallback: try to read as text and parse as JSON
  const text = await resp.text();
  try {
    return {
      body: JSON.parse(text),
      status: resp.status,
      sessionId: newSessionId,
    };
  } catch {
    throw new Error(
      `Failed to parse MCP response for method=${method}: ${text.slice(
        0,
        200,
      )}`,
    );
  }
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
        "initialize",
        {
          protocolVersion: "2024-11-05",
          capabilities: {},
          clientInfo: { name: TEST_CLIENT, version: "1.0.0" },
        },
        1,
        undefined,
        TEST_CLIENT,
      );
      expect(initRes.status).toBe(200);
      sessionId = initRes.sessionId;
      console.log(`   Session ID: ${sessionId}`);

      // Send initialized notification
      await mcpRpc(
        "notifications/initialized",
        {},
        null,
        sessionId,
        TEST_CLIENT,
      );
    });

    // Step 2: Trigger MCP Write via JSON-RPC
    await test.step("📤 CRUD — POST /mcp — Create new memory", async () => {
      console.log("📤 POST /mcp (JSON-RPC: tools/call add_memory)");

      let rpcRes: any;
      for (let i = 0; i < 3; i++) {
        rpcRes = await mcpRpc(
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
          TEST_CLIENT,
        );
        if (rpcRes.status === 200 && !rpcRes.body.result?.isError) break;
        console.log(`   ⚠️ Attempt ${i + 1} failed, retrying...`);
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      console.log(`   Status: ${rpcRes.status}`);
      console.log(`   Response: ${JSON.stringify(rpcRes.body, null, 2)}`);

      expect(rpcRes.status).toBe(200);
      expect(
        rpcRes.body.result,
        `RPC response result missing. Body: ${JSON.stringify(rpcRes.body)}`,
      ).toBeDefined();
      expect(rpcRes.body.result.isError).not.toBe(true);

      await testInfo.attach("📝 CRUD — CREATE (RPC)", {
        body: `Endpoint: POST ${RAW_MCP_URL}/mcp\nSession: ${sessionId}\nResponse:\n${JSON.stringify(
          rpcRes.body,
          null,
          2,
        )}`,
        contentType: "text/plain",
      });
    });

    // Step 3: Verify Metrics in Dashboard
    await test.step("📊 Discovery — Metrics Reflect Write Activity", async () => {
      console.log("📊 GET /api/metrics");

      // Use unique URL to avoid caching issues in playwright if any
      const metricsUrl = `${DASHBOARD_URL}/api/metrics?t=${Date.now()}`;
      const metricsResp = await request.get(metricsUrl, {
        headers: { "X-Client-Name": "e2e-api-metrics-check" },
      });
      const data = await metricsResp.json();

      console.log(`   Last Writer: ${data.stats.lastWriter?.name || "N/A"}`);
      console.log(`   Total Requests: ${data.stats.totalRequests}`);
      console.log(
        `   Creates Time Series Length: ${
          data.timeSeries?.creates?.length || 0
        }`,
      );

      // Verify that the dashboard reports the unique E2E test client
      expect(data.stats.lastWriter.name).toContain(TEST_CLIENT);
      expect(data.stats.totalRequests).toBeGreaterThan(0);

      await testInfo.attach("📊 Metrics Snapshot", {
        body: JSON.stringify(data, null, 2),
        contentType: "application/json",
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
      expect(latestLog.tool).toBe("add_memory");

      await testInfo.attach("📋 Audit Log Entry", {
        body: `Found: ${latestLog ? "YES" : "NO"}\nClient: ${
          latestLog?.client
        }\nTool: ${latestLog?.tool}\nStatus: ${latestLog?.status}`,
        contentType: "text/plain",
      });
    });

    console.log("✅ FULL JOURNEY TEST COMPLETE");

    await testInfo.attach("✅ Journey Complete", {
      body: `Test Client: ${TEST_CLIENT}\nContent: ${uniqueContent}\n\nVerified:\n✅ MCP Write (POST /mcp)\n✅ Metrics (GET /api/metrics) — Last Writer confirmed\n✅ Audit Logs (GET /api/audit-logs) — Entry found`,
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
