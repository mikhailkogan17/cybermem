import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  outputDir: "./test-results",
  reporter: "html",
  use: {
    baseURL: process.env.DASHBOARD_URL || "http://localhost:3000",
    screenshot: "only-on-failure",
  },
  webServer: process.env.DASHBOARD_URL
    ? undefined
    : {
        command: "npm run dev",
        port: 3000,
        reuseExistingServer: !process.env.CI,
        stdout: "ignore",
        stderr: "pipe",
      },
  projects: [
    {
      name: "api",
      testMatch: ["api.spec.ts", "routing.spec.ts"],
    },
    {
      name: "ui",
      testMatch: "ui.spec.ts",
      use: {
        ...devices["Desktop Chrome"],
        trace: "on",
        screenshot: "on",
      },
    },
  ],
});
