#!/usr/bin/env node
import "./env.js";
/**
 * CyberMem MCP Server
 *
 * Supports two modes:
 * 1. Local/Server Mode (default): Uses openmemory-js SDK directly.
 * 2. Remote Client Mode (with --url): Proxies requests to a remote CyberMem server via HTTP.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { InitializeRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { AsyncLocalStorage } from "async_hooks";
import axios from "axios";
import cors from "cors";
import express from "express";
import { z } from "zod";
import { login, logout, showStatus } from "./auth";

// Redirect all stdout to stderr IMMEDIATELY to protect Stdio protocol
const originalStdoutWrite = process.stdout.write.bind(process.stdout);
(process.stdout as any).write = (chunk: any, encoding: any, callback: any) => {
  const str = typeof chunk === "string" ? chunk : chunk.toString();
  // Allow ONLY protocol messages (must be JSON-RPC)
  if (str.includes('"jsonrpc":')) {
    return originalStdoutWrite(chunk, encoding, callback);
  }
  return process.stderr.write(chunk, encoding, callback);
};

// Also redirect console outputs
console.log = console.error;
console.info = console.error;

// Async Storage for Request Context (User ID and Client Name)
const requestContext = new AsyncLocalStorage<{
  userId?: string;
  clientName?: string;
}>();

// Handle CLI auth commands first
const args = process.argv.slice(2);

if (args.includes("--login")) {
  login()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("Login failed:", err.message);
      process.exit(1);
    });
} else if (args.includes("--logout")) {
  logout();
  process.exit(0);
} else if (args.includes("--status")) {
  showStatus();
  process.exit(0);
} else {
  startServer();
}

async function startServer() {
  const getArg = (name: string) => {
    const idx = args.indexOf(name);
    return idx !== -1 && args[idx + 1] ? args[idx + 1] : undefined;
  };

  const cliUrl = getArg("--url");
  const cliToken = getArg("--token") || getArg("--api-key");
  let stdioClientName: string | undefined = undefined;

  // Protocol Instructions
  const CYBERMEM_INSTRUCTIONS = `CyberMem is a persistent context daemon for AI agents.
PROTOCOL:
1. On session start: call query_memory("user context profile")
2. Store new insights immediately with add_memory (FULL content)
3. Always include tags: [topic, year, source:your-client-name]
For full protocol: https://docs.cybermem.dev/agent-protocol`;

  const server = new McpServer(
    { name: "cybermem", version: "0.7.5" },
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
        version: "0.7.5",
      },
    };
  });

  // --- IMPLEMENTATION LOGIC ---

  let memory: any = null;
  let apiClient: any = null;

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
    // Dynamically inject client name from context or discovery
    apiClient.interceptors.request.use((config: any) => {
      const ctx = requestContext.getStore();
      config.headers["X-Client-Name"] =
        ctx?.clientName || stdioClientName || "unknown-mcp-client";
      return config;
    });
  } else {
    // LOCAL SDK MODE
    const homedir = process.env.HOME || process.env.USERPROFILE || "";
    // FORCE absolute standardized path for consistency across components
    const path = await import("path");
    const dbPath = path.resolve(homedir, ".cybermem/data/openmemory.sqlite");
    process.env.OM_DB_PATH = dbPath;

    // Ensure directory exists
    const fs = await import("fs");
    try {
      const dir = path.dirname(dbPath);
      if (dir) fs.mkdirSync(dir, { recursive: true });
    } catch {}

    try {
      // Dynamic import to ensure env vars are set before loading SDK
      // We import from dist/core/memory directly to avoid triggering the server side-effects in openmemory-js/dist/index.js
      // @ts-ignore
      const { Memory } = await import("openmemory-js/dist/core/memory.js");
      memory = new Memory();
      (server as any)._memoryReady = true;

      // --- INITIALIZE LOGGING TABLES ---
      const sqlite3 = await import("sqlite3");
      const db = new sqlite3.default.Database(dbPath);
      db.configure("busyTimeout", 5000);
      db.serialize(() => {
        db.run("PRAGMA journal_mode=WAL;", (err: any) => {
          if (err) console.error("[MCP] Init WAL error:", err.message);
        });
        db.run(
          `CREATE TABLE IF NOT EXISTS cybermem_stats (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            client_name TEXT NOT NULL,
            operation TEXT NOT NULL,
            count INTEGER DEFAULT 0,
            errors INTEGER DEFAULT 0,
            last_updated INTEGER NOT NULL,
            UNIQUE(client_name, operation)
        );`,
          (err: any) => {
            if (err)
              console.error("[MCP] Init stats table error:", err.message);
          },
        );
        db.run(
          `CREATE TABLE IF NOT EXISTS cybermem_access_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp INTEGER NOT NULL,
            client_name TEXT NOT NULL,
            client_version TEXT,
            method TEXT NOT NULL,
            endpoint TEXT NOT NULL,
            operation TEXT NOT NULL,
            status TEXT NOT NULL,
            is_error INTEGER DEFAULT 0
        );`,
          (err: any) => {
            if (err)
              console.error("[MCP] Init access_log table error:", err.message);
          },
        );
      });
      db.close();
    } catch (e) {
      console.error("Failed to initialize OpenMemory SDK:", e);
      (server as any)._memoryReady = false;
    }
  }

  // Helper to log activity to SQLite (Local SDK Mode only)
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
      providedClient || ctx?.clientName || stdioClientName || "unknown-client";

    try {
      const dbPath = process.env.OM_DB_PATH!;
      const sqlite3 = await import("sqlite3");
      const db = new sqlite3.default.Database(dbPath);
      db.configure("busyTimeout", 5000);

      const ts = Date.now();
      const is_error = status >= 400 ? 1 : 0;

      console.error(
        `[MCP] Logging ${operation} for ${client} (status: ${status})`,
      );

      db.serialize(() => {
        // Log to access_log
        db.run(
          `INSERT INTO cybermem_access_log
          (timestamp, client_name, client_version, method, endpoint, operation, status, is_error)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            ts,
            client,
            "0.7.0",
            method,
            endpoint,
            operation,
            status.toString(),
            is_error,
          ],
          (err: any) => {
            if (err) console.error("[MCP] Log access error:", err.message);
          },
        );

        // Log to stats (Upsert)
        db.run(
          `INSERT INTO cybermem_stats (client_name, operation, count, errors, last_updated)
          VALUES (?, ?, 1, ?, ?)
          ON CONFLICT(client_name, operation) DO UPDATE SET
            count = count + 1,
            errors = errors + ?,
            last_updated = ?`,
          [client, operation, is_error, ts, is_error, ts],
          (err: any) => {
            if (err) console.error("[MCP] Log stats error:", err.message);
          },
        );
      });

      db.close();
    } catch (e) {
      console.error("Failed to log activity to SQLite:", e);
    }
  };

  const addSourceTag = (tags: string[] = []) => {
    if (!tags.some((t) => t.startsWith("source:"))) {
      const clientName =
        requestContext.getStore()?.clientName || stdioClientName || "unknown";
      tags.push(`source:${clientName}`);
    }
    return tags;
  };

  // Helper to get current User ID from context or args
  const getContextUserId = (argsUserId?: string) => {
    const store = requestContext.getStore();
    return argsUserId || store?.userId;
  };

  // --- TOOLS ---

  server.registerTool(
    "add_memory",
    {
      description: "Store a new memory. " + CYBERMEM_INSTRUCTIONS,
      inputSchema: z.object({
        content: z.string(),
        user_id: z.string().optional(),
        tags: z.array(z.string()).optional(),
      }),
    },
    async (args: any) => {
      const tags = addSourceTag(args.tags);
      const userId = getContextUserId(args.user_id);

      if (cliUrl) {
        const res = await apiClient.post("/add", {
          ...args,
          user_id: userId,
          tags,
        });
        return { content: [{ type: "text", text: JSON.stringify(res.data) }] };
      } else {
        try {
          const res = await memory!.add(args.content, {
            user_id: userId,
            tags,
          });
          await logActivity("create", {
            method: "POST",
            endpoint: "/memory/add",
            status: 200,
          });
          return { content: [{ type: "text", text: JSON.stringify(res) }] };
        } catch (e: any) {
          await logActivity("create", {
            method: "POST",
            endpoint: "/memory/add",
            status: 500,
          });
          throw e;
        }
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
      const userId = getContextUserId(); // Search is scoped to user if provided

      if (cliUrl) {
        const res = await apiClient.post("/query", args);
        return { content: [{ type: "text", text: JSON.stringify(res.data) }] };
      } else {
        try {
          const res = await memory!.search(args.query, {
            limit: args.k,
            user_id: userId,
          });
          await logActivity("read", {
            method: "POST",
            endpoint: "/memory/query",
            status: 200,
          });
          return { content: [{ type: "text", text: JSON.stringify(res) }] };
        } catch (e: any) {
          await logActivity("read", {
            method: "POST",
            endpoint: "/memory/query",
            status: 500,
          });
          throw e;
        }
      }
    },
  );

  server.registerTool(
    "list_memories",
    {
      description: "List recent memories",
      inputSchema: z.object({ limit: z.number().default(10) }),
    },
    async (args) => {
      const userId = getContextUserId();

      if (cliUrl) {
        try {
          const res = await apiClient.get(`/all?limit=${args.limit}`);
          return {
            content: [{ type: "text", text: JSON.stringify(res.data) }],
          };
        } catch {
          const res = await apiClient.post("/query", {
            query: "",
            k: args.limit,
          });
          return {
            content: [{ type: "text", text: JSON.stringify(res.data) }],
          };
        }
      } else {
        const res = await memory!.search("", {
          limit: args.limit,
          user_id: userId,
        });
        await logActivity("read", {
          method: "GET",
          endpoint: "/memory/all",
          status: 200,
        });
        return { content: [{ type: "text", text: JSON.stringify(res) }] };
      }
    },
  );

  server.registerTool(
    "delete_memory",
    {
      description: "Delete memory by ID",
      inputSchema: z.object({ id: z.string() }),
    },
    async (args: any) => {
      if (cliUrl) {
        const res = await apiClient.delete(`/${args.id}`);
        return { content: [{ type: "text", text: JSON.stringify(res.data) }] };
      } else {
        const dbPath = process.env.OM_DB_PATH!;
        const sqlite3 = await import("sqlite3");
        const db = new sqlite3.default.Database(dbPath);
        db.configure("busyTimeout", 5000);

        return new Promise((resolve, reject) => {
          db.serialize(() => {
            db.run("BEGIN TRANSACTION");
            db.run("DELETE FROM memories WHERE id = ?", [args.id]);
            db.run("DELETE FROM vectors WHERE id = ?", [args.id]);
            db.run("DELETE FROM waypoints WHERE src_id = ? OR dst_id = ?", [
              args.id,
              args.id,
            ]);
            db.run("COMMIT", async (err: any) => {
              db.close();
              if (err) {
                await logActivity("delete", {
                  method: "DELETE",
                  endpoint: `/memory/${args.id}`,
                  status: 500,
                });
                reject(
                  new Error(
                    `Failed to delete memory ${args.id}: ${err.message}`,
                  ),
                );
              } else {
                await logActivity("delete", {
                  method: "DELETE",
                  endpoint: `/memory/${args.id}`,
                  status: 200,
                });
                resolve({
                  content: [
                    { type: "text", text: `Memory ${args.id} deleted` },
                  ],
                });
              }
            });
          });
        });
      }
    },
  );

  server.registerTool(
    "update_memory",
    {
      description: "Update memory",
      inputSchema: z.object({ id: z.string(), content: z.string().optional() }),
    },
    async (args: any) => {
      await logActivity("update", {
        method: "PATCH",
        endpoint: `/memory/${args.id}`,
        status: 501,
      });
      return { content: [{ type: "text", text: "Update not implemented" }] };
    },
  );

  // --- TRANSPORT ---

  const useHttp = args.includes("--http") || args.includes("--port");

  if (useHttp) {
    const port = parseInt(getArg("--port") || "3100", 10);
    const app = express();
    app.use(cors());
    app.use(express.json());

    app.get("/health", (req: express.Request, res: express.Response) =>
      res.json({
        ok: (server as any)._memoryReady,
        version: "0.7.5",
        mode: cliUrl ? "proxy" : "sdk",
        ready: (server as any)._memoryReady,
      }),
    );

    app.get("/metrics", async (req: express.Request, res: express.Response) => {
      try {
        const dbPath = process.env.OM_DB_PATH!;
        const sqlite3 = await import("sqlite3");
        const db = new sqlite3.default.Database(dbPath);
        db.configure("busyTimeout", 5000);

        const getCount = (query: string): Promise<number> =>
          new Promise((resolve) =>
            db.get(query, (err, row: any) => resolve(row?.count || 0)),
          );

        const memoriesCount = await getCount(
          "SELECT COUNT(*) as count FROM memories",
        );
        const totalRequests = await getCount(
          "SELECT COUNT(*) as count FROM cybermem_access_log",
        );
        const errorRequests = await getCount(
          "SELECT COUNT(*) as count FROM cybermem_access_log WHERE is_error = 1",
        );
        const uniqueClients = await getCount(
          "SELECT COUNT(DISTINCT client_name) as count FROM cybermem_access_log",
        );

        db.close();

        const metrics = [
          "# HELP openmemory_memories_total Total number of memories",
          "# TYPE openmemory_memories_total gauge",
          `openmemory_memories_total ${memoriesCount}`,
          "# HELP openmemory_requests_aggregate_total Total requests logged in SQLite",
          "# TYPE openmemory_requests_aggregate_total counter",
          `openmemory_requests_aggregate_total ${totalRequests}`,
          "# HELP openmemory_errors_total Total errors logged in SQLite",
          "# TYPE openmemory_errors_total counter",
          `openmemory_errors_total ${errorRequests}`,
          "# HELP openmemory_clients_total Total unique clients logged in SQLite",
          "# TYPE openmemory_clients_total gauge",
          `openmemory_clients_total ${uniqueClients}`,
          "# HELP openmemory_success_rate_aggregate Success rate from SQLite logs",
          "# TYPE openmemory_success_rate_aggregate gauge",
          `openmemory_success_rate_aggregate ${totalRequests > 0 ? ((totalRequests - errorRequests) / totalRequests) * 100 : 100}`,
        ].join("\n");

        res.set("Content-Type", "text/plain").send(metrics);
      } catch (e: any) {
        res.status(500).send(`# Error: ${e.message}`);
      }
    });

    app.use(
      (
        req: express.Request,
        res: express.Response,
        next: express.NextFunction,
      ) => {
        const userId = req.headers["x-user-id"] as string | undefined;
        const clientName =
          (req.headers["x-client-name"] as string) ||
          (req.headers["user-agent"] as string);
        requestContext.run({ userId, clientName }, next);
      },
    );

    if (!cliUrl && memory) {
      app.post("/add", async (req: express.Request, res: express.Response) => {
        try {
          const contextUserId = requestContext.getStore()?.userId;
          const { content, user_id, tags } = req.body;
          const finalTags = addSourceTag(tags);
          const result = await memory!.add(content, {
            user_id: user_id || contextUserId,
            tags: finalTags,
          });
          await logActivity("create", {
            client: "rest-api",
            method: "POST",
            endpoint: "/add",
            status: 200,
          });
          res.json(result);
        } catch (e: any) {
          await logActivity("create", {
            client: "rest-api",
            method: "POST",
            endpoint: "/add",
            status: 500,
          });
          res.status(500).json({ error: e.message });
        }
      });

      app.post(
        "/query",
        async (req: express.Request, res: express.Response) => {
          try {
            const contextUserId = requestContext.getStore()?.userId;
            const { query, k } = req.body;
            const result = await memory!.search(query || "", {
              limit: k || 5,
              user_id: contextUserId,
            });
            await logActivity("read", {
              client: "rest-api",
              method: "POST",
              endpoint: "/query",
              status: 200,
            });
            res.json(result);
          } catch (e: any) {
            await logActivity("read", {
              client: "rest-api",
              method: "POST",
              endpoint: "/query",
              status: 500,
            });
            res.status(500).json({ error: e.message });
          }
        },
      );

      app.get("/all", async (req: express.Request, res: express.Response) => {
        try {
          const contextUserId = requestContext.getStore()?.userId;
          const limit = parseInt(req.query.limit as string) || 10;
          const result = await memory!.search("", {
            limit,
            user_id: contextUserId,
          });
          await logActivity("read", {
            client: "rest-api",
            method: "GET",
            endpoint: "/all",
            status: 200,
          });
          res.json(result);
        } catch (e: any) {
          await logActivity("read", {
            client: "rest-api",
            method: "GET",
            endpoint: "/all",
            status: 500,
          });
          res.status(500).json({ error: e.message });
        }
      });
    }

    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => crypto.randomUUID(),
    });

    app.all(
      "/mcp",
      async (req: express.Request, res: express.Response) =>
        await transport.handleRequest(req, res, req.body),
    );

    app.all(
      "/sse",
      async (req: express.Request, res: express.Response) =>
        await transport.handleRequest(req, res, req.body),
    );

    server.connect(transport).then(() => {
      app.listen(port, () => {
        console.error(
          `CyberMem MCP (ready: ${(server as any)._memoryReady}) running on http://localhost:${port}`,
        );
      });
    });
  } else {
    const transport = new StdioServerTransport();
    server
      .connect(transport)
      .then(() => console.error("CyberMem MCP connected via STDIO"));
  }
}
