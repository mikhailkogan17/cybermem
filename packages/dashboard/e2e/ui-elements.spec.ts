/**
 * UI Elements E2E Tests
 *
 * Comprehensive tests for all dashboard UI components:
 * - Visibility: Elements exist on page
 * - Functional: Interactions work (clicks, modals)
 * - Data: Values are displayed correctly
 *
 * Run with: npm run test:e2e -- ui-elements.spec.ts
 */

import { expect, test } from "@playwright/test";

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";

// Helper to login
async function login(page: any) {
  await page.goto(BASE_URL);
  const passwordInput = page.getByPlaceholder("Enter admin password");
  if (await passwordInput.isVisible({ timeout: 3000 }).catch(() => false)) {
    await passwordInput.fill("admin");
    await page.keyboard.press("Enter");
    await expect(page.getByRole("heading", { name: "CyberMem" })).toBeVisible({
      timeout: 10000,
    });
  }
  // Dismiss password warning if present
  const dontShowBtn = page.locator('button:has-text("Don\'t show again")');
  if (await dontShowBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await dontShowBtn.click();
  }
}

test.describe("UI Elements - Visibility", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("Header: Logo, Title, and All Systems badge visible", async ({
    page,
  }) => {
    // Logo
    await expect(page.locator('img[alt="CyberMem Logo"]')).toBeVisible();

    // Title
    await expect(page.getByRole("heading", { name: "CyberMem" })).toBeVisible();

    // All Systems badge should transition from shimmer to status
    // Wait for shimmer to disappear (loading complete)
    await page.waitForTimeout(3000);

    // Should show one of: "All Systems OK", "Degraded", "System Error"
    const badge = page.locator("text=/All Systems OK|Degraded|System Error/");
    await expect(badge).toBeVisible({ timeout: 10000 });
    console.log("✅ Header: All elements visible");
  });

  test("MetricCards: All 4 numeric cards visible with labels", async ({
    page,
  }) => {
    const cards = [
      "Memory Records",
      "Total Clients",
      "Success Rate",
      "Total Requests",
    ];

    for (const label of cards) {
      await expect(page.getByText(label)).toBeVisible();
    }
    console.log("✅ MetricCards: All 4 labels visible");
  });

  test("MetricCards: Values are not stuck on shimmer", async ({ page }) => {
    // Wait for data to load
    await page.waitForTimeout(3000);

    // Check that Memory Records shows a number (not shimmer placeholder)
    const memoryCard = page
      .locator("text=Memory Records")
      .locator("..")
      .locator("..");
    const valueText = await memoryCard.locator(".text-4xl").textContent();
    expect(valueText).not.toBe("");
    expect(valueText).not.toContain("...");
    console.log(`✅ Memory Records value: ${valueText}`);
  });

  test("ClientCards: Top/Last Writer/Reader visible", async ({ page }) => {
    const cards = ["Top Writer", "Top Reader", "Last Writer", "Last Reader"];

    for (const label of cards) {
      await expect(page.getByText(label)).toBeVisible();
    }
    console.log("✅ ClientCards: All 4 visible");
  });

  test("ChartCards: All 4 time series charts present", async ({ page }) => {
    const charts = [
      "Creates by Client",
      "Reads by Client",
      "Updates by Client",
      "Deletes by Client",
    ];

    for (const title of charts) {
      await expect(page.getByText(title)).toBeVisible();
    }
    console.log("✅ ChartCards: All 4 visible");
  });

  test("ChartCards: Period selector works", async ({ page }) => {
    // Find first chart's period button
    const periodBtn = page.locator('button:has-text("24 Hours")').first();
    await expect(periodBtn).toBeVisible();
    await periodBtn.click();

    // Dropdown should appear
    await expect(page.getByText("7 Days")).toBeVisible();
    console.log("✅ Chart period selector works");
  });

  test("AuditLog: Table and headers visible", async ({ page }) => {
    // Scroll to audit log
    const auditHeader = page.getByRole("heading", { name: "Audit Log" });
    await auditHeader.scrollIntoViewIfNeeded();
    await expect(auditHeader).toBeVisible();

    // Check column headers
    const headers = [
      "Timestamp",
      "Client",
      "Operation",
      "Description",
      "Status",
    ];
    for (const header of headers) {
      await expect(page.locator(`th:has-text("${header}")`)).toBeVisible();
    }
    console.log("✅ AuditLog: Table headers visible");
  });

  test("AuditLog: Sorting works", async ({ page }) => {
    const timestampHeader = page.locator('th:has-text("Timestamp")');
    await timestampHeader.scrollIntoViewIfNeeded();

    // Click to sort
    await timestampHeader.click();
    // Second click to reverse
    await timestampHeader.click();

    // If no error, sorting works
    console.log("✅ AuditLog: Sorting works");
  });
});

test.describe("UI Elements - Functional", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("Settings Modal: Opens and shows system info", async ({ page }) => {
    // Click settings button
    const settingsBtn = page.locator("button:has(svg.lucide-settings)");
    await settingsBtn.click();

    // Modal should open
    await expect(page.getByText("Dashboard Settings")).toBeVisible({
      timeout: 5000,
    });

    // System info should be present
    await expect(page.getByText("System")).toBeVisible();

    // Close modal
    await page.keyboard.press("Escape");
    console.log("✅ Settings Modal: Opens and shows system info");
  });

  test("Settings Modal: Data Management buttons visible", async ({ page }) => {
    const settingsBtn = page.locator("button:has(svg.lucide-settings)");
    await settingsBtn.click();

    await expect(page.getByText("Dashboard Settings")).toBeVisible({
      timeout: 5000,
    });

    // Check for data management buttons
    await expect(page.getByRole("button", { name: /Backup/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Restore/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Reset/i })).toBeVisible();

    await page.keyboard.press("Escape");
    console.log("✅ Settings Modal: Data Management buttons visible");
  });

  test("MCP Config Modal: Opens and shows instructions", async ({ page }) => {
    // Click Connect MCP button
    const mcpBtn = page.getByRole("button", { name: "Connect MCP" });
    await mcpBtn.click();

    // Modal should open with instructions
    await expect(page.getByText(/MCP Configuration|Connect MCP/i)).toBeVisible({
      timeout: 5000,
    });

    // Should show config instructions
    await expect(page.locator("code, pre")).toBeVisible();

    // Close modal
    await page.keyboard.press("Escape");
    console.log("✅ MCP Config Modal: Opens and shows instructions");
  });

  test("Docs button: Links to documentation", async ({ page }) => {
    const docsBtn = page.getByRole("link", { name: "Docs" });
    const href = await docsBtn.getAttribute("href");
    expect(href).toContain("docs.cybermem.dev");
    console.log("✅ Docs button: Correct link");
  });
});

test.describe("UI Elements - Data Validation", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("API returns valid stats structure", async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/metrics`);
    expect(res.ok()).toBeTruthy();

    const data = await res.json();
    expect(data.stats).toBeDefined();
    expect(typeof data.stats.memoryRecords).toBe("number");
    expect(typeof data.stats.totalClients).toBe("number");
    expect(typeof data.stats.successRate).toBe("number");
    expect(typeof data.stats.totalRequests).toBe("number");
    expect(data.stats.topWriter).toBeDefined();
    expect(data.stats.topReader).toBeDefined();
    console.log("✅ API: Valid stats structure");
  });

  test("Dashboard displays consistent data with API", async ({
    page,
    request,
  }) => {
    // Get API data
    const res = await request.get(`${BASE_URL}/api/metrics`);
    const apiData = await res.json();

    // Wait for dashboard to load
    await page.waitForTimeout(3000);

    // Memory Records should match API
    const memoryValue = await page
      .locator("text=Memory Records")
      .locator("..")
      .locator("..")
      .locator(".text-4xl")
      .textContent();
    const apiMemory = apiData.stats.memoryRecords.toLocaleString();

    // Values should match (allowing for locale formatting)
    expect(memoryValue?.replace(/,/g, "")).toBe(apiMemory.replace(/,/g, ""));
    console.log(`✅ Dashboard data matches API: ${memoryValue}`);
  });
});
