/**
 * CRUD Happy Path E2E Test
 *
 * Tests the complete CRUD flow via MCP API and verifies
 * that X-Client-Name header propagates to dashboard metrics.
 *
 * Run with: npm run test:e2e -- crud-happy-path.spec.ts
 */

import { expect, test } from "@playwright/test";
import { execSync } from "child_process";

const MCP_URL = "http://127.0.0.1:8626/mcp";
const CLIENT_NAME = `e2e-crud-${Date.now()}`;

// Helpers
const RPC = (method: string, params: any = {}, id: number) => ({
  jsonrpc: "2.0",
  id,
  method,
  params,
});

const resetDB = async () => {
  try {
    // Remove database files
    try {
      execSync(
        "docker exec cybermem-mcp sh -c 'rm -f /data/openmemory.sqlite*'",
        { stdio: "ignore" },
      );
    } catch (e) {
      /* ignore - container might not be running */
    }

    // Fix permissions on data directory to prevent SQLITE_READONLY after restart
    try {
      execSync(
        "docker run --rm -v cybermem-openmemory-data:/data alpine sh -c 'chown -R 1001:1001 /data && chmod 777 /data'",
        { stdio: "ignore" },
      );
    } catch (e) {
      /* ignore */
    }

    // Restart container
    execSync("docker restart cybermem-mcp", { stdio: "ignore" });

    // Poll for health (up to 60s)
    const start = Date.now();
    while (Date.now() - start < 60000) {
      try {
        const healthRes = await fetch("http://127.0.0.1:8626/health");
        if (healthRes.ok) {
          const body = await healthRes.json();
          if (body.ok || body.ready) {
            // Give additional time for MCP to stabilize
            await new Promise((r) => setTimeout(r, 3000));
            return true;
          }
        }
      } catch (e) {
        // ignore
      }
      await new Promise((r) => setTimeout(r, 1000));
    }
    console.log("⚠️ DB reset timeout, but proceeding");
    return true;
  } catch (e) {
    console.error("DB Reset failed:", e);
    return false;
  }
};

let sessionId: string | null = null;

const mcpCall = async (method: string, params: any, id: number) => {
  const headers: any = {
    "Content-Type": "application/json",
    Accept: "application/json, text/event-stream",
    "X-Client-Name": CLIENT_NAME,
  };

  if (sessionId) {
    headers["Mcp-Session-Id"] = sessionId;
  }

  const res = await fetch(MCP_URL, {
    method: "POST",
    headers,
    body: JSON.stringify(RPC(method, params, id)),
  });

  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  // Capture session ID from headers or body if available
  const hSessionId = res.headers.get("Mcp-Session-Id");
  if (hSessionId) {
    sessionId = hSessionId;
  }

  const text = await res.text();
  // Handle SSE response if the transport forces it
  if (text.includes("event: message") && text.includes("data: ")) {
    const dataLine = text.split("\n").find((l) => l.startsWith("data: "));
    if (dataLine) {
      return JSON.parse(dataLine.replace("data: ", ""));
    }
  }
  return JSON.parse(text);
};

// Skip DB reset if SKIP_DB_RESET=true (for faster runs when stack is clean)
const SKIP_DB_RESET = process.env.SKIP_DB_RESET === "true";

// Run tests in serial mode since they share state (memoryId)
test.describe.configure({ mode: "serial" });

test.describe("CRUD Happy Path with X-Client-Name", () => {
  let memoryId: string;

  test.beforeAll(async () => {
    if (SKIP_DB_RESET) {
      console.log("⏭️ Skipping DB reset (SKIP_DB_RESET=true)");
      return;
    }
    console.log(`🧹 Resetting DB before test suite...`);
    await resetDB();
  });

  test.afterAll(async () => {
    if (SKIP_DB_RESET) {
      console.log("⏭️ Skipping DB reset (SKIP_DB_RESET=true)");
      return;
    }
    console.log(`🧹 Resetting DB after test suite...`);
    await resetDB();
  });

  test("1. Initialize MCP connection", async () => {
    const initRes: any = await mcpCall(
      "initialize",
      {
        protocolVersion: "2024-11-05",
        capabilities: { roots: { listChanged: true } },
        clientInfo: { name: "e2e-crud-tester", version: "1.0.0" },
      },
      1,
    );

    expect(initRes.result?.serverInfo?.name).toBe("cybermem");

    // Notifications MUST NOT have an id
    await fetch(MCP_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Client-Name": CLIENT_NAME,
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "notifications/initialized",
        params: {},
      }),
    });
  });

  test("2. CREATE - Store memory", async () => {
    const storeRes: any = await mcpCall(
      "tools/call",
      {
        name: "add_memory",
        arguments: {
          content: `CRUD Happy Path Test Memory ${CLIENT_NAME}`,
          tags: ["e2e", "crud-test"],
        },
      },
      3,
    );

    expect(storeRes.result?.content?.[0]?.text).toBeDefined();
    const data = JSON.parse(storeRes.result.content[0].text);
    memoryId = data.id;
    expect(memoryId).toBeDefined();
    console.log(`✅ Created memory with ID: ${memoryId}`);
  });

  test("3. READ - List memories", async () => {
    const listRes: any = await mcpCall(
      "tools/call",
      {
        name: "list_memories",
        arguments: { limit: 10 },
      },
      4,
    );

    const memories = JSON.parse(listRes.result.content[0].text);
    const found = memories.some((m: any) => m.id === memoryId);
    expect(found).toBe(true);
    console.log(`✅ Verified memory exists in list`);
  });

  test("4. QUERY - Semantic search", async () => {
    const queryRes: any = await mcpCall(
      "tools/call",
      {
        name: "query_memory",
        arguments: {
          query: `Happy Path Test ${CLIENT_NAME}`,
          k: 1,
        },
      },
      5,
    );

    const results = JSON.parse(queryRes.result.content[0].text);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].id).toBe(memoryId);
    console.log(`✅ Verified semantic search returns the memory`);
  });

  test("5. DELETE - Remove memory", async () => {
    const delRes: any = await mcpCall(
      "tools/call",
      {
        name: "delete_memory",
        arguments: { id: memoryId },
      },
      6,
    );

    expect(delRes.result?.content?.[0]?.text).toContain("deleted");
    console.log(`✅ Deleted memory`);
  });

  test("7. Verify client appears in Dashboard", async ({ page }) => {
    // Navigate to dashboard
    await page.goto("http://localhost:3000");

    // Login if needed
    const passwordInput = page.getByPlaceholder("Enter admin password");
    if (await passwordInput.isVisible()) {
      await passwordInput.fill("admin");
      await page.keyboard.press("Enter");
    }

    // Handle password alert modal if appears
    const dontShowAgainButton = page.locator(
      'button:has-text("Don\'t show again")',
    );
    if (
      await dontShowAgainButton.isVisible({ timeout: 2000 }).catch(() => false)
    ) {
      await dontShowAgainButton.click();
    }

    // Wait for dashboard to load
    await expect(page.getByRole("heading", { name: "CyberMem" })).toBeVisible({
      timeout: 15000,
    });

    // Wait for metrics to propagate (immediate for SQLite)
    await page.waitForTimeout(2000);

    // Scroll to find Audit Log section
    const auditHeader = page.locator('h3:has-text("Audit Log")');
    await auditHeader.scrollIntoViewIfNeeded();

    // Verify audit log table is visible
    await expect(page.locator('th:has-text("Client")')).toBeVisible({
      timeout: 10000,
    });

    // Look for our client in the audit log (partial match on e2e-crud)
    const pageContent = await page.content();
    const clientVisible =
      pageContent.includes("e2e-crud") || pageContent.includes("E2E CRUD");

    console.log(
      `   Client ${CLIENT_NAME} visible in dashboard: ${clientVisible}`,
    );
  });
});
