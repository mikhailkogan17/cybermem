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
      topReader: { name: "claude", count: 30 },
      lastWriter: { name: MOCK_IDENTITY, timestamp: Date.now() - 10000 },
      lastReader: { name: "claude", timestamp: Date.now() - 5000 },
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
        [MOCK_IDENTITY]: 5,
        claude: 2,
      })),
      reads: Array.from({ length: 12 }).map((_, i) => ({
        time: Math.floor((Date.now() - (12 - i) * 3600000) / 1000),
        [MOCK_IDENTITY]: 10,
        claude: 15,
      })),
      updates: Array.from({ length: 12 }).map((_, i) => ({
        time: Math.floor((Date.now() - (12 - i) * 3600000) / 1000),
        [MOCK_IDENTITY]: 3,
        claude: 1,
      })),
      deletes: Array.from({ length: 12 }).map((_, i) => ({
        time: Math.floor((Date.now() - (12 - i) * 3600000) / 1000),
        claude: 1,
      })),
    },
    metadata: {
      [MOCK_IDENTITY]: { name: "Antigravity", icon: "/icons/antigravity.png" },
      claude: { name: "Claude", icon: "/icons/claude.png" },
    },
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
    // 0. Mock clients.json
    await page.route("**/clients.json", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          {
            id: MOCK_IDENTITY,
            name: "Antigravity",
            match: "antigravity",
            color: "#e65c40",
            icon: "/icons/antigravity.png",
          },
          {
            id: "claude",
            name: "Claude",
            match: "claude",
            color: "#d97757",
            icon: "/icons/claude.png",
          },
        ]),
      });
    });

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

    // 3. Mock Logs (Align with Metrics for consistency)
    const MOCK_LOGS = {
      logs: [
        {
          id: "log-1",
          timestamp: new Date().toISOString(),
          client: MOCK_IDENTITY,
          operation: "create",
          method: "POST",
          endpoint: "/add",
          rawStatus: "200",
          status: "Success",
        },
        {
          id: "log-2",
          timestamp: new Date(Date.now() - 60000).toISOString(),
          client: "claude",
          operation: "read",
          method: "POST",
          endpoint: "/query",
          rawStatus: "200",
          status: "Success",
        },
      ],
      pagination: { currentPage: 1, totalPages: 1, totalItems: 2 },
    };

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
                  X_CLIENT_NAME: MOCK_IDENTITY,
                },
              },
            },
          },
        }),
      });
    });
  });

  test("1. Identity Verification (Top/Last Metrics)", async ({ page }) => {
    await page.goto("/");

    // Writers
    await expect(page.getByText("Top Writer")).toBeVisible();
    await expect(page.getByText("Antigravity").first()).toBeVisible();
    await expect(page.getByText("Last Writer")).toBeVisible();
    await expect(page.getByText("Antigravity").last()).toBeVisible();

    // Readers
    await expect(page.getByText("Top Reader")).toBeVisible();
    await expect(page.getByText("Claude").first()).toBeVisible();
    await expect(page.getByText("Last Reader")).toBeVisible();
    await expect(page.getByText("Claude").last()).toBeVisible();

    await page.screenshot({
      path: "release-reports/assets/local/1_dashboard.png",
    });
  });

  test("2. Audit Logs Verification (Row Precision)", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("table")).toBeVisible();

    // Check first row (Antigravity create)
    const firstRow = page.locator("tbody tr").first();
    await expect(firstRow).toContainText("Antigravity");
    await expect(firstRow).toContainText("Write");
    await expect(firstRow).toContainText("POST /add");
    await expect(firstRow).toContainText("Success");

    // Check second row (Claude read)
    const secondRow = page.locator("tbody tr").nth(1);
    await expect(secondRow).toContainText("Claude");
    await expect(secondRow).toContainText("Read");
    await expect(secondRow).toContainText("POST /query");
    await expect(secondRow).toContainText("Success");

    await page.screenshot({
      path: "release-reports/assets/local/2_audit_logs.png",
    });
  });

  test("3. Time Series Charts Verification (All 4)", async ({ page }) => {
    await page.goto("/");
    // Wait for data to load
    await page.waitForLoadState("networkidle");

    const charts = ["Creates", "Reads", "Updates", "Deletes"];
    for (const title of charts) {
      const card = page
        .locator(".card")
        .filter({ hasText: `${title} by Client` });
      await expect(card).toBeVisible();

      // 1. Ensure "No data" fallback is NOT visible.
      // This proves data reached the component and it's attempting to render a chart.
      await expect(card.getByText("No data for this period")).not.toBeVisible();
    }
    await page.screenshot({
      path: "release-reports/assets/local/3_charts.png",
    });
  });

  test("4. MCP Modal Verification (Exact JSON)", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("mcp-button").click();
    await expect(page.getByText("Integrate MCP Client")).toBeVisible();

    await page.waitForTimeout(1000);

    const codeBlock = page.locator("pre code");
    await expect(codeBlock).toBeVisible();
    const content = await codeBlock.innerText();

    // Verify JSON structure and key values
    const parsed = JSON.parse(content);
    expect(parsed.mcpServers["cybermem-mcp"].command).toBe("npx");
    expect(parsed.mcpServers["cybermem-mcp"].env.X_CLIENT_NAME).toBe(
      MOCK_IDENTITY,
    );

    await page.screenshot({
      path: "release-reports/assets/local/4_mcp_modal.png",
    });
  });

  test("5. Settings Modal Verification (Strict Token)", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("settings-button").click();

    const input = page.locator("input#access-token");
    // Verify exact token value from mock
    await expect(input).toHaveValue(MOCK_API_KEY);

    // Toggle and check visibility
    await page.getByTestId("toggle-visibility").click();
    await expect(input).toHaveAttribute("type", "text");
    await page.screenshot({
      path: "release-reports/assets/local/5_settings_modal.png",
    });
  });
});
