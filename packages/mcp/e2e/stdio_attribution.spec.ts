import { expect, test } from "@playwright/test";
import { spawn } from "child_process";
import path from "path";

const TEST_CLIENT_NAME = "antigravity-e2e-stdio";

test("MCP:E2E (STDIO Attribution) — Verified handshake identity propagates to logs", async () => {
  const serverPath = path.join(__dirname, "../dist/index.js");

  // 1. Spawn the server in STDIO mode
  const server = spawn("node", [serverPath], {
    env: {
      ...process.env,
      OM_DB_PATH: ":memory:",
      CYBERMEM_INSTANCE: "stdio-e2e-test",
    },
  });

  let logOutput = "";
  // In STDIO mode, console.log is redirected to stderr by console-fix.ts
  server.stderr?.on("data", (data) => {
    logOutput += data.toString();
  });

  // 2. Send initialize handshake with custom clientInfo
  server.stdin?.write(
    JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: {
          name: TEST_CLIENT_NAME,
          version: "1.0.0",
        },
      },
    }) + "\n",
  );

  // Wait for initialization to be processed
  await new Promise((r) => setTimeout(r, 500));

  // 3. Send tool call
  server.stdin?.write(
    JSON.stringify({
      jsonrpc: "2.0",
      id: 2,
      method: "tools/call",
      params: {
        name: "query_memory",
        arguments: {
          query: "test attribution",
        },
      },
    }) + "\n",
  );

  // Wait for tool execution and logging (console.log is async in some buffers)
  await new Promise((r) => setTimeout(r, 1000));

  // Cleanup
  server.kill();

  // 4. Assert that the log output contains the correctly attributed client name
  const expectedLogLine = `[MCP-LOG] client=${TEST_CLIENT_NAME} tool=query_memory`;

  if (!logOutput.includes(expectedLogLine)) {
    console.log("Full stderr received:", logOutput);
  }

  expect(logOutput).toContain(expectedLogLine);
});
