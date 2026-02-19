#!/usr/bin/env node

/**
 * CyberMem Attribution Verifier
 * This script simulates a local MCP client (like Antigravity) connecting via STDIO
 * and calling a tool to verify that the client attribution in logs is correct.
 */

const { spawn } = require("child_process");
const path = require("path");

const MCP_SERVER_PATH = path.join(__dirname, "../packages/mcp/dist/index.js");
const TEST_CLIENT_NAME = "antigravity-verifier";

console.log("🚀 Starting MCP Attribution Verification...");

// 1. Spawn the server in STDIO mode
const server = spawn("node", [MCP_SERVER_PATH], {
  stdio: ["pipe", "pipe", "pipe"], // Capture stdout (protocol) and stderr (logs)
  env: {
    ...process.env,
    OM_DB_PATH: ":memory:", // Use memory DB for isolation
    CYBERMEM_INSTANCE: "verification-test",
  },
});

let logOutput = "";
server.stderr.on("data", (data) => {
  logOutput += data.toString();
});

let protocolOutput = "";
server.stdout.on("data", (data) => {
  protocolOutput += data.toString();
});

// 2. Helper to send JSON-RPC messages
function sendMessage(message) {
  server.stdin.write(JSON.stringify(message) + "\n");
}

// 3. Flow: Initialize -> Call Tool -> Verify Logs
async function runTest() {
  console.log("📤 Sending initialize handshake...");
  sendMessage({
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
  });

  // Wait for initialized
  await new Promise((resolve) => setTimeout(resolve, 500));

  console.log("📤 Sending query_memory tool call...");
  sendMessage({
    jsonrpc: "2.0",
    id: 2,
    method: "tools/call",
    params: {
      name: "query_memory",
      arguments: {
        query: "test",
      },
    },
  });

  // Wait for tool execution and logging
  await new Promise((resolve) => setTimeout(resolve, 1000));

  console.log("🛑 Terminating server...");
  server.kill();

  console.log("🔍 Checking logs for attribution...");
  const expectedLogLine = `[MCP-LOG] client=${TEST_CLIENT_NAME} tool=query_memory`;

  if (logOutput.includes(expectedLogLine)) {
    console.log("\x1b[32m✅ SUCCESS:\x1b[0m Attribution correct!");
    console.log(`Found in stderr: ${expectedLogLine}`);
    process.exit(0);
  } else {
    console.error("\x1b[31m❌ FAILURE:\x1b[0m Attribution not found in logs.");
    console.log("--- LOG DUMP (stderr) ---");
    console.log(logOutput);
    console.log("--- PROTOCOL DUMP (stdout) ---");
    console.log(protocolOutput);
    console.log("-------------------");
    process.exit(1);
  }
}

runTest().catch((err) => {
  console.error("💥 Test Crashed:", err);
  server.kill();
  process.exit(1);
});
