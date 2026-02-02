import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e/integration",
  outputDir: "./test-results",
  reporter: "html",
  use: {
    // Base URL depends on target (staging/prod), handled in specifc test or env
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
