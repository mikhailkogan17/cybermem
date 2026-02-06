import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: ".",
  outputDir: "./test-results",
  reporter: [["html", { outputFolder: "./playwright-report" }]],

  // Global setup runs ONCE before all tests - handles reset + install
  globalSetup: "./e2e/global-setup.ts",

  // Ensure tests run sequentially to avoid race conditions
  fullyParallel: false,
  workers: 1, // Single worker = sequential execution

  // Retries for stability (solo developer = no flakes allowed)
  retries: 1,

  use: {
    // Only ignore HTTPS errors for Tailscale Funnel URLs (not localhost)
    ignoreHTTPSErrors: process.env.BASE_URL?.includes('.ts.net') || false,
    screenshot: "only-on-failure",
    trace: "on-first-retry",
  },

  timeout: 60000, // 60s timeout for slow Docker operations

  projects: [
    // 1. MCP CRUD tests - run FIRST, no reset needed, NO RETRIES (sequential CRUD)
    {
      name: "mcp-api",
      testDir: "./packages/mcp/e2e",
      testMatch: "api.spec.ts",
      retries: 0, // CRITICAL: MCP tests are sequential, retry breaks order
      use: {
        baseURL: process.env.MCP_URL || "http://localhost:8626",
      },
    },
    // 2. Dashboard API tests - run after MCP
    {
      name: "dashboard-api",
      testDir: "./packages/dashboard/e2e",
      testMatch: "api.spec.ts",
      dependencies: ["mcp-api"], // Wait for MCP to complete
      use: {
        baseURL: process.env.DASHBOARD_URL || "http://localhost:3000",
      },
    },
    // 3. Dashboard UI tests - run after API tests, no reset
    {
      name: "dashboard-ui",
      testDir: "./packages/dashboard/e2e",
      testMatch: "ui.spec.ts",
      dependencies: ["dashboard-api"], // Wait for API tests
      use: {
        ...devices["Desktop Chrome"],
        baseURL: process.env.DASHBOARD_URL || "http://localhost:3000",
        trace: "on",
        screenshot: "on",
      },
    },
    // 4. CLI Integration tests - run last
    {
      name: "cli-integration",
      testDir: "./packages/cli/e2e/integration",
      testMatch: "integration.spec.ts",
      dependencies: ["dashboard-ui"], // Wait for UI tests
      use: {
        ...devices["Desktop Chrome"],
        baseURL: process.env.DASHBOARD_URL || "http://localhost:8626",
        trace: "on",
        screenshot: "on",
      },
    },
  ],

  // Start the dashboard server for local tests
  webServer: [
    {
      command: "cd packages/dashboard && npm run dev",
      port: 3000,
      reuseExistingServer: true,
      stdout: "pipe",
      stderr: "pipe",
      timeout: 60000, // 60s to start
    },
  ],
});
