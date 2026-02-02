import { expect, test } from "@playwright/test";

const DASHBOARD_URL = process.env.DASHBOARD_URL || "http://localhost:3000";

test.describe("Dashboard:E2E:UI (Strict Mock)", () => {
  test.use({
    baseURL: DASHBOARD_URL,
    extraHTTPHeaders: { "X-Client-Name": "mocked-ui-test" },
  });

  const MOCK_IDENTITY = "antigravity-client";
  const MOCK_API_KEY = "sk-e2e-mock-token-12345";

  // Mock Data Objects (Production Schema)
  const MOCK_METRICS = {
    stats: {
      memoryRecords: 1337,
      totalClients: 5,
      successRate: 98.5,
      totalRequests: 1500,
      topWriter: { name: MOCK_IDENTITY, count: 45 },
      topReader: { name: "Claude", count: 30 },
      lastWriter: { name: MOCK_IDENTITY, timestamp: Date.now() - 10000 },
      lastReader: { name: "Claude", timestamp: Date.now() - 5000 },
    },
    sparklines: {
      memoryRecords: [1300, 1310, 1330, 1337],
      totalClients: [4, 5, 5, 5],
      successRate: [95, 96, 98, 98.5],
      totalRequests: [1400, 1450, 1480, 1500],
    },
    timeSeries: {
      creates: Array.from({ length: 12 }).map((_, i) => ({
        time: Math.floor((Date.now() - (12 - i) * 3600000) / 1000),
        [MOCK_IDENTITY]: Math.floor(Math.random() * 10),
        Claude: Math.floor(Math.random() * 5),
      })),
      reads: Array.from({ length: 12 }).map((_, i) => ({
        time: Math.floor((Date.now() - (12 - i) * 3600000) / 1000),
        [MOCK_IDENTITY]: Math.floor(Math.random() * 20),
        Claude: Math.floor(Math.random() * 30),
      })),
      updates: Array.from({ length: 12 }).map((_, i) => ({
        time: Math.floor((Date.now() - (12 - i) * 3600000) / 1000),
        [MOCK_IDENTITY]: Math.floor(Math.random() * 5),
      })),
      deletes: Array.from({ length: 12 }).map((_, i) => ({
        time: Math.floor((Date.now() - (12 - i) * 3600000) / 1000),
        Claude: Math.floor(Math.random() * 2),
      })),
    },
    metadata: {
      [MOCK_IDENTITY]: { name: "Antigravity", icon: "/icons/antigravity.png" },
      Claude: { name: "Claude", icon: "/icons/claude.png" },
    },
  };

  const MOCK_LOGS = {
    logs: [
      {
        id: "1",
        timestamp: new Date().toISOString(),
        client: MOCK_IDENTITY,
        operation: "create",
        method: "POST",
        endpoint: "/add",
        rawStatus: "200",
        status: "Success",
      },
      {
        id: "2",
        timestamp: new Date(Date.now() - 60000).toISOString(),
        client: "Claude",
        operation: "read",
        method: "POST",
        endpoint: "/query",
        rawStatus: "200",
        status: "Success",
      },
    ],
    pagination: { currentPage: 1, totalPages: 1, totalItems: 2 },
  };

  const MOCK_SETTINGS = {
    apiKey: MOCK_API_KEY,
    instanceId: "local-dev-mock",
    isManaged: true,
    instanceType: "local",
    endpoint: "http://localhost:8626/mcp",
    dashboardVersion: "v0.13.0",
    env: "production",
  };

  test.beforeEach(async ({ page }) => {
    // 1. Mock Health (Online)
    await page.route("**/api/health", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          overall: "ok",
          services: [
            { name: "Database", status: "ok" },
            { name: "CyberMem (MCP) API", status: "ok", latencyMs: 30 },
          ],
          timestamp: new Date().toISOString(),
        }),
      });
    });

    // 2. Mock Metrics (Root & Period)
    await page.route("**/api/metrics*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_METRICS),
      });
    });

    // 3. Mock Logs
    await page.route("**/api/audit-logs*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_LOGS),
      });
    });

    // 4. Mock Settings
    await page.route("**/api/settings", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_SETTINGS),
      });
    });

    // 5. Mock MCP Config
    await page.route("**/api/mcp-config*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          configType: "json",
          config: {
            mcpServers: {
              "cybermem-mcp": {
                command: "npx",
                args: ["@cybermem/mcp", "--url", "http://localhost:8626"],
                env: {
                  X_CLIENT_NAME: "antigravity-client",
                },
              },
            },
          },
        }),
      });
    });
  });

  test("1. Identity Verification (Top/Last Writer)", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Last Writer")).toBeVisible();
    await expect(page.getByText("Antigravity").first()).toBeVisible();
    await page.screenshot({
      path: "release-reports/assets/local/1_dashboard.png",
    });
  });

  test("2. Audit Logs Verification", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("table")).toBeVisible();
    await expect(page.getByText("Success").first()).toBeVisible();
    const rows = page.locator("tbody tr");
    await expect(rows).toHaveCount(2);
    // Modal check or scroll if needed? No, just screenshot
    await page.screenshot({
      path: "release-reports/assets/local/2_audit_logs.png",
    });
  });

  test("3. Time Series Charts Verification", async ({ page }) => {
    await page.goto("/");
    const charts = ["Creates", "Reads", "Updates", "Deletes"];
    for (const title of charts) {
      await expect(page.getByText(`${title} by Client`)).toBeVisible();
    }
    await expect(page.locator(".recharts-surface").first()).toBeVisible();
    await page.screenshot({
      path: "release-reports/assets/local/3_charts.png",
    });
  });

  test("4. MCP Modal Verification", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("mcp-button").click();
    await expect(page.getByText("Integrate MCP Client")).toBeVisible();

    // Wait for config loading (even from mock)
    await page.waitForTimeout(1000);

    // Check for identity in the code block
    const codeBlock = page.locator("pre code");
    await expect(codeBlock).toBeVisible();
    await expect(codeBlock).toContainText("antigravity-client");
  });

  test("5. Settings Modal Verification (Strict Key)", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("settings-button").click();

    const input = page.locator("input#access-token");
    // Initially hidden/password type usually, but we check value
    await expect(input).toHaveValue(MOCK_API_KEY);

    // Toggle visibility
    await page.getByTestId("toggle-visibility").click();
    await expect(input).toHaveAttribute("type", "text");
  });
});
