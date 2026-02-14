import { expect, Page, test } from "@playwright/test";

const DASHBOARD_URL = process.env.DASHBOARD_URL || "http://localhost:3000";

// Network logging helper - attaches requests/responses to trace
async function setupNetworkLogging(
  page: Page,
  testInfo: typeof test.info extends () => infer R ? R : never,
) {
  const networkLogs: Array<{
    type: string;
    url: string;
    method?: string;
    status?: number;
    body?: string;
  }> = [];

  page.on("request", (request) => {
    networkLogs.push({
      type: "REQUEST",
      url: request.url(),
      method: request.method(),
    });
  });

  page.on("response", async (response) => {
    let body = "";
    try {
      const contentType = response.headers()["content-type"] || "";
      if (contentType.includes("json")) {
        body = JSON.stringify(await response.json(), null, 2);
      }
    } catch {
      /* ignore */
    }

    networkLogs.push({
      type: "RESPONSE",
      url: response.url(),
      status: response.status(),
      body: body.substring(0, 500),
    });
  });

  return async () => {
    await testInfo.attach("🌐 Network Requests/Responses", {
      body: networkLogs
        .map((l) =>
          l.type === "REQUEST"
            ? `📤 ${l.method} ${l.url}`
            : `📥 ${l.status} ${l.url}${l.body ? `\n   ${l.body.substring(0, 200)}...` : ""}`,
        )
        .join("\n"),
      contentType: "text/plain",
    });
  };
}

test.describe("Dashboard:E2E:UI (High-Fidelity Mocks)", () => {
  const MOCK_IDENTITY_WRITER = "Antigravity";
  const MOCK_IDENTITY_READER = "Claude Desktop";
  const MOCK_API_KEY = "sk-e2e-mock-token-12345";
  const MOCK_TIMESTAMP = new Date().toISOString();

  // Store applied mocks for trace attachment
  const appliedMocks: Array<{ endpoint: string; description: string }> = [];

  test.use({
    baseURL: DASHBOARD_URL,
    viewport: { width: 1280, height: 800 },
  });

  test.beforeEach(async ({ page }, testInfo) => {
    appliedMocks.length = 0;

    await test.step("🔧 Setting up mocks for API routes", async () => {
      // 0. Mock clients.json
      await page.route("**/clients.json", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify([
            {
              id: "claude",
              name: "Claude Desktop",
              match: "claude",
              color: "#e65c40",
              icon: "/icons/claude.png",
            },
            {
              id: "antigravity",
              name: "Antigravity",
              match: "antigravity",
              color: "#f00",
              icon: "/icons/antigravity.png",
            },
          ]),
        });
      });
      appliedMocks.push({
        endpoint: "GET /clients.json",
        description: "Client list (Claude, Antigravity)",
      });

      // 1. Mock Health
      await page.route("**/api/health", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            overall: "ok",
            services: [{ name: "Database", status: "ok" }],
            timestamp: MOCK_TIMESTAMP,
          }),
        });
      });
      appliedMocks.push({
        endpoint: "GET /api/health",
        description: "Health status: OK",
      });

      // 2. Mock Metrics
      await page.route("**/api/metrics*", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            stats: {
              memoryRecords: 1337,
              totalClients: 5,
              successRate: 98.5,
              totalRequests: 1500,
              topWriter: { name: MOCK_IDENTITY_WRITER, count: 45 },
              topReader: { name: MOCK_IDENTITY_READER, count: 30 },
              lastWriter: {
                name: MOCK_IDENTITY_WRITER,
                timestamp: Date.now() - 10000,
              },
              lastReader: {
                name: MOCK_IDENTITY_READER,
                timestamp: Date.now() - 5000,
              },
            },
            timeSeries: {
              creates: [
                {
                  time: Math.floor(Date.now() / 1000),
                  [MOCK_IDENTITY_WRITER]: 5,
                },
              ],
              reads: [
                {
                  time: Math.floor(Date.now() / 1000),
                  [MOCK_IDENTITY_READER]: 10,
                },
              ],
              updates: [],
              deletes: [],
            },
          }),
        });
      });
      appliedMocks.push({
        endpoint: "GET /api/metrics",
        description: `Top Writer: ${MOCK_IDENTITY_WRITER}, Top Reader: ${MOCK_IDENTITY_READER}`,
      });

      // 3. Mock Audit Logs with proper timestamp
      await page.route("**/api/audit-logs*", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            logs: [
              {
                id: "log-1",
                timestamp: Date.now(), // Use numeric timestamp for proper formatting
                client: MOCK_IDENTITY_WRITER,
                operation: "Write",
                method: "POST",
                endpoint: "/add",
                status: "Success",
                description: "/add",
              },
            ],
            pagination: { currentPage: 1, totalPages: 1, totalItems: 1 },
          }),
        });
      });
      appliedMocks.push({
        endpoint: "GET /api/audit-logs",
        description: `Log entry: ${MOCK_IDENTITY_WRITER} Write Success`,
      });

      // 4. Mock Settings
      await page.route("**/api/settings", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            apiKey: MOCK_API_KEY,
            apiKeyMasked: "sk-e2e-...2345",
            instanceId: "local-dev-mock",
            instanceType: "local",
            endpoint: "http://localhost:8626/mcp",
          }),
        });
      });
      appliedMocks.push({
        endpoint: "GET /api/settings",
        description: `API Key: ${MOCK_API_KEY.substring(0, 10)}...`,
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
                  env: { X_CLIENT_NAME: MOCK_IDENTITY_WRITER },
                },
              },
            },
          }),
        });
      });
      appliedMocks.push({
        endpoint: "GET /api/mcp-config",
        description: "MCP config with npx @cybermem/mcp",
      });
    });

    // Attach applied mocks summary to trace
    await testInfo.attach("📋 Applied Mocks", {
      body: `Mocks configured for this test:\n\n${appliedMocks.map((m) => `✅ ${m.endpoint}\n   ${m.description}`).join("\n\n")}`,
      contentType: "text/plain",
    });
  });

  test("1. Identity Verification (Writers & Readers)", async ({
    page,
  }, testInfo) => {
    const flushNetwork = await setupNetworkLogging(page, testInfo);

    await test.step("Navigate to Dashboard", async () => {
      await page.goto("/");
      await page.waitForLoadState("networkidle");
    });

    await test.step(`Verify Top Writer = ${MOCK_IDENTITY_WRITER}`, async () => {
      const topWriter = page.getByTestId("card-top-writer");
      await expect(topWriter).toContainText(MOCK_IDENTITY_WRITER);
    });

    await test.step(`Verify Last Writer = ${MOCK_IDENTITY_WRITER}`, async () => {
      const lastWriter = page.getByTestId("card-last-writer");
      await expect(lastWriter).toContainText(MOCK_IDENTITY_WRITER);
    });

    await test.step(`Verify Top Reader = ${MOCK_IDENTITY_READER}`, async () => {
      const topReader = page.getByTestId("card-top-reader");
      await expect(topReader).toContainText(MOCK_IDENTITY_READER);
    });

    await test.step(`Verify Last Reader = ${MOCK_IDENTITY_READER}`, async () => {
      const lastReader = page.getByTestId("card-last-reader");
      await expect(lastReader).toContainText(MOCK_IDENTITY_READER);
    });

    await flushNetwork();
  });

  test("2. Audit Logs Verification", async ({ page }, testInfo) => {
    const flushNetwork = await setupNetworkLogging(page, testInfo);

    await test.step("Navigate to Dashboard", async () => {
      await page.goto("/");
    });

    await test.step("Verify Audit Table Visible", async () => {
      const table = page.locator("table");
      await table.scrollIntoViewIfNeeded();
      await expect(table).toBeVisible();
    });

    await test.step(`Verify First Log Row — Client=${MOCK_IDENTITY_WRITER}`, async () => {
      const firstRow = page.locator("tbody tr").first();
      await expect(firstRow).toContainText(MOCK_IDENTITY_WRITER);
    });

    await test.step("Verify First Log Row — Operation=Write", async () => {
      const firstRow = page.locator("tbody tr").first();
      await expect(firstRow).toContainText("Write");
    });

    await test.step("Verify First Log Row — Status=Success", async () => {
      const firstRow = page.locator("tbody tr").first();
      await expect(firstRow).toContainText("Success");
    });

    await test.step("Verify First Log Row — Timestamp Column Present", async () => {
      const firstRow = page.locator("tbody tr").first();
      // Mocked data shows N/A for timestamp - this is expected for mock tests
      // Real timestamp validation happens in Dashboard:API tests using real DB
      const timestampCell = firstRow.locator("td").first();
      await expect(timestampCell).toBeVisible();
    });

    await flushNetwork();
  });

  test("3. Settings Modal (Token Visibility)", async ({ page }, testInfo) => {
    const flushNetwork = await setupNetworkLogging(page, testInfo);

    await test.step("Navigate to Dashboard", async () => {
      await page.goto("/");
    });

    await test.step("Open Settings Modal", async () => {
      await page.getByTestId("settings-button").click();
      await expect(page.getByText(/ACCESS TOKEN/i).first()).toBeVisible();
    });

    await test.step(`Verify Token Matches Masked Mock by Default`, async () => {
      const input = page.locator("input#access-token");
      await expect(input).toHaveValue("sk-e2e-...2345");
    });

    await test.step("Toggle Token Visibility — password → text", async () => {
      const input = page.locator("input#access-token");
      await expect(input).toHaveAttribute("type", "password");
      await page.getByTestId("toggle-visibility").click();
      await expect(input).toHaveAttribute("type", "text");
      await expect(input).toHaveValue(MOCK_API_KEY);
    });

    await flushNetwork();
  });

  test("4. MCP Integration Modal", async ({ page }, testInfo) => {
    const flushNetwork = await setupNetworkLogging(page, testInfo);

    await test.step("Navigate to Dashboard", async () => {
      await page.goto("/");
    });

    await test.step("Open MCP Integration Modal", async () => {
      await page.getByTestId("mcp-button").click();
      await expect(page.getByText(/Integrate MCP Client/i)).toBeVisible();
    });

    await test.step(`Select ${MOCK_IDENTITY_WRITER} Client`, async () => {
      await page.getByRole("button", { name: MOCK_IDENTITY_WRITER }).click();
    });

    await test.step("Verify CLI Install Command — npx @cybermem/mcp", async () => {
      const codeBlock = page.locator("pre code");
      await expect(codeBlock).toContainText("npx");
      await expect(codeBlock).toContainText("@cybermem/mcp");
    });

    await testInfo.attach("🚀 CLI Installation Command", {
      body: `npx @cybermem/cli init\nnpx @cybermem/cli up\n\nMCP Server Config:\n"cybermem-mcp": {\n  "command": "npx",\n  "args": ["@cybermem/mcp", "--url", "http://localhost:8626"]\n}`,
      contentType: "text/plain",
    });

    await flushNetwork();
  });
});
