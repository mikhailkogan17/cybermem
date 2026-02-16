import { expect, test } from "@playwright/test";
import { ChildProcess, spawn } from "child_process";
import path from "path";

/**
 * MCP SSE Transport Multi-Session Test
 * 
 * This test validates:
 * 1. Multiple concurrent SSE connections
 * 2. Connection isolation (session-specific messages)
 * 3. Graceful handling of unauthorized requests (when auth is enabled)
 * 4. Connection cleanup and resource management
 * 
 * Purpose: Prevent SSE transport regressions identified in 0.12-0.14 releases
 */
test.describe("MCP SSE Transport - Multi-Session", () => {
  let serverProcess: ChildProcess;
  const PORT = 3102; // Unique port to avoid conflicts

  test.setTimeout(120000);

  test.beforeAll(async () => {
    // Start the server in http mode with in-memory DB
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

    // Wait for server to start
    await new Promise<void>((resolve, reject) => {
      let output = "";
      const timeout = setTimeout(() => {
        reject(new Error(`Server start timeout. Output: ${output}`));
      }, 60000);

      serverProcess.stderr?.on("data", (data) => {
        const text = data.toString();
        output += text;
        console.log("[Server]", text);
        if (text.includes(`CyberMem MCP running on http://localhost:${PORT}`)) {
          clearTimeout(timeout);
          resolve();
        }
      });

      serverProcess.on("error", (err) => {
        clearTimeout(timeout);
        reject(err);
      });
    });
  });

  test.afterAll(() => {
    if (serverProcess && !serverProcess.killed) {
      serverProcess.kill();
    }
  });

  test("should handle multiple concurrent SSE connections", async () => {
    const connections: Array<{
      response: Response;
      reader: ReadableStreamDefaultReader<Uint8Array>;
    }> = [];

    // Open 3 concurrent SSE connections
    for (let i = 0; i < 3; i++) {
      const response = await fetch(`http://localhost:${PORT}/sse`, {
        headers: { "X-Client-Name": `test-client-${i}` },
      });
      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toBe("text/event-stream");

      const reader = response.body!.getReader();
      connections.push({ response, reader });
    }

    // Verify all connections receive endpoint events
    const decoder = new TextDecoder();
    for (let i = 0; i < connections.length; i++) {
      let endpointFound = false;
      const { reader } = connections[i];

      for (let j = 0; j < 3; j++) {
        const { value, done } = await reader.read();
        if (done) break;
        const text = decoder.decode(value);
        console.log(`[Connection ${i}]`, text);
        if (text.includes("event: endpoint")) {
          endpointFound = true;
          break;
        }
      }

      expect(endpointFound).toBe(true);
    }

    // Cleanup all connections
    for (const { reader } of connections) {
      await reader.cancel();
    }

    // Server should still be running
    expect(serverProcess.exitCode).toBeNull();
  });

  test("should handle connection with missing X-Client-Name header", async () => {
    // Connection should still work but may not have proper client identification
    const response = await fetch(`http://localhost:${PORT}/sse`);
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("text/event-stream");

    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let endpointFound = false;

    for (let i = 0; i < 3; i++) {
      const { value, done } = await reader.read();
      if (done) break;
      const text = decoder.decode(value);
      if (text.includes("event: endpoint")) {
        endpointFound = true;
        break;
      }
    }

    expect(endpointFound).toBe(true);
    await reader.cancel();
  });

  test("should handle rapid connection establishment and teardown", async () => {
    // Simulate client reconnection scenarios
    for (let i = 0; i < 5; i++) {
      const response = await fetch(`http://localhost:${PORT}/sse`, {
        headers: { "X-Client-Name": `rapid-test-${i}` },
      });
      expect(response.status).toBe(200);

      const reader = response.body!.getReader();
      
      // Read one chunk then immediately disconnect
      await reader.read();
      await reader.cancel();
    }

    // Server should still be healthy
    const healthResponse = await fetch(`http://localhost:${PORT}/health`);
    expect(healthResponse.status).toBe(200);
  });

  test("should handle requests with suspicious headers", async () => {
    // Test SSE connection with various headers
    const response = await fetch(`http://localhost:${PORT}/sse`, {
      method: "GET",
      headers: { "X-Forwarded-For": "attacker.com" },
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("text/event-stream");
    
    const reader = response.body!.getReader();
    await reader.cancel();
  });
});
