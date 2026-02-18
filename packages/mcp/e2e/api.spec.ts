import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { expect, test } from "@playwright/test";
import { spawn } from "child_process";
import path from "path";

import { FastMCPHandshakeTransport } from "./utils/FastMCPHandshakeTransport";

const PORT = 3102;
const BASE_URL = `http://localhost:${PORT}`;

// CRITICAL: MCP CRUD tests MUST run in serial order (each depends on the previous)
test.describe.configure({ mode: "serial" });

test.describe("MCP:E2E (Protocol Tool Calls)", () => {
  let client: Client;
  let transport: FastMCPHandshakeTransport;
  let memoryId: string;
  let serverProcess: any;

  test.beforeAll(async () => {
    // Spawn server
    const serverPath = path.join(__dirname, "../dist/index.js");
    serverProcess = spawn(
      "node",
      [
        serverPath,
        "--port",
        PORT.toString(),
        "--env",
        "test",
        "--db-path",
        ":memory:",
      ],
      {
        stdio: "pipe",
        env: { ...process.env, OM_DB_PATH: ":memory:" },
      },
    );

    await new Promise<void>((resolve, reject) => {
      serverProcess.stderr?.on("data", (data: any) => {
        const output = data.toString();
        if (
          output.includes(`CyberMem MCP running on http://localhost:${PORT}`)
        ) {
          resolve();
        }
      });
      serverProcess.on("error", reject);
      setTimeout(() => reject(new Error("Server start timeout")), 60000);
    });

    console.log(`🔧 Testing against: ${BASE_URL}`);

    // Initialize MCP Client
    client = new Client(
      { name: "e2e-tester", version: "1.0.0" },
      { capabilities: {} },
    );

    const sseUrl = new URL(`${BASE_URL}/mcp`);
    const headers: Record<string, string> = {
      "X-Client-Name": "antigravity-e2e",
    };

    transport = new FastMCPHandshakeTransport(sseUrl, headers);

    console.log(`🔗 Connecting to MCP via Handshake: ${sseUrl.toString()}`);
    await client.connect(transport);
    console.log("✅ MCP Client connected");
  });

  test.afterAll(async () => {
    if (transport) {
      await transport.close();
    }
    if (serverProcess) {
      serverProcess.kill();
    }
    // Clean up port 3102 just in case
    spawn("sh", ["-c", `lsof -ti:${PORT} | xargs kill -9 || true`]);
  });

  test("1. Create Memory (add_memory)", async ({}, testInfo) => {
    const payload = {
      content: `E2E Protocol Verification ${new Date().toISOString()}`,
      tags: ["e2e", "protocol", "mcp"],
    };

    await test.step("📤 Tool Call — add_memory", async () => {
      console.log("📤 Calling tool: add_memory");

      const result = await client.callTool({
        name: "add_memory",
        arguments: payload,
      });

      console.log("   Result:", JSON.stringify(result, null, 2));

      expect(result.isError).toBeFalsy();
      const content = result.content as any[];
      const body = JSON.parse(content[0].text);
      expect(body.id).toBeTruthy();
      memoryId = body.id;
      console.log(`   ✅ Memory ID: ${memoryId}`);
    });

    await testInfo.attach("📝 Tool Call — CREATE", {
      body: `Tool: add_memory\n\nArguments:\n${JSON.stringify(
        payload,
        null,
        2,
      )}`,
      contentType: "text/plain",
    });
  });

  test("2. Read Memory (query_memory)", async ({}, testInfo) => {
    await test.step("⏳ Wait — Vector Indexing Delay", async () => {
      await new Promise((r) => setTimeout(r, 1000));
    });

    const payload = { query: "Protocol Verification", k: 1 };

    await test.step("📤 Tool Call — query_memory", async () => {
      console.log("📤 Calling tool: query_memory");

      const result = await client.callTool({
        name: "query_memory",
        arguments: payload,
      });

      console.log("   Result:", JSON.stringify(result, null, 2));

      expect(result.isError).toBeFalsy();
      const content = result.content as any[];
      const body = JSON.parse(content[0].text);
      expect(Array.isArray(body)).toBe(true);
      expect(body.length).toBeGreaterThan(0);
      console.log(`   ✅ Returned ${body.length} result(s)`);
    });
  });

  test("3. Update Memory (update_memory)", async ({}, testInfo) => {
    test.skip(!memoryId, "Skipped — memoryId was not created in Step 1");

    const payload = {
      id: memoryId,
      content: `Updated E2E Context via Protocol ${new Date().toISOString()}`,
      tags: ["e2e", "protocol", "updated"],
    };

    await test.step("📤 Tool Call — update_memory", async () => {
      console.log(`📤 Calling tool: update_memory for ${memoryId}`);

      const result = await client.callTool({
        name: "update_memory",
        arguments: payload,
      });

      console.log("   Result:", JSON.stringify(result, null, 2));

      expect(result.isError).toBeFalsy();
      console.log(`   ✅ Memory updated successfully`);
    });
  });

  test("4. Reinforce Memory (reinforce_memory)", async ({}, testInfo) => {
    test.skip(!memoryId, "Skipped — memoryId was not created in Step 1");

    const payload = { id: memoryId, boost: 0.5 };

    await test.step("📤 Tool Call — reinforce_memory", async () => {
      console.log(`📤 Calling tool: reinforce_memory for ${memoryId}`);

      const result = await client.callTool({
        name: "reinforce_memory",
        arguments: payload,
      });

      console.log("   Result:", JSON.stringify(result, null, 2));

      expect(result.isError).toBeFalsy();
      console.log(`   ✅ Memory reinforced successfully`);
    });
  });

  test("5. Delete Memory (delete_memory)", async ({}, testInfo) => {
    test.skip(!memoryId, "Skipped — memoryId was not created in Step 1");

    await test.step("📤 Tool Call — delete_memory", async () => {
      console.log(`📤 Calling tool: delete_memory for ${memoryId}`);

      const result = await client.callTool({
        name: "delete_memory",
        arguments: { id: memoryId },
      });

      console.log("   Result:", JSON.stringify(result, null, 2));

      expect(result.isError).toBeFalsy();
      console.log(`   ✅ Memory deleted successfully`);
    });
  });
});
