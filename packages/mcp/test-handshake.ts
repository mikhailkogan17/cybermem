import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { EventSource } from "eventsource";

(global as any).EventSource = EventSource;

async function test() {
  const url = new URL("http://localhost:3105/mcp");
  console.log("Connecting to:", url.toString());

  const transport = new SSEClientTransport(url);
  const client = new Client(
    { name: "test", version: "1.0.0" },
    { capabilities: {} },
  );

  try {
    await client.connect(transport);
    console.log("Connected!");
    await transport.close();
  } catch (err) {
    console.error("Connection failed:", err);
  }
}

test();
