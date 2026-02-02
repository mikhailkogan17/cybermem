import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e/integration",
  outputDir: "./test-results",
  reporter: "html",
  use: {
    baseURL: process.env.DASHBOARD_URL || "http://localhost:8626",
    screenshot: "only-on-failure",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "integration",
      testMatch: "integration.spec.ts",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
