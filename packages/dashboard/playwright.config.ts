import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  outputDir: "./test-results",
  reporter: "html",
  use: {
    baseURL: process.env.DASHBOARD_URL || "http://localhost:3000",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "api",
      testMatch: "api.spec.ts",
    },
    {
      name: "ui",
      testMatch: "ui.spec.ts",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
