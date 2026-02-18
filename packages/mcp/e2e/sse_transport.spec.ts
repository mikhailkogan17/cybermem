import { expect, test } from "@playwright/test";
import { ChildProcess, spawn } from "child_process";
import path from "path";

test.describe("MCP SSE Transport", () => {
  let serverProcess: ChildProcess;
  const PORT = 3101; // Use unique port for this test

  test.setTimeout(120000);

  test.beforeAll(async () => {
    // Start the server in http mode
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
      serverProcess.stderr?.on("data", (data) => {
        const output = data.toString();
        console.log("[Server]", output);
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
    serverProcess.kill();
  });

  test("should establish SSE connection without crashing", async () => {
    const response = await fetch(`http://localhost:${PORT}/sse`);
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("text/event-stream");

    // Read stream for a bit to ensure it doesn't close immediately due to error
    const reader = response.body?.getReader();
    expect(reader).toBeDefined();

    const decoder = new TextDecoder();
    let endpointFound = false;

    // Read first few chunks
    for (let i = 0; i < 10; i++) {
      const { value, done } = await reader!.read();
      if (done) break;
      const text = decoder.decode(value);
      console.log(`[Chunk ${i}]`, text);
      if (text.includes("event: endpoint")) {
        endpointFound = true;
        break;
      }
    }

    expect(endpointFound).toBe(true);

    // Cleanup connection
    await reader?.cancel();

    // Check if server process is still running (didn't crash)
    expect(serverProcess.exitCode).toBeNull();
  });
});
