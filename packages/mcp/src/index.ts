import "./console-fix.js";
import "./env.js";

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { InitializeRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { AsyncLocalStorage } from "async_hooks";
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

  const cliEnv = getArg("--env");

  if (cliEnv === "staging") {
    console.error("[MCP] Running in Staging environment");
    process.env.CYBERMEM_ENV = "staging";
  }

  // --- IMPLEMENTATION LOGIC ---

  let memory: any = null;
  let sdk_update_memory: any = null;
  let sdk_reinforce_memory: any = null;

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
    console.error(
      "[FATAL] CyberMem cannot start without a working database. " +
        "Check OM_DB_PATH and ensure sqlite3 native bindings are installed.",
    );
    process.exit(1);
  }

  // PERSISTENT LOGGING DB
  let loggingDb: any = null;
  const initLoggingDb = async () => {
    if (loggingDb) return loggingDb;
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

  const logActivity = async (
    operation: string,
    opts: {
      details?: any;
      query?: string;
      memoryId?: string;
      delta?: string;
      tags?: string[];
      sessionId?: string;
      method?: string;
      endpoint?: string;
      status?: number;
    } = {},
  ) => {
    // Determine client name (priority: specific > store > default)
    let client: string;
    const ctx = requestContext.getStore();

    if (opts.sessionId) {
      client = "sse-client"; // TODO: Extract real client name from session state
    } else if (ctx) {
      client = ctx.clientName || stdioClientName || "unknown";
    } else {
      client = stdioClientName || "unknown";
    }

    if (!loggingDb) return; // Use loggingDb for the check

    const {
      method = "POST",
      endpoint = "/mcp",
      status = 200,
      details,
      query,
      memoryId,
      delta,
      tags,
    } = opts;
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

  // Factory to create configured McpServer instance
  const createConfiguredServer = () => {
    const server = new McpServer(
      { name: "cybermem", version: "0.12.4" },
      {
        instructions: CYBERMEM_INSTRUCTIONS,
      },
    );

    // access underlying server
    (server as unknown as McpServer & { _memoryReady: boolean })._memoryReady =
      true;

    // Load available tools
    const tools = (server as unknown as McpServer & { _tools: any })._tools;

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

    // access underlying server
    server.server.setRequestHandler(
      InitializeRequestSchema,
      async (request) => {
        // For SSE multiple clients, stdioClientName global is less useful,
        // but we can set it for context if running in single-user mode.
        // For multi-user, rely on requestContext.
        stdioClientName = request.params.clientInfo.name;
        console.error(
          `[MCP] Client identified via handshake: ${request.params.clientInfo.name}`,
        );
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
      },
    );

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
      async (args: { content: string; tags?: string[] }) => {
        const res = await memory!.add(args.content, { tags: args.tags });
        await logActivity("create", {
          method: "POST",
          endpoint: "/memory/add",
          status: 200,
        });
        return { content: [{ type: "text", text: JSON.stringify(res) }] };
      },
    );

    server.registerTool(
      "query_memory",
      {
        description: "Search memories.",
        inputSchema: z.object({ query: z.string(), k: z.number().default(50) }),
      },
      async (args: { query: string; k?: number }) => {
        const res = await memory!.search(args.query, { limit: args.k });
        await logActivity("read", {
          method: "POST",
          endpoint: "/memory/query",
          status: 200,
        });
        return { content: [{ type: "text", text: JSON.stringify(res) }] };
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
        if (!sdk_update_memory) throw new Error("Update not available in SDK");
        const res = await sdk_update_memory(args.id, args.content, args.tags);
        await logActivity("update", {
          method: "PATCH",
          endpoint: `/memory/${args.id}`,
          status: 200,
        });
        return { content: [{ type: "text", text: JSON.stringify(res) }] };
      },
    );

    server.registerTool(
      "reinforce_memory",
      {
        description:
          "Metabolic boost (salience). LOW COST: prevents decay without mutation. Use for active topics.",
        inputSchema: z.object({
          id: z.string(),
          boost: z.number().default(0.1),
        }),
      },
      async (args: any) => {
        if (!sdk_reinforce_memory)
          throw new Error("Reinforce not available in SDK");
        const res = await sdk_reinforce_memory(args.id, args.boost);
        await logActivity("update", {
          method: "POST",
          endpoint: `/memory/${args.id}/reinforce`,
          status: 200,
        });
        return { content: [{ type: "text", text: "Reinforced" }] };
      },
    );

    server.registerTool(
      "delete_memory",
      {
        description: "Delete memory",
        inputSchema: z.object({ id: z.string() }),
      },
      async (args: any) => {
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
      },
    );

    return server;
  };

  // EXPRESS SERVER
  // HTTP server mode for Docker/Traefik deployment
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
    });

    if (memory) {
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

    // MULTI-SESSION SSE SUPPORT
    const sessions = new Map<
      string,
      {
        server: McpServer;
        transport: SSEServerTransport;
      }
    >();

    // Legacy MCP endpoint - 410 Gone
    app.all("/mcp", (req, res) => {
      res
        .status(410)
        .send(
          "Endpoint /mcp is deprecated. Please update your client configuration to use /sse for Server-Sent Events.",
        );
    });

    app.get("/sse", async (req, res) => {
      console.error("[MCP] Attempting SSE Connection...");
      const transport = new SSEServerTransport("/message", res);
      const newServer = createConfiguredServer();

      try {
        newServer.connect(transport);
        sessions.set(transport.sessionId, { server: newServer, transport });

        transport.onclose = () => {
          console.error(`[MCP] SSE Connection Closed: ${transport.sessionId}`);
          sessions.delete(transport.sessionId);
        };
        transport.onerror = (err: Error) => {
          console.error(
            `[MCP] SSE Connection Error: ${transport.sessionId}`,
            err,
          );
          sessions.delete(transport.sessionId);
        };

        await transport.start();
      } catch (err) {
        console.error("[MCP] Failed to start SSE transport:", err);
        sessions.delete(transport.sessionId);
        // If headers haven't been sent, send 500
        if (!res.headersSent) {
          res.status(500).send("Internal Server Error during SSE handshake");
        }
      }
    });

    app.post("/message", async (req, res) => {
      const sessionId = req.query.sessionId as string;
      const session = sessions.get(sessionId);
      if (!session) {
        res.status(404).send("Session not found");
        return;
      }
      await session.transport.handlePostMessage(req, res);
    });

    app.listen(port, () =>
      console.error(`CyberMem MCP running on http://localhost:${port}`),
    );
  } else {
    // STDIO
    const transport = new StdioServerTransport();
    const server = createConfiguredServer();
    server
      .connect(transport)
      .then(() => console.error("CyberMem MCP connected via STDIO"));
  }
}
