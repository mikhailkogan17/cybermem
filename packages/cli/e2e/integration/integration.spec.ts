import { expect, test } from "@playwright/test";
import path from "path";

// This suite runs the "Real User" flow on a potentially Remote Environment.
// It captures Screenshots for the Release Report.

const TARGET_ENV = process.env.TEST_ENV_NAME || "local";
const OUTPUT_DIR = path.join(
  process.cwd(),
  "release-reports",
  "assets",
  TARGET_ENV,
);

test.describe("CLI:E2E (Integration)", () => {
  // We assume the environment is fully up and running (Backend + Frontend + Auth).

  test("Release Candidate Verification Flow", async ({ page }) => {
    // 1. Visit
    await page.goto("/");

    // 2. Auth Check (if remote)
    if (page.url().includes("auth/signin")) {
      // Fill token
      await page.fill("input#access-token", process.env.CYBERMEM_TOKEN || "");
      await page.keyboard.press("Enter");
      await page.waitForURL("**/");
    }

    // 3. Evidence 1: Dashboard Home
    await expect(page.locator(".status-pill").first()).toBeVisible(); // Ensure logs loaded
    await page.screenshot({
      path: path.join(OUTPUT_DIR, "1_dashboard.png"),
      fullPage: true,
    });

    // 4. Evidence 2: MCP Modal
    await page.getByTestId("mcp-button").click();
    await expect(page.getByText(/INTEGRATE MCP CLIENT/i)).toBeVisible();
    await page.screenshot({ path: path.join(OUTPUT_DIR, "2_mcp.png") });
    await page.keyboard.press("Escape");

    // 5. Evidence 3: Settings
    await page.getByTestId("settings-button").click();
    await expect(
      page.getByRole("heading", { name: /Settings/i }),
    ).toBeVisible();

    const eyeBtn = page.getByTestId("toggle-visibility");
    if (await eyeBtn.isVisible()) {
      await eyeBtn.click();
      await page.waitForTimeout(500); // Animation
    }
    await page.screenshot({ path: path.join(OUTPUT_DIR, "3_settings.png") });
  });
});
