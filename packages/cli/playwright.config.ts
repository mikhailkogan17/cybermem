import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e/suites",
  outputDir: "./test-results",
  timeout: 30000,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",

  use: {
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },

  projects: [
    {
      name: "mcp",
      testMatch: "mcp.spec.ts",
    },
    {
      name: "dashboard-api",
      testMatch: "dashboard-api.spec.ts",
    },
    {
      name: "dashboard-ui",
      testMatch: "dashboard-ui.spec.ts",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "cli-integration",
      testMatch: "cli.spec.ts",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
