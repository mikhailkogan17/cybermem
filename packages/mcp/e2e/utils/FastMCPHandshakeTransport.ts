import { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import {
    JSONRPCMessage,
    JSONRPCMessageSchema,
} from "@modelcontextprotocol/sdk/types.js";

/**
 * Shared transport for FastMCP httpStream mode.
 * Uses manual fetch reader instead of EventSource for Node.js reliability.
 *
 * Extracted into a shared utility to avoid duplication across test files.
 */
export class FastMCPHandshakeTransport implements Transport {
  public sessionId: string | undefined = undefined;
  private endpoint: URL;
  private headers: Record<string, string>;
  private abortController: AbortController | null = null;
  private isClosing = false;
  private streamReady: Promise<void> | null = null;

  onclose?: () => void;
  onerror?: (error: Error) => void;
  onmessage?: (message: JSONRPCMessage) => void;

  constructor(
    endpoint: URL,
    headers: Record<string, string> = {},
    private clientName: string = "test-client",
  ) {
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
          clientInfo: { name: this.clientName, version: "1.0.0" },
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

    // Event-driven stream readiness: resolve when the first chunk is received
    let resolveStreamReady: () => void;
    this.streamReady = new Promise((r) => {
      resolveStreamReady = r;
    });

    this.readStream(streamResponse.body!, () => resolveStreamReady()).catch(
      (err) => {
        if (!this.isClosing) {
          console.error("   [Transport] Stream error:", err);
          this.onerror?.(err);
        }
      },
    );

    // Wait for stream to be established (first chunk received or timeout)
    await Promise.race([
      this.streamReady,
      new Promise((r) => setTimeout(r, 2000)),
    ]);
  }

  private async readStream(
    body: ReadableStream<Uint8Array>,
    onFirstChunk?: () => void,
  ) {
    const reader = body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let firstChunkReceived = false;

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        // Signal stream readiness on first data
        if (!firstChunkReceived) {
          firstChunkReceived = true;
          onFirstChunk?.();
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.trim() === "") continue;
          if (line.startsWith("data: ")) {
            const data = line.slice(6).trim();
            if (data) {
              try {
                const message = JSONRPCMessageSchema.parse(JSON.parse(data));
                this.onmessage?.(message);
              } catch (err) {
                // Not a valid JSON-RPC message, skip
              }
            }
          }
        }
      }
    } catch (err) {
      if (!this.isClosing) {
        console.error("   [Transport] Reader error:", err);
      }
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

    // If result is in the response (enableJsonResponse: true), emit it
    if (response.headers.get("Content-Type")?.includes("application/json")) {
      try {
        const body = await response.json();
        this.onmessage?.(body);
      } catch (err) {
        // Not JSON or empty (e.g. 202 accepted) - ignore
      }
    }
  }

  async close(): Promise<void> {
    this.isClosing = true;
    this.abortController?.abort();
    this.onclose?.();
  }
}
