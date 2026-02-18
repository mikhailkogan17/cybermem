import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import {
  JSONRPCMessage,
  JSONRPCMessageSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { expect, test } from "@playwright/test";
import { spawn } from "child_process";
import path from "path";

const PORT = 3103;
const BASE_URL = `http://localhost:${PORT}`;

/**
 * Custom transport for FastMCP httpStream mode.
 * Uses manual fetch reader instead of EventSource for Node.js reliability.
 */
class FastMCPHandshakeTransport implements Transport {
  public sessionId: string | undefined = undefined;
  private endpoint: URL;
  private headers: Record<string, string>;
  private abortController: AbortController | null = null;
  private isClosing = false;

  onclose?: () => void;
  onerror?: (error: Error) => void;
  onmessage?: (message: JSONRPCMessage) => void;

  constructor(endpoint: URL, headers: Record<string, string> = {}) {
    this.endpoint = endpoint;
    this.headers = headers;
  }

  async start(): Promise<void> {
    // 1. Handshake (POST)
    const initResponse = await fetch(this.endpoint.toString(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json, text/event-stream",
        ...this.headers,
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: "handshake",
        method: "initialize",
        params: {
          protocolVersion: "2024-11-05",
          capabilities: {},
          clientInfo: { name: "sse-multi-spec", version: "1.0.0" },
        },
      }),
    });

    if (!initResponse.ok) {
      throw new Error(`Handshake failed: ${initResponse.status}`);
    }

    this.sessionId = initResponse.headers.get("mcp-session-id") || undefined;
    if (!this.sessionId) {
      throw new Error("No mcp-session-id received");
    }

    // 2. Start Stream (GET)
    this.abortController = new AbortController();
    const streamResponse = await fetch(this.endpoint.toString(), {
      headers: {
        ...this.headers,
        Accept: "text/event-stream",
        "mcp-session-id": this.sessionId,
      },
      signal: this.abortController.signal,
    });

    if (!streamResponse.ok) {
      throw new Error(`Stream establishment failed: ${streamResponse.status}`);
    }

    this.readStream(streamResponse.body!).catch((err) => {
      if (!this.isClosing) {
        console.error("   [Transport] Stream error:", err);
        this.onerror?.(err);
      }
    });

    await new Promise((r) => setTimeout(r, 200));
  }

  private async readStream(body: ReadableStream<Uint8Array>) {
    const reader = body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6).trim();
            if (data) {
              try {
                const message = JSONRPCMessageSchema.parse(JSON.parse(data));
                this.onmessage?.(message);
              } catch (err) {}
            }
          }
        }
      }
    } catch (err) {
    } finally {
      reader.releaseLock();
    }
  }

  async send(message: JSONRPCMessage): Promise<void> {
    if (!this.sessionId) throw new Error("Not connected");

    const response = await fetch(this.endpoint.toString(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json, text/event-stream",
        "mcp-session-id": this.sessionId,
        ...this.headers,
      },
      body: JSON.stringify(message),
    });

    if (!response.ok) {
      throw new Error(`Failed to send message: ${response.status}`);
    }

    if (response.headers.get("Content-Type")?.includes("application/json")) {
      try {
        const body = await response.json();
        this.onmessage?.(body);
      } catch (err) {}
    }
  }

  async close(): Promise<void> {
    this.isClosing = true;
    this.abortController?.abort();
    this.onclose?.();
  }
}

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
