import { expect, test } from "@playwright/test";

const BASE_URL = process.env.MCP_URL
  ? process.env.MCP_URL.replace(/\/mcp$/, "")
  : "http://localhost:8626";

// Tailscale environments require auth token
const isLocalhost =
  BASE_URL.includes("localhost") || BASE_URL.includes("127.0.0.1");
const CYBERMEM_TOKEN = process.env.CYBERMEM_TOKEN || "";

// Helper to build headers with optional auth
function getHeaders(clientName: string): Record<string, string> {
  const headers: Record<string, string> = { "X-Client-Name": clientName };
  if (!isLocalhost && CYBERMEM_TOKEN) {
    headers["Authorization"] = `Bearer ${CYBERMEM_TOKEN}`;
  }
  return headers;
}

// CRITICAL: MCP CRUD tests MUST run in serial order (each depends on the previous)
test.describe.configure({ mode: "serial" });

test.describe("MCP:E2E (Core CRUD)", () => {
  let memoryId: string;
  const crudLog: Array<{
    operation: string;
    endpoint: string;
    payload?: object;
    status: number;
    response: object;
  }> = [];

  test.beforeAll(async ({}, testInfo) => {
    console.log(`🔧 Testing against: ${BASE_URL}`);

    // Attach environment info
    await testInfo.attach("🔧 Test Environment", {
      body: `Base URL: ${BASE_URL}\nTimestamp: ${new Date().toISOString()}\nClient: antigravity-client\nVersion: 0.13.0`,
      contentType: "text/plain",
    });
  });

  test("1. Create Memory (POST /add)", async ({ request }, testInfo) => {
    const payload = {
      content: `E2E Verification ${new Date().toISOString()}`,
      tags: ["e2e", "automated"],
    };

    await test.step("📤 CRUD — POST /add — Create new memory", async () => {
      console.log("📤 POST /add");
      console.log("   Payload:", JSON.stringify(payload, null, 2));

      const response = await request.post(`${BASE_URL}/add`, {
        data: payload,
        headers: {
          ...getHeaders("antigravity-client"),
          "X-Client-Version": "0.13.0",
        },
        timeout: 30000, // 30s timeout
      });

      // Handle non-JSON responses gracefully
      const status = response.status();
      let body: any;

      try {
        body = await response.json();
      } catch {
        const text = await response.text();
        throw new Error(
          `Non-JSON response (status ${status}): ${text.substring(0, 200)}`,
        );
      }

      console.log("   Status:", status);
      console.log("   Response:", JSON.stringify(body, null, 2));

      crudLog.push({
        operation: "CREATE",
        endpoint: "POST /add",
        payload,
        status,
        response: body,
      });

      expect(status).toBe(200);
      expect(body.id).toBeTruthy();
      memoryId = body.id;
      console.log(`   ✅ Memory ID: ${memoryId}`);
    });

    // Attach CRUD operation to trace
    await testInfo.attach("📝 CRUD — CREATE", {
      body: `Endpoint: POST /add\n\nRequest:\n${JSON.stringify(payload, null, 2)}\n\nResponse:\n${JSON.stringify(crudLog[crudLog.length - 1]?.response, null, 2)}`,
      contentType: "text/plain",
    });
  });

  test("2. Read Memory (POST /query)", async ({ request }, testInfo) => {
    await test.step("⏳ Wait — Vector Indexing Delay — 1 second", async () => {
      await new Promise((r) => setTimeout(r, 1000));
    });

    const payload = { query: "Verification", k: 1 };

    await test.step("📤 CRUD — POST /query — Semantic search", async () => {
      console.log("📤 POST /query");
      console.log("   Payload:", JSON.stringify(payload, null, 2));

      const response = await request.post(`${BASE_URL}/query`, {
        data: payload,
        headers: getHeaders("antigravity-client"),
      });

      const body = await response.json();
      console.log("   Status:", response.status());
      console.log("   Response:", JSON.stringify(body, null, 2));

      crudLog.push({
        operation: "READ",
        endpoint: "POST /query",
        payload,
        status: response.status(),
        response: body,
      });

      expect(response.status()).toBe(200);
      expect(Array.isArray(body)).toBe(true);
      console.log(`   ✅ Returned ${body.length} result(s)`);
    });

    await testInfo.attach("📖 CRUD — READ", {
      body: `Endpoint: POST /query\n\nRequest:\n${JSON.stringify(payload, null, 2)}\n\nResponse:\n${JSON.stringify(crudLog[crudLog.length - 1]?.response, null, 2)}`,
      contentType: "text/plain",
    });
  });

  test("3. Update Memory (PATCH /memory/:id)", async ({
    request,
  }, testInfo) => {
    test.skip(!memoryId, "Skipped — memoryId was not created in Step 1");

    const payload = {
      content: `Updated E2E Context ${new Date().toISOString()}`,
      tags: ["e2e", "updated"],
    };

    await test.step(`📤 CRUD — PATCH /memory/${memoryId} — Update content`, async () => {
      console.log(`📤 PATCH /memory/${memoryId}`);
      console.log("   Payload:", JSON.stringify(payload, null, 2));

      const response = await request.patch(`${BASE_URL}/memory/${memoryId}`, {
        data: payload,
        headers: getHeaders("antigravity-client"),
      });

      const body = await response.json();
      console.log("   Status:", response.status());
      console.log("   Response:", JSON.stringify(body, null, 2));

      crudLog.push({
        operation: "UPDATE",
        endpoint: `PATCH /memory/${memoryId}`,
        payload,
        status: response.status(),
        response: body,
      });

      expect(response.status()).toBe(200);
      console.log(`   ✅ Memory updated successfully`);
    });

    await testInfo.attach("✏️ CRUD — UPDATE", {
      body: `Endpoint: PATCH /memory/${memoryId}\n\nRequest:\n${JSON.stringify(payload, null, 2)}\n\nResponse:\n${JSON.stringify(crudLog[crudLog.length - 1]?.response, null, 2)}`,
      contentType: "text/plain",
    });
  });

  test("4. Reinforce Memory (POST /memory/:id/reinforce)", async ({
    request,
  }, testInfo) => {
    test.skip(!memoryId, "Skipped — memoryId was not created in Step 1");

    const payload = { boost: 0.5 };

    await test.step(`📤 CRUD — POST /memory/${memoryId}/reinforce — Boost salience`, async () => {
      console.log(`📤 POST /memory/${memoryId}/reinforce`);
      console.log("   Payload:", JSON.stringify(payload, null, 2));

      const response = await request.post(
        `${BASE_URL}/memory/${memoryId}/reinforce`,
        {
          data: payload,
          headers: getHeaders("antigravity-client"),
        },
      );

      const body = await response.json();
      console.log("   Status:", response.status());
      console.log("   Response:", JSON.stringify(body, null, 2));

      crudLog.push({
        operation: "REINFORCE",
        endpoint: `POST /memory/${memoryId}/reinforce`,
        payload,
        status: response.status(),
        response: body,
      });

      expect(response.status()).toBe(200);
      console.log(`   ✅ Memory reinforced successfully`);
    });

    await testInfo.attach("⚡ CRUD — REINFORCE", {
      body: `Endpoint: POST /memory/${memoryId}/reinforce\n\nRequest:\n${JSON.stringify(payload, null, 2)}\n\nResponse:\n${JSON.stringify(crudLog[crudLog.length - 1]?.response, null, 2)}`,
      contentType: "text/plain",
    });
  });

  test("5. Delete Memory (DELETE /memory/:id)", async ({
    request,
  }, testInfo) => {
    test.skip(!memoryId, "Skipped — memoryId was not created in Step 1");

    await test.step(`📤 CRUD — DELETE /memory/${memoryId} — Hard delete from DB`, async () => {
      console.log(`📤 DELETE /memory/${memoryId}`);

      const response = await request.delete(`${BASE_URL}/memory/${memoryId}`, {
        headers: getHeaders("antigravity-client"),
      });

      const body = await response.json();
      console.log("   Status:", response.status());
      console.log("   Response:", JSON.stringify(body, null, 2));

      crudLog.push({
        operation: "DELETE",
        endpoint: `DELETE /memory/${memoryId}`,
        status: response.status(),
        response: body,
      });

      expect(response.status()).toBe(200);
      console.log(`   ✅ Memory deleted successfully`);
    });

    await testInfo.attach("🗑️ CRUD — DELETE", {
      body: `Endpoint: DELETE /memory/${memoryId}\n\nResponse:\n${JSON.stringify(crudLog[crudLog.length - 1]?.response, null, 2)}\n\n--- FULL CRUD LOG ---\n${crudLog.map((c) => `${c.operation}: ${c.endpoint} → ${c.status}`).join("\n")}`,
      contentType: "text/plain",
    });

    // Attach full CRUD summary at the end
    await testInfo.attach("📊 CRUD Lifecycle Complete", {
      body: `Memory ID: ${memoryId}\n\nOperations Performed:\n${crudLog.map((c) => `✅ ${c.operation}: ${c.endpoint} → HTTP ${c.status}`).join("\n")}\n\nStorage State: CLEANED (memory deleted)`,
      contentType: "text/plain",
    });
  });
});
