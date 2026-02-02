import { expect, test } from "@playwright/test";

// This suite runs against the Next.js API Routes (Backend)
// It does NOT use the browser UI.

const BASE_URL = process.env.DASHBOARD_URL || "http://localhost:3000";

test.describe("Dashboard:E2E:API", () => {
  test.use({
    baseURL: BASE_URL,
    extraHTTPHeaders: { "X-Client-Name": "e2e-api-test" },
  });

  test("Health Check (/api/health)", async ({ request }) => {
    const response = await request.get("/api/health");
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toHaveProperty("status", "ok"); // Adjust based on actual response
  });

  test("Stats (/api/metrics)", async ({ request }) => {
    const response = await request.get("/api/metrics");
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toHaveProperty("total_memories");
  });

  // Add other endpoint tests as required
});
