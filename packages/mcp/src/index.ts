#!/usr/bin/env node
import "./console-fix.js";
import "./env.js";

import { AsyncLocalStorage } from "async_hooks";
import { FastMCP } from "fastmcp";
import { readFileSync, existsSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { z } from "zod";

// --- CORE SDK IMPORTS ---
// @ts-ignore
import { Memory } from "openmemory-js/dist/core/memory.js";
// @ts-ignore
import { update_memory, reinforce_memory } from "openmemory-js/dist/memory/hsg.js";
// @ts-ignore
import { run_async, all_async } from "openmemory-js/dist/core/db.js";

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

const VALID_VERSION = (PACKAGE_VERSION.match(/^\d+\.\d+\.\d+$/)
  ? PACKAGE_VERSION
  : "0.0.0") as `${number}.${number}.${number}`;

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
  const dbPath = process.env.OM_DB_PATH!;
  const dir = dirname(dbPath);
  if (dir && !existsSync(dir)) mkdirSync(dir, { recursive: true });

  // Migrations
  try {
    await run_async("CREATE TABLE IF NOT EXISTS cybermem_stats (id INTEGER PRIMARY KEY AUTOINCREMENT, client_name TEXT NOT NULL, tool TEXT NOT NULL, count INTEGER DEFAULT 0, errors INTEGER DEFAULT 0, last_updated INTEGER NOT NULL, UNIQUE(client_name, tool));");
    const statsInfo = await all_async("PRAGMA table_info(cybermem_stats)");
    if (statsInfo.some((r: any) => r.name === "operation")) {
      await run_async("ALTER TABLE cybermem_stats RENAME COLUMN operation TO tool;");
    }

    await run_async("CREATE TABLE IF NOT EXISTS cybermem_access_log (id INTEGER PRIMARY KEY AUTOINCREMENT, timestamp INTEGER NOT NULL, client_name TEXT NOT NULL, client_version TEXT, method TEXT NOT NULL, endpoint TEXT NOT NULL, tool TEXT NOT NULL, status TEXT NOT NULL, is_error INTEGER DEFAULT 0);");
    const logInfo = await all_async("PRAGMA table_info(cybermem_access_log)");
    if (logInfo.some((r: any) => r.name === "operation")) {
      await run_async("ALTER TABLE cybermem_access_log RENAME COLUMN operation TO tool;");
    } else if (!logInfo.some((r: any) => r.name === "tool")) {
      await run_async("ALTER TABLE cybermem_access_log ADD COLUMN tool TEXT DEFAULT 'unknown';");
    }
  } catch (e: any) {
    console.error("[INIT] Migration Warning:", e.message);
  }
}

// --- SERVER SETUP ---
const server = new FastMCP({
  name: "cybermem",
  version: VALID_VERSION,
  instructions: CYBERMEM_INSTRUCTIONS,
  health: { enabled: true, path: "/health" },
});

const memory = new Memory() as IMemory;

const app = server.getApp();
app.use("*", async (c, next) => {
  const clientName = (c.req.header("X-Client-Name") || c.req.header("x-client-name") || "unknown").split("/")[0];
  return requestContext.run({ clientName }, next);
});

// TOOLS
server.addTool({
  name: "add_memory",
  parameters: z.object({ content: z.string(), tags: z.array(z.string()).optional() }),
  execute: async (args) => {
    const res = await memory.add(args.content, { tags: args.tags });
    await logActivity("add_memory");
    return JSON.stringify(res);
  },
});

server.addTool({
  name: "query_memory",
  parameters: z.object({ query: z.string(), k: z.number().default(5) }),
  execute: async (args) => {
    const res = await memory.search(args.query, { limit: args.k });
    await logActivity("query_memory");
    return JSON.stringify(res);
  },
});

server.addTool({
  name: "update_memory",
  parameters: z.object({ id: z.string(), content: z.string().optional(), tags: z.array(z.string()).optional() }),
  execute: async (args) => {
    const res = await update_memory(args.id, args.content, args.tags);
    await logActivity("update_memory");
    return JSON.stringify(res);
  },
});

server.addTool({
  name: "reinforce_memory",
  parameters: z.object({ id: z.string(), boost: z.number().default(0.1) }),
  execute: async (args) => {
    await reinforce_memory(args.id, args.boost);
    await logActivity("reinforce_memory");
    return `Memory reinforced: ${args.id}`;
  },
});

server.addTool({
  name: "delete_memory",
  parameters: z.object({ id: z.string() }),
  execute: async (args) => {
    await run_async("DELETE FROM memories WHERE id=?", [args.id]);
    await run_async("DELETE FROM vectors WHERE id=?", [args.id]);
    await logActivity("delete_memory");
    return "Deleted";
  },
});

// START
async function main() {
  await initialize();
  const argsArr = process.argv.slice(2);
  const getArg = (name: string) => {
    const idx = argsArr.indexOf(name);
    return idx !== -1 ? argsArr[idx + 1] : undefined;
  };

  const port = parseInt(getArg("--port") || "3100", 10);
  const useHttp = argsArr.includes("--http") || argsArr.includes("--port");

  await server.start({
    transportType: useHttp ? "httpStream" : "stdio",
    httpStream: useHttp ? { port, host: "0.0.0.0", endpoint: "/mcp" } : undefined,
  });
  console.error(`CyberMem MCP ${VALID_VERSION} [${useHttp ? "HTTP:" + port : "STDIO"}]`);
}

main().catch(console.error);
