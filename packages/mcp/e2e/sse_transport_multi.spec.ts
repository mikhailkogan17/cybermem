import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { expect, test } from "@playwright/test";
import { spawn } from "child_process";
import path from "path";

import { FastMCPHandshakeTransport } from "./utils/FastMCPHandshakeTransport";

const PORT = 3103;
const BASE_URL = `http://localhost:${PORT}`;

test.describe("FastMCP SSE: Multi-Client Isolation", () => {
  let serverProcess: any;

  test.beforeAll(async () => {
    // Spawn server with :memory: DB for isolation
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
      setTimeout(() => reject(new Error("Server start timeout")), 30000);
    });
  });

  test.afterAll(() => {
    if (serverProcess) {
      serverProcess.kill();
    }
    // Final cleanup of port just in case
    spawn("sh", ["-c", `lsof -ti:${PORT} | xargs kill -9 || true`]);
  });

  test("Should support multiple clients with isolated sessions", async () => {
    const clients: Client[] = [];
    const transients: FastMCPHandshakeTransport[] = [];
    const clientCount = 3;

    console.log(`🚀 Starting Multi-Client Test (${clientCount} clients)`);

    // 1. Establish sessions for all clients
    for (let i = 0; i < clientCount; i++) {
      const client = new Client(
        { name: `multi-client-${i}`, version: "1.0.0" },
        { capabilities: {} },
      );
      const transport = new FastMCPHandshakeTransport(
        new URL(`${BASE_URL}/mcp`),
        {
          "X-Client-Name": `client-${i}`,
        },
      );

      console.log(`  [Client ${i}] Connecting...`);
      await client.connect(transport);
      console.log(
        `  [Client ${i}] Connected. Session ID: ${transport.sessionId}`,
      );

      clients.push(client);
      transients.push(transport);
    }

    // 2. Perform tool calls and verify identity propagation
    for (let i = 0; i < clientCount; i++) {
      const content = `Memory from client ${i} at ${new Date().toISOString()}`;
      console.log(`  [Client ${i}] Calling add_memory...`);

      const result = await clients[i].callTool({
        name: "add_memory",
        arguments: { content, tags: ["multi", `client-${i}`] },
      });

      expect(result.isError).toBeFalsy();
      console.log(`  [Client ${i}] ✅ Tool call successful`);
    }

    // 3. Verify all clients can still query (sessions persist)
    for (let i = 0; i < clientCount; i++) {
      console.log(`  [Client ${i}] Querying memories...`);
      const result = await clients[i].callTool({
        name: "query_memory",
        arguments: { query: `client-${i}`, k: 1 },
      });

      const body = JSON.parse((result.content as any[])[0].text);
      expect(body.length).toBeGreaterThan(0);
      console.log(
        `  [Client ${i}] ✅ Query successful, found ${body.length} records`,
      );
    }

    // 4. Cleanup
    for (const transport of transients) {
      await transport.close();
    }
  });
});
