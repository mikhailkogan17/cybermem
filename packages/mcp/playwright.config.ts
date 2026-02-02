import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  outputDir: "./test-results",
  reporter: "html",
  use: {
    baseURL: process.env.MCP_URL || "http://localhost:8626/mcp",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "api",
      testMatch: "api.spec.ts",
    },
  ],
});
