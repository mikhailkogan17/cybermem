import { expect, test } from "@playwright/test";

const DASHBOARD_URL = process.env.DASHBOARD_URL || "http://localhost:3000";

test.describe("Dashboard:E2E:UI (Strict Mock)", () => {
  test.use({
    baseURL: DASHBOARD_URL,
    extraHTTPHeaders: { "X-Client-Name": "mocked-ui-test" },
  });

  const MOCK_IDENTITY = "Claude Desktop";
  const MOCK_API_KEY = "sk-mock-key-12345";

  // Mock Data Objects
  const MOCK_METRICS = {
    total_memories: 1337,
    total_vectors: 1337,
    queries_count: 50,
    client_stats: { created: 10, read: 40 },
    last_writer: MOCK_IDENTITY,
    top_writer: MOCK_IDENTITY,
  };

  const MOCK_LOGS = {
    logs: [
      {
        id: 1,
        action: "create",
        status: "success",
        timestamp: new Date().toISOString(),
        details: {},
      },
      {
        id: 2,
        action: "query",
        status: "success",
        timestamp: new Date().toISOString(),
        details: {},
      },
    ],
    total: 2,
    page: 1,
    limit: 10,
  };

  const MOCK_SETTINGS = {
    isManaged: true,
    instanceType: "local",
    endpoint: "http://localhost:8626/mcp",
    apiKey: MOCK_API_KEY,
    dashboardVersion: "v0.13.0",
    mcpVersion: "v0.13.0",
    env: "production",
  };

  const MOCK_CHARTS = {
    creates: [{ time: Math.floor(Date.now() / 1000), "Claude Desktop": 5 }],
    reads: [{ time: Math.floor(Date.now() / 1000), "Claude Desktop": 10 }],
    updates: [{ time: Math.floor(Date.now() / 1000), "Claude Desktop": 2 }],
    deletes: [{ time: Math.floor(Date.now() / 1000), "Claude Desktop": 0 }],
    metadata: {
      defaults: {
        "Claude Desktop": { color: "#d97757", name: "Claude Desktop" },
      },
    },
  };

  test.beforeEach(async ({ page }) => {
    // 1. Mock Metrics (Identity Check)
    await page.route("**/api/metrics", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_METRICS),
      });
    });

    // 2. Mock Logs (Not Empty, Success)
    await page.route("**/api/audit-logs*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_LOGS),
      });
    });

    // 3. Mock Settings (Key Consistency)
    await page.route("**/api/settings", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_SETTINGS),
      });
    });

    // 4. Mock Charts (via metrics period param)
    await page.route("**/api/metrics?period=*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ...MOCK_METRICS,
          timeSeries: MOCK_CHARTS,
        }),
      });
    });
  });

  test("1. Identity Verification (Top/Last Writer)", async ({ page }) => {
    await page.goto("/");
    // "Last Writer: Claude Desktop"
    await expect(page.getByText("Last Writer")).toBeVisible();
    await expect(page.getByText(MOCK_IDENTITY).first()).toBeVisible();
  });

  test("2. Audit Logs Verification", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("table")).toBeVisible();
    // Check for "success" badge
    await expect(page.getByText("success").first()).toBeVisible();
    // Check not empty (rows exist)
    const rows = page.locator("tbody tr");
    await expect(rows).toHaveCount(2);
  });

  test("3. Time Series Charts Verification", async ({ page }) => {
    await page.goto("/");
    // Charts for Creates, Reads, Updates, Deletes
    const charts = ["Creates", "Reads", "Updates", "Deletes"];
    for (const title of charts) {
      await expect(page.getByText(title, { exact: true })).toBeVisible();
      // Check if chart container has data (not empty state)
    }
  });

  test("4. MCP Modal Verification", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("mcp-button").click();

    // Select logic might be needed if it defaults to empty.
    // Assuming "Claude Desktop" is one of the options or default.
    // We verify the JSON contains correct Identity if visible in config code block.
    // If the Modal generates config based on User Agent or logic, we check consistency.

    // Expect Modal
    await expect(page.getByText("Integrate MCP Client")).toBeVisible();

    // TODO: Select Claude Desktop if not selected
    // Verify JSON content in code block matches expectations.
    // e.g., "cybermem-mcp"
  });

  test("5. Settings Modal Verification (Strict Key)", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("settings-button").click();

    // Check input value (hidden by default)
    const input = page.locator("input#access-token");
    await expect(input).toHaveValue(MOCK_API_KEY);

    // Unhide
    await page.getByTestId("toggle-visibility").click();
    await expect(input).toHaveAttribute("type", "text");
  });
});
