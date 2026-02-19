#!/usr/bin/env node
import "./console-fix.js";
import "./env.js";

import { AsyncLocalStorage } from "async_hooks";
import { FastMCP } from "fastmcp";
import { existsSync, mkdirSync, readFileSync } from "fs";
import { dirname, join } from "path";
import { z } from "zod";

// --- CORE SDK IMPORTS ---
import { all_async, run_async } from "openmemory-js/dist/core/db.js";
import { Memory } from "openmemory-js/dist/core/memory.js";
import {
  reinforce_memory,
  update_memory,
} from "openmemory-js/dist/memory/hsg.js";

// --- TYPES ---
interface IMemory {
  add(content: string, opts?: any): Promise<unknown>;
  search(query: string, opts?: any): Promise<unknown>;
  get(id: string): Promise<unknown>;
  delete_all(user_id: string): Promise<unknown>;
  wipe(): Promise<unknown>;
}

// --- GLOBALS & CONTEXT ---
const requestContext = new AsyncLocalStorage<{ clientName?: string }>();

let PACKAGE_VERSION = "0.0.0";
try {
  const packageJsonPath = join(__dirname, "../package.json");
  const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"));
  PACKAGE_VERSION = packageJson.version;
} catch {}

const VALID_VERSION = (
  PACKAGE_VERSION.match(/^\d+\.\d+\.\d+$/) ? PACKAGE_VERSION : "0.0.0"
) as `${number}.${number}.${number}`;

const CYBERMEM_INSTRUCTIONS = `CyberMem is a persistent context daemon for AI agents.
PROTOCOL:
1. On session start: call query_memory("user context profile")
2. Store insights immediately with add_memory
3. Corrections: update_memory
4. Decay prevention: reinforce_memory
Full protocol: https://docs.cybermem.dev/agent-protocol`;

// --- ERROR TRAPPING ---
process.on("uncaughtException", (err) => {
  console.error("[CRITICAL] Uncaught Exception:", err);
});
process.on("unhandledRejection", (reason) => {
  console.error("[CRITICAL] Unhandled Rejection:", reason);
});

// --- LOGGING ---
const logActivity = async (tool: string, status: number = 200) => {
  try {
    const ctx = requestContext.getStore();
    const client = ctx?.clientName || "unknown";
    console.log(`[MCP-LOG] client=${client} tool=${tool} status=${status}`);
    const ts = Date.now();
    const isError = status >= 400 ? 1 : 0;

    await run_async(
      "INSERT INTO cybermem_access_log (timestamp, client_name, client_version, method, endpoint, tool, status, is_error) VALUES (?, ?, ?, 'POST', '/mcp', ?, ?, ?)",
      [ts, client, PACKAGE_VERSION, tool, status.toString(), isError],
    );
    await run_async(
      "INSERT INTO cybermem_stats (client_name, tool, count, errors, last_updated) VALUES (?, ?, 1, ?, ?) ON CONFLICT(client_name, tool) DO UPDATE SET count=count+1, errors=errors+?, last_updated=?",
      [client, tool, isError, ts, isError, ts],
    );
  } catch (err: any) {
    console.error("[MCP] Log Error:", err.message);
  }
};

// --- INITIALIZATION ---
async function initialize() {
  const dbPath = process.env.OM_DB_PATH;
  if (!dbPath) {
    console.error(
      "[INIT] Environment variable OM_DB_PATH is not set. Please configure OM_DB_PATH to point to the OpenMemory database file (e.g., /path/to/openmemory.db).",
    );
    process.exit(1);
  }

  const dir = dirname(dbPath);
  if (dir && !existsSync(dir)) mkdirSync(dir, { recursive: true });

  // Migrations
  try {
    await run_async(
      "CREATE TABLE IF NOT EXISTS cybermem_stats (id INTEGER PRIMARY KEY AUTOINCREMENT, client_name TEXT NOT NULL, tool TEXT NOT NULL, count INTEGER DEFAULT 0, errors INTEGER DEFAULT 0, last_updated INTEGER NOT NULL, UNIQUE(client_name, tool));",
    );
    await run_async(
      "CREATE TABLE IF NOT EXISTS cybermem_access_log (id INTEGER PRIMARY KEY AUTOINCREMENT, timestamp INTEGER NOT NULL, client_name TEXT NOT NULL, client_version TEXT, method TEXT NOT NULL, endpoint TEXT NOT NULL, tool TEXT NOT NULL, status TEXT NOT NULL, is_error INTEGER DEFAULT 0);",
    );

    // Robustly check for and rename 'operation' to 'tool'
    const statsInfo = (await all_async(
      "PRAGMA table_info(cybermem_stats);",
    )) as any[];
    if (statsInfo.some((col: any) => col.name === "operation")) {
      await run_async(
        "ALTER TABLE cybermem_stats RENAME COLUMN operation TO tool;",
      );
    } else if (!statsInfo.some((col: any) => col.name === "tool")) {
      await run_async(
        "ALTER TABLE cybermem_stats ADD COLUMN tool TEXT DEFAULT 'unknown';",
      );
    }

    const logInfo = (await all_async(
      "PRAGMA table_info(cybermem_access_log);",
    )) as any[];
    if (logInfo.some((col: any) => col.name === "operation")) {
      await run_async(
        "ALTER TABLE cybermem_access_log RENAME COLUMN operation TO tool;",
      );
    } else if (!logInfo.some((col: any) => col.name === "tool")) {
      await run_async(
        "ALTER TABLE cybermem_access_log ADD COLUMN tool TEXT DEFAULT 'unknown';",
      );
    }

    // Backfill NULL tool values for SQLite safety
    await run_async(
      "UPDATE cybermem_access_log SET tool = 'unknown' WHERE tool IS NULL;",
    );
    await run_async(
      "UPDATE cybermem_stats SET tool = 'unknown' WHERE tool IS NULL;",
    );
  } catch (e: any) {
    console.error(
      "[INIT] Migration Error: Failed to apply database migrations:",
      e?.message ?? e,
    );
    process.exit(1);
  }
}

// --- SERVER SETUP ---
interface AuthContext {
  clientName: string;
  [key: string]: unknown;
}

const server = new FastMCP<AuthContext>({
  name: "cybermem",
  version: VALID_VERSION,
  instructions: CYBERMEM_INSTRUCTIONS,
  health: { enabled: true, path: "/health" },
  authenticate: async (req) => {
    // STDIO transport doesn't provide an HTTP request object
    if (!req?.headers) {
      return { clientName: "stdio" };
    }
    const clientName = (req.headers["x-client-name"] ||
      req.headers["X-Client-Name"] ||
      "unknown") as string;
    // Extract versioned naming if present (e.g. "antigravity/v1.0.0" -> "antigravity")
    return { clientName: clientName.split("/")[0] };
  },
});

const memory = new Memory() as IMemory;

const app = server.getApp();
// Keep Hono middleware for custom routes if any, though FastMCP transport bypasses it
app.use("*", async (c, next) => {
  const clientName = (
    c.req.header("X-Client-Name") ||
    c.req.header("x-client-name") ||
    "unknown"
  ).split("/")[0];
  return requestContext.run({ clientName }, next);
});

// TOOLS
server.addTool({
  name: "add_memory",
  description: "Store a new memory with optional tags for semantic retrieval.",
  parameters: z.object({
    content: z.string().describe("The text content of the memory"),
    tags: z.array(z.string()).optional().describe("Category tags"),
  }),
  execute: async (args, context) => {
    return requestContext.run(
      { clientName: context.session?.clientName },
      async () => {
        try {
          const res = await memory.add(args.content, { tags: args.tags });
          await logActivity("add_memory");
          return JSON.stringify(res);
        } catch (err: any) {
          await logActivity("add_memory", 500);
          throw err;
        }
      },
    );
  },
});

server.addTool({
  name: "query_memory",
  description: "Retrieve relevant memories using semantic search.",
  parameters: z.object({
    query: z.string().describe("Search query string"),
    k: z.number().default(5).describe("Number of results"),
  }),
  execute: async (args, context) => {
    return requestContext.run(
      { clientName: context.session?.clientName },
      async () => {
        try {
          const res = await memory.search(args.query, { limit: args.k });
          await logActivity("query_memory");
          return JSON.stringify(res);
        } catch (err: any) {
          await logActivity("query_memory", 500);
          throw err;
        }
      },
    );
  },
});

server.addTool({
  name: "update_memory",
  description:
    "Update an existing memory's content or tags. At least one must be provided.",
  parameters: z
    .object({
      id: z.string().describe("Memory ID"),
      content: z.string().optional().describe("New content"),
      tags: z.array(z.string()).optional().describe("New tags"),
    })
    .refine((data) => data.content !== undefined || data.tags !== undefined, {
      message: "Either content or tags must be provided for update",
      path: ["content"],
    }),
  execute: async (args, context) => {
    return requestContext.run(
      { clientName: context.session?.clientName },
      async () => {
        try {
          const res = await update_memory(args.id, args.content, args.tags);
          await logActivity("update_memory");
          return JSON.stringify(res);
        } catch (err: any) {
          await logActivity("update_memory", 500);
          throw err;
        }
      },
    );
  },
});

server.addTool({
  name: "reinforce_memory",
  description: "Boost a memory's relevance score to prevent decay.",
  parameters: z.object({
    id: z.string().describe("Memory ID"),
    boost: z
      .number()
      .default(0.1)
      .describe("Relevance boost amount (0.0 to 1.0)"),
  }),
  execute: async (args, context) => {
    return requestContext.run(
      { clientName: context.session?.clientName },
      async () => {
        try {
          await reinforce_memory(args.id, args.boost);
          await logActivity("reinforce_memory");
          return `Memory reinforced: ${args.id}`;
        } catch (err: any) {
          await logActivity("reinforce_memory", 500);
          throw err;
        }
      },
    );
  },
});

server.addTool({
  name: "delete_memory",
  description: "Permanently delete a memory and its associated vectors.",
  parameters: z.object({
    id: z.string().describe("Memory ID"),
  }),
  execute: async (args, context) => {
    return requestContext.run(
      { clientName: context.session?.clientName },
      async () => {
        try {
          await run_async("DELETE FROM memories WHERE id=?", [args.id]);
          await run_async("DELETE FROM vectors WHERE id=?", [args.id]);
          await logActivity("delete_memory");
          return "Deleted";
        } catch (err: any) {
          await logActivity("delete_memory", 500);
          throw err;
        }
      },
    );
  },
});

// START
async function main() {
  console.error("[INIT] Starting CyberMem MCP...");
  await initialize();
  console.error("[INIT] Database initialized.");

  const argsArr = process.argv.slice(2);
  const getArg = (name: string) => {
    const idx = argsArr.indexOf(name);
    return idx !== -1 ? argsArr[idx + 1] : undefined;
  };

  const port = parseInt(getArg("--port") || "3100", 10);
  const useHttp = argsArr.includes("--http") || argsArr.includes("--port");

  console.error(`[INIT] Starting ${useHttp ? "HTTP" : "STDIO"} server...`);
  await server.start({
    transportType: useHttp ? "httpStream" : "stdio",
    httpStream: useHttp
      ? {
          port,
          host: "0.0.0.0",
          endpoint: "/mcp",
          stateless: false,
          enableJsonResponse: true,
        }
      : undefined,
  });

  if (useHttp) {
    console.error(`CyberMem MCP running on http://localhost:${port}/mcp`);
  } else {
    console.error(`CyberMem MCP ${VALID_VERSION} [STDIO]`);
  }
}

main().catch((err) => {
  console.error("[CRITICAL] Main Failure:", err);
  process.exit(1);
});
