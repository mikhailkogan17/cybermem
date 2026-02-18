import { expect, test } from "@playwright/test";
import { ChildProcess, spawn } from "child_process";
import path from "path";

test.describe("MCP SSE Transport Handshake", () => {
  let serverProcess: ChildProcess;
  const PORT = 3101;

  test.setTimeout(120000);

  test.beforeAll(async () => {
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
      serverProcess.stderr?.on("data", (data) => {
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
  });

  test.afterAll(() => {
    if (serverProcess && !serverProcess.killed) {
      serverProcess.kill();
    }
  });

  test("should establishment session and call tool via handshake", async () => {
    const CLIENT_NAME = "e2e-handshake-tester";

    // 1. Handshake (POST initialize)
    const initResponse = await fetch(`http://localhost:${PORT}/mcp`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json, text/event-stream",
        "X-Client-Name": CLIENT_NAME,
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
          protocolVersion: "2024-11-05",
          capabilities: {},
          clientInfo: { name: "e2e", version: "1.0.0" },
        },
      }),
    });

    expect(initResponse.status).toBe(200);
    const sessionId = initResponse.headers.get("mcp-session-id");
    const initBody = await initResponse.json();
    console.log(
      "[Test] Init Headers:",
      JSON.stringify(Object.fromEntries(initResponse.headers.entries())),
    );
    console.log("[Test] Init Body:", JSON.stringify(initBody));
    expect(sessionId).toBeDefined();

    // 2. Open Stream (GET)
    const streamResponse = await fetch(`http://localhost:${PORT}/mcp`, {
      headers: {
        Accept: "text/event-stream",
        "mcp-session-id": sessionId!,
      },
    });
    expect(streamResponse.status).toBe(200);
    const reader = streamResponse.body?.getReader();

    // 3. Call Tool (POST)
    const toolResponse = await fetch(`http://localhost:${PORT}/mcp`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json, text/event-stream",
        "mcp-session-id": sessionId!,
        "X-Client-Name": CLIENT_NAME,
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 2,
        method: "tools/call",
        params: {
          name: "add_memory",
          arguments: { content: "Handshake Test Memory" },
        },
      }),
    });

    expect(toolResponse.status).toBe(200);
    const toolBody = await toolResponse.json();
    console.log("[Test] Tool Result:", JSON.stringify(toolBody));
    expect(toolBody.result).toBeDefined();

    // Cleanup
    await reader?.cancel();
  });
});
