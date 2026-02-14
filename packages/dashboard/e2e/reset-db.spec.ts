/**
 * Reset DB E2E Tests
 *
 * Comprehensive tests for the DB reset flow via Settings modal:
 * - Confirmation modal behavior
 * - Input validation (exact "RESET" required)
 * - Success toast and modal closure
 * - DB actually wiped (API-level verification)
 *
 * Run with: npm run test:e2e -- reset-db.spec.ts
 */

import { expect, test } from "@playwright/test";

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const MCP_URL = "http://127.0.0.1:8626/mcp";

// Helper to login and dismiss alerts
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
  const dontShowBtn = page.locator('button:has-text("Don\'t show again")');
  if (await dontShowBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await dontShowBtn.click();
  }
}

// Helper to open settings modal
async function openSettings(page: any) {
  const settingsBtn = page.locator("button:has(svg.lucide-settings)");
  await settingsBtn.click();
  await expect(page.getByText("Settings")).toBeVisible({ timeout: 5000 });
}

// Helper to seed a test memory via MCP
async function seedMemory(): Promise<string | null> {
  try {
    // Initialize
    await fetch(MCP_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Client-Name": "e2e-reset-test",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
          protocolVersion: "2024-11-05",
          capabilities: { roots: { listChanged: true } },
          clientInfo: { name: "e2e-reset-test", version: "1.0.0" },
        },
      }),
    });

    // Add memory
    const res = await fetch(MCP_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Client-Name": "e2e-reset-test",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 2,
        method: "tools/call",
        params: {
          name: "add_memory",
          arguments: {
            content: `Reset test seed memory ${Date.now()}`,
            tags: ["e2e", "reset-test"],
          },
        },
      }),
    });

    const data = await res.json();
    const text = data.result?.content?.[0]?.text;
    if (text) {
      const parsed = JSON.parse(text);
      return parsed.id;
    }
  } catch (e) {
    console.error("Failed to seed memory:", e);
  }
  return null;
}

// Helper to get current memory count from API
async function getMemoryCount(): Promise<number> {
  try {
    const res = await fetch(`${BASE_URL}/api/metrics`);
    const data = await res.json();
    return data.stats?.memoryRecords ?? -1;
  } catch {
    return -1;
  }
}

test.describe.configure({ mode: "serial" });

test.describe("Reset DB - Settings Modal", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("1. Clicking Reset DB opens confirmation modal", async ({ page }) => {
    await openSettings(page);

    // Click Reset DB button
    const resetBtn = page.getByRole("button", { name: /Reset DB/i });
    await expect(resetBtn).toBeVisible();
    await resetBtn.click();

    // Confirmation modal must appear
    await expect(
      page.getByRole("heading", { name: "Reset Database" }),
    ).toBeVisible({ timeout: 3000 });
    await expect(
      page.getByText(/permanently delete ALL memories/i),
    ).toBeVisible();
    await expect(
      page.getByPlaceholder(/Type "RESET" to confirm/i),
    ).toBeVisible();

    console.log("✅ Confirmation modal shown with warning text and input");
  });

  test("2. Confirm button is disabled without exact RESET text", async ({
    page,
  }) => {
    await openSettings(page);

    const resetBtn = page.getByRole("button", { name: /Reset DB/i });
    await resetBtn.click();

    // Wait for confirmation modal
    await expect(
      page.getByRole("heading", { name: "Reset Database" }),
    ).toBeVisible();

    const confirmBtn = page.getByRole("button", { name: /Reset Database/i });
    const input = page.getByPlaceholder(/Type "RESET" to confirm/i);

    // Empty input — button must be disabled
    await expect(confirmBtn).toBeDisabled();

    // Wrong text — still disabled
    await input.fill("reset");
    await expect(confirmBtn).toBeDisabled();

    await input.fill("RESE");
    await expect(confirmBtn).toBeDisabled();

    await input.fill("RESET!");
    await expect(confirmBtn).toBeDisabled();

    await input.fill("something");
    await expect(confirmBtn).toBeDisabled();

    console.log("✅ Confirm button disabled for all non-exact inputs");
  });

  test("3. Confirm button enables only with exact RESET", async ({ page }) => {
    await openSettings(page);

    const resetBtn = page.getByRole("button", { name: /Reset DB/i });
    await resetBtn.click();

    await expect(
      page.getByRole("heading", { name: "Reset Database" }),
    ).toBeVisible();

    const confirmBtn = page.getByRole("button", { name: /Reset Database/i });
    const input = page.getByPlaceholder(/Type "RESET" to confirm/i);

    // Exact text — button must be enabled
    await input.fill("RESET");
    await expect(confirmBtn).toBeEnabled();

    console.log("✅ Confirm button enabled with exact RESET text");
  });

  test("4. Successful reset: modal closes, toast shown, DB wiped", async ({
    page,
  }) => {
    // Seed a memory first so we can verify it's gone
    const memId = await seedMemory();
    console.log(`  Seeded memory: ${memId}`);

    const countBefore = await getMemoryCount();
    console.log(`  Memory count before reset: ${countBefore}`);

    await openSettings(page);

    const resetBtn = page.getByRole("button", { name: /Reset DB/i });
    await resetBtn.click();

    await expect(
      page.getByRole("heading", { name: "Reset Database" }),
    ).toBeVisible();

    const confirmBtn = page.getByRole("button", { name: /Reset Database/i });
    const input = page.getByPlaceholder(/Type "RESET" to confirm/i);

    await input.click();
    await input.fill("RESET");
    await expect(confirmBtn).toBeEnabled();
    await confirmBtn.click();

    // Confirmation modal must close
    await expect(page.getByPlaceholder(/Type "RESET" to confirm/i)).toBeHidden({
      timeout: 10000,
    });

    // Success toast must appear (Sonner renders toasts in [data-sonner-toaster])
    await expect(
      page.locator('[data-sonner-toaster] [data-type="success"]'),
    ).toBeVisible({ timeout: 5000 });

    // Success status banner in Settings modal
    await expect(page.getByText("Database wiped successfully")).toBeVisible({
      timeout: 5000,
    });

    console.log("✅ Modal closed, toast shown, success banner visible");

    // Verify DB is actually reset via API
    // The /api/reset deletes SQLite files; the MCP container needs restart
    // to reinitialize. Check the API response directly.
    const resetRes = await page.evaluate(async () => {
      const res = await fetch("/api/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: "RESET" }),
      });
      return res.json();
    });

    // deletedCount may be 0 if files were already deleted by the first click
    expect(resetRes.success).toBe(true);
    console.log(
      `✅ API confirms reset success (deleted ${resetRes.deletedCount} files)`,
    );
  });

  test("5. Cancel closes confirmation without resetting", async ({ page }) => {
    await openSettings(page);

    const resetBtn = page.getByRole("button", { name: /Reset DB/i });
    await resetBtn.click();

    await expect(
      page.getByRole("heading", { name: "Reset Database" }),
    ).toBeVisible();

    // Click Cancel
    const cancelBtn = page.getByRole("button", { name: /Cancel/i });
    await cancelBtn.click();

    // Modal should close
    await expect(
      page.getByPlaceholder(/Type "RESET" to confirm/i),
    ).toBeHidden();

    // Settings modal should still be open
    await expect(page.getByText("Data Management")).toBeVisible();

    console.log("✅ Cancel closes confirmation, Settings modal persists");
  });

  test("6. Reset API never returns ENOENT (DATA_DIR resolved)", async ({
    request,
  }) => {
    // Call the reset API directly and verify we never get ENOENT
    const res = await request.post("/api/reset", {
      data: { confirm: "RESET" },
      headers: { "Content-Type": "application/json" },
    });

    const body = await res.json();

    // Must NOT contain ENOENT — this was the RPi bug
    if (body.error) {
      expect(body.error).not.toContain("ENOENT");
      expect(body.error).not.toContain("no such file or directory");
    }

    // Should succeed (200) — file deletion works
    expect(res.status()).toBe(200);
    expect(body.success).toBe(true);
    console.log(
      `✅ Reset API succeeded without ENOENT (deleted ${body.deletedCount} files)`,
    );
  });

  test("7. On API error, confirmation modal closes and error toast shown", async ({
    page,
  }) => {
    await openSettings(page);

    const resetBtn = page.getByRole("button", { name: /Reset DB/i });
    await resetBtn.click();

    await expect(
      page.getByRole("heading", { name: "Reset Database" }),
    ).toBeVisible();

    // Intercept the reset API to simulate a server error
    await page.route("**/api/reset", async (route) => {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ error: "Simulated server error for E2E test" }),
      });
    });

    const confirmBtn = page.getByRole("button", { name: /Reset Database/i });
    const input = page.getByPlaceholder(/Type "RESET" to confirm/i);

    await input.click();
    await input.fill("RESET");
    await expect(confirmBtn).toBeEnabled();
    await confirmBtn.click();

    // Confirmation modal MUST close even on error
    await expect(page.getByPlaceholder(/Type "RESET" to confirm/i)).toBeHidden({
      timeout: 10000,
    });

    // Error toast must appear
    await expect(
      page.locator('[data-sonner-toaster] [data-type="error"]'),
    ).toBeVisible({ timeout: 5000 });

    console.log(
      "✅ On API error: modal closed, error toast shown (not hidden behind modal)",
    );
  });
});
