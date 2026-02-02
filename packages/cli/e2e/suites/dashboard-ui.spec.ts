import { expect, test } from "@playwright/test";

// This suite tests the UI Components using MOCKED API responses.
// It verifies the Frontend logic isolated from Backend availability.

const DASHBOARD_URL = process.env.DASHBOARD_URL || "http://localhost:3000";

test.describe("Dashboard:E2E:UI (Mocked)", () => {
  test.use({
    baseURL: DASHBOARD_URL,
    extraHTTPHeaders: { "X-Client-Name": "mocked-ui-test" },
  });

  test.beforeEach(async ({ page }) => {
    // Mock Identity/Stats
    await page.route("**/api/metrics", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          total_memories: 1337,
          total_vectors: 1337,
          queries_count: 50,
          client_stats: { created: 10, read: 40 },
          last_writer: "mock-client",
        }),
      });
    });

    // Mock Logs
    await page.route("**/api/audit-log*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          logs: [
            {
              id: 1,
              action: "create",
              status: "success",
              timestamp: new Date().toISOString(),
              details: {},
            },
          ],
          total: 1,
          page: 1,
          limit: 10,
        }),
      });
    });

    // Mock Settings/Token (if needed by UI call, though usually verified via API check)
  });

  test("Dashboard Loads and Shows Mocked Data", async ({ page }) => {
    await page.goto("/");

    // Check for specific UI elements populated by mock
    await expect(page.getByText("1,337")).toBeVisible(); // Total Memories
    await expect(page.getByText("mock-client")).toBeVisible(); // Last Writer
  });

  test("Settings Modal Opens", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("settings-button").click();
    await expect(page.getByText("Settings")).toBeVisible();
    // further checks like JSON presence
  });

  test("Token Visibility Logic", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("settings-button").click();
    const eyeBtn = page.getByTestId("toggle-visibility");
    await expect(eyeBtn).toBeVisible();
    // Click and verify input type changes or mocked value is revealed
  });
});
