#!/usr/bin/env node
import "./env.js";

// Redirect all stdout to stderr IMMEDIATELY to protect Stdio protocol
const originalStdoutWrite = process.stdout.write.bind(process.stdout);
(process.stdout as any).write = (chunk: any, encoding: any, callback: any) => {
  const str = typeof chunk === "string" ? chunk : chunk.toString();
  if (str.includes('"jsonrpc":')) {
    return originalStdoutWrite(chunk, encoding, callback);
  }
  return process.stderr.write(chunk, encoding, callback);
};

// Also redirect console outputs
console.log = console.error;
console.info = console.error;

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { InitializeRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { AsyncLocalStorage } from "async_hooks";
import axios from "axios";
import cors from "cors";
import express from "express";
import { z } from "zod";

// Async Storage for Request Context (User ID and Client Name)
const requestContext = new AsyncLocalStorage<{
  userId?: string;
  clientName?: string;
}>();

// CLI args processing
const args = process.argv.slice(2);

// Start the server
startServer();

async function startServer() {
  const getArg = (name: string) => {
    const idx = args.indexOf(name);
    return idx !== -1 && args[idx + 1] ? args[idx + 1] : undefined;
  };

  const cliUrl = getArg("--url");
  const cliToken = getArg("--token") || getArg("--api-key");
  const cliEnv = getArg("--env");

  if (cliEnv === "staging") {
    console.error("[MCP] Running in Staging environment");
    process.env.CYBERMEM_ENV = "staging";
  }

  let stdioClientName: string | undefined = undefined;

  // Protocol Instructions
  const CYBERMEM_INSTRUCTIONS = `CyberMem is a persistent context daemon for AI agents.
PROTOCOL:
1. On session start: call query_memory("user context profile")
2. Store new insights immediately with add_memory (STABLE data)
3. For corrections: use update_memory (STRUCTURAL mutation, high cost)
4. To prevent decay: use reinforce_memory (METABOLIC boost, low cost)
5. Always include tags: [topic, year, source:your-client-name]
For full protocol: https://docs.cybermem.dev/agent-protocol`;

  const server = new McpServer(
    { name: "cybermem", version: "0.12.4" },
    {
      instructions: CYBERMEM_INSTRUCTIONS,
    },
  );

  server.registerResource(
    "CyberMem Agent Protocol",
    "cybermem://protocol",
    { description: "Instructions for AI agents", mimeType: "text/plain" },
    async () => ({
      contents: [
        {
          uri: "cybermem://protocol",
          mimeType: "text/plain",
          text: CYBERMEM_INSTRUCTIONS,
        },
      ],
    }),
  );

  // Capture client info from handshake
  // @ts-ignore - access underlying server
  server.server.setRequestHandler(InitializeRequestSchema, async (request) => {
    stdioClientName = request.params.clientInfo.name;
    console.error(`[MCP] Client identified via handshake: ${stdioClientName}`);
    return {
      protocolVersion: "2024-11-05",
      capabilities: {
        tools: { listChanged: true },
        resources: { subscribe: true },
      },
      serverInfo: {
        name: "cybermem",
        version: "0.12.4",
      },
    };
  });

  // --- IMPLEMENTATION LOGIC ---

  let memory: any = null;
  let apiClient: any = null;
  let sdk_update_memory: any = null;
  let sdk_reinforce_memory: any = null;

  if (cliUrl) {
    // REMOTE CLIENT MODE
    console.error(`Connecting to remote CyberMem at ${cliUrl}`);
    apiClient = axios.create({
      baseURL: cliUrl,
      headers: {
        "X-API-Key": cliToken,
        Accept: "application/json, text/event-stream",
        "Content-Type": "application/json",
      },
    });
    apiClient.interceptors.request.use((config: any) => {
      const ctx = requestContext.getStore();
      config.headers["X-Client-Name"] =
        ctx?.clientName || stdioClientName || "antigravity-client";
      return config;
    });
  } else {
    // LOCAL SDK MODE
    const dbPath = process.env.OM_DB_PATH!;
    const fs = await import("fs");
    const path = await import("path");
    try {
      const dir = path.dirname(dbPath);
      if (dir) fs.mkdirSync(dir, { recursive: true });
    } catch {}

    try {
      const { Memory } = await import("openmemory-js/dist/core/memory.js");
      const hsg = await import("openmemory-js/dist/memory/hsg.js");
      sdk_update_memory = hsg.update_memory;
      sdk_reinforce_memory = hsg.reinforce_memory;
      memory = new Memory();
      (server as any)._memoryReady = true;

      // Initialize Tables
      const sqlite3 = await import("sqlite3");
      const db = new sqlite3.default.Database(dbPath);
      db.configure("busyTimeout", 5000);
      db.serialize(() => {
        db.run(
          "CREATE TABLE IF NOT EXISTS cybermem_stats (id INTEGER PRIMARY KEY AUTOINCREMENT, client_name TEXT NOT NULL, operation TEXT NOT NULL, count INTEGER DEFAULT 0, errors INTEGER DEFAULT 0, last_updated INTEGER NOT NULL, UNIQUE(client_name, operation));",
        );
        db.run(
          "CREATE TABLE IF NOT EXISTS cybermem_access_log (id INTEGER PRIMARY KEY AUTOINCREMENT, timestamp INTEGER NOT NULL, client_name TEXT NOT NULL, client_version TEXT, method TEXT NOT NULL, endpoint TEXT NOT NULL, operation TEXT NOT NULL, status TEXT NOT NULL, is_error INTEGER DEFAULT 0);",
        );
        db.run(
          "CREATE TABLE IF NOT EXISTS access_keys (id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))), key_hash TEXT NOT NULL, name TEXT DEFAULT 'default', user_id TEXT DEFAULT 'default', created_at TEXT DEFAULT (datetime('now')), last_used_at TEXT, is_active INTEGER DEFAULT 1);",
        );
      });
      db.close();
    } catch (e) {
      console.error("Failed to initialize OpenMemory SDK:", e);
      (server as any)._memoryReady = false;
    }
  }

  // PERSISTENT LOGGING DB
  let loggingDb: any = null;
  const initLoggingDb = async () => {
    if (loggingDb || cliUrl) return loggingDb;
    const dbPath = process.env.OM_DB_PATH!;
    const sqlite3 = await import("sqlite3");
    loggingDb = new sqlite3.default.Database(dbPath);
    loggingDb.configure("busyTimeout", 10000);
    return new Promise((resolve) => {
      loggingDb.serialize(() => {
        loggingDb.run("PRAGMA journal_mode=WAL;");
        loggingDb.run("PRAGMA synchronous=NORMAL;", () => resolve(loggingDb));
      });
    });
  };

  const logActivity = async (
    operation: string,
    opts: {
      client?: string;
      method?: string;
      endpoint?: string;
      status?: number;
    } = {},
  ) => {
    if (cliUrl || !memory) return;
    const {
      client: providedClient,
      method = "POST",
      endpoint = "/mcp",
      status = 200,
    } = opts;
    const ctx = requestContext.getStore();
    const client =
      providedClient ||
      ctx?.clientName ||
      stdioClientName ||
      "antigravity-client";
    try {
      const db = (await initLoggingDb()) as any;
      const ts = Date.now();
      const is_error = status >= 400 ? 1 : 0;
      db.serialize(() => {
        db.run(
          "INSERT INTO cybermem_access_log (timestamp, client_name, client_version, method, endpoint, operation, status, is_error) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
          [
            ts,
            client,
            "0.12.4",
            method,
            endpoint,
            operation,
            status.toString(),
            is_error,
          ],
        );
        db.run(
          "INSERT INTO cybermem_stats (client_name, operation, count, errors, last_updated) VALUES (?, ?, 1, ?, ?) ON CONFLICT(client_name, operation) DO UPDATE SET count = count + 1, errors = errors + ?, last_updated = ?",
          [client, operation, is_error, ts, is_error, ts],
        );
      });
    } catch {}
  };

  // TOOLS
  server.registerTool(
    "add_memory",
    {
      description:
        "Store a new memory. Use for high-quality, stable data. " +
        CYBERMEM_INSTRUCTIONS,
      inputSchema: z.object({
        content: z.string(),
        tags: z.array(z.string()).optional(),
      }),
    },
    async (args: any) => {
      if (cliUrl) {
        const res = await apiClient.post("/add", args);
        return { content: [{ type: "text", text: JSON.stringify(res.data) }] };
      } else {
        const res = await memory!.add(args.content, { tags: args.tags });
        await logActivity("create", {
          method: "POST",
          endpoint: "/memory/add",
          status: 200,
        });
        return { content: [{ type: "text", text: JSON.stringify(res) }] };
      }
    },
  );

  server.registerTool(
    "query_memory",
    {
      description: "Search memories.",
      inputSchema: z.object({ query: z.string(), k: z.number().default(5) }),
    },
    async (args: any) => {
      if (cliUrl) {
        const res = await apiClient.post("/query", args);
        return { content: [{ type: "text", text: JSON.stringify(res.data) }] };
      } else {
        const res = await memory!.search(args.query, { limit: args.k });
        await logActivity("read", {
          method: "POST",
          endpoint: "/memory/query",
          status: 200,
        });
        return { content: [{ type: "text", text: JSON.stringify(res) }] };
      }
    },
  );

  server.registerTool(
    "update_memory",
    {
      description:
        "Mutate existing memory (content/tags). HIGH COST: re-embeds and re-links. Use for corrections.",
      inputSchema: z.object({
        id: z.string(),
        content: z.string().optional(),
        tags: z.array(z.string()).optional(),
      }),
    },
    async (args: any) => {
      if (cliUrl) {
        const res = await apiClient.patch(`/memory/${args.id}`, args);
        return { content: [{ type: "text", text: JSON.stringify(res.data) }] };
      } else {
        if (!sdk_update_memory) throw new Error("Update not available in SDK");
        const res = await sdk_update_memory(args.id, args.content, args.tags);
        await logActivity("update", {
          method: "PATCH",
          endpoint: `/memory/${args.id}`,
          status: 200,
        });
        return { content: [{ type: "text", text: JSON.stringify(res) }] };
      }
    },
  );

  server.registerTool(
    "reinforce_memory",
    {
      description:
        "Metabolic boost (salience). LOW COST: prevents decay without mutation. Use for active topics.",
      inputSchema: z.object({ id: z.string(), boost: z.number().default(0.1) }),
    },
    async (args: any) => {
      if (cliUrl) {
        const res = await apiClient.post(`/memory/${args.id}/reinforce`, args);
        return { content: [{ type: "text", text: JSON.stringify(res.data) }] };
      } else {
        if (!sdk_reinforce_memory)
          throw new Error("Reinforce not available in SDK");
        await sdk_reinforce_memory(args.id, args.boost);
        await logActivity("update", {
          method: "POST",
          endpoint: `/memory/${args.id}/reinforce`,
          status: 200,
        });
        return { content: [{ type: "text", text: "Reinforced" }] };
      }
    },
  );

  server.registerTool(
    "delete_memory",
    {
      description: "Delete memory",
      inputSchema: z.object({ id: z.string() }),
    },
    async (args: any) => {
      if (cliUrl) {
        const res = await apiClient.delete(`/memory/${args.id}`);
        return { content: [{ type: "text", text: JSON.stringify(res.data) }] };
      } else {
        const dbPath = process.env.OM_DB_PATH!;
        const sqlite3 = await import("sqlite3");
        const db = new sqlite3.default.Database(dbPath);
        return new Promise((resolve, reject) => {
          db.serialize(() => {
            db.run("DELETE FROM memories WHERE id = ?", [args.id]);
            db.run(
              "DELETE FROM vectors WHERE id = ?",
              [args.id],
              async (err: any) => {
                db.close();
                await logActivity("delete", {
                  method: "DELETE",
                  endpoint: `/memory/${args.id}`,
                  status: err ? 500 : 200,
                });
                if (err) reject(err);
                else resolve({ content: [{ type: "text", text: "Deleted" }] });
              },
            );
          });
        });
      }
    },
  );

  // EXPRESS SERVER
  const useHttp = args.includes("--http") || args.includes("--port");
  if (useHttp) {
    const port = parseInt(getArg("--port") || "3100", 10);
    const app = express();
    app.use(cors());
    app.use(express.json());
    app.get("/health", (req, res) => res.json({ ok: true, version: "0.12.4" }));

    app.use((req, res, next) => {
      const clientName =
        (req.headers["x-client-name"] as string) || "antigravity-client";
      requestContext.run({ clientName }, next);
      // next(); // DELETED! Correctly handled by requestContext.run
    });

    if (!cliUrl && memory) {
      app.post("/add", async (req, res) => {
        try {
          const result = await (memory as any)!.add(req.body.content, {
            id: req.body.id,
            tags: req.body.tags,
          });
          await logActivity("create", {
            method: "POST",
            endpoint: "/add",
            status: 200,
          });
          res.json(result);
        } catch (e: any) {
          res.status(500).json({ error: e.message });
        }
      });
      app.post("/query", async (req, res) => {
        try {
          const result = await memory!.search(req.body.query || "", {
            limit: req.body.k || 5,
          });
          await logActivity("read", {
            method: "POST",
            endpoint: "/query",
            status: 200,
          });
          res.json(result);
        } catch (e: any) {
          res.status(500).json({ error: e.message });
        }
      });
      app.get("/all", async (req, res) => {
        try {
          const result = await memory!.search("", { limit: 10 });
          await logActivity("read", {
            method: "GET",
            endpoint: "/all",
            status: 200,
          });
          res.json(result);
        } catch (e: any) {
          res.status(500).json({ error: e.message });
        }
      });
      app.patch("/memory/:id", async (req, res) => {
        try {
          const result = await sdk_update_memory(
            req.params.id,
            req.body.content,
            req.body.tags,
            req.body.metadata,
          );
          await logActivity("update", {
            method: "PATCH",
            endpoint: `/memory/${req.params.id}`,
            status: 200,
          });
          res.json(result);
        } catch (e: any) {
          res.status(500).json({ error: e.message });
        }
      });
      app.post("/memory/:id/reinforce", async (req, res) => {
        try {
          await sdk_reinforce_memory(req.params.id, req.body.boost);
          await logActivity("update", {
            method: "POST",
            endpoint: `/memory/${req.params.id}/reinforce`,
            status: 200,
          });
          res.json({ ok: true });
        } catch (e: any) {
          res.status(500).json({ error: e.message });
        }
      });
      app.delete("/memory/:id", async (req, res) => {
        const dbPath = process.env.OM_DB_PATH!;
        const sqlite3 = await import("sqlite3");
        const db = new sqlite3.default.Database(dbPath);
        db.run(
          "DELETE FROM memories WHERE id = ?",
          [req.params.id],
          async () => {
            db.close();
            await logActivity("delete", {
              method: "DELETE",
              endpoint: `/memory/${req.params.id}`,
              status: 200,
            });
            res.json({ ok: true });
          },
        );
      });
    }

    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => crypto.randomUUID(),
    });
    app.all(
      "/mcp",
      async (req, res) => await transport.handleRequest(req, res, req.body),
    );
    app.all(
      "/sse",
      async (req, res) => await transport.handleRequest(req, res, req.body),
    );

    server.connect(transport).then(() => {
      app.listen(port, () =>
        console.error(`CyberMem MCP running on http://localhost:${port}`),
      );
    });
  } else {
    const transport = new StdioServerTransport();
    server
      .connect(transport)
      .then(() => console.error("CyberMem MCP connected via STDIO"));
  }
}
