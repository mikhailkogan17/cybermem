#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("./console-fix.js");
require("./env.js");
const async_hooks_1 = require("async_hooks");
const fastmcp_1 = require("fastmcp");
const fs_1 = require("fs");
const path_1 = require("path");
const zod_1 = require("zod");
// --- CORE SDK IMPORTS ---
// @ts-ignore
const memory_js_1 = require("openmemory-js/dist/core/memory.js");
// @ts-ignore
const hsg_js_1 = require("openmemory-js/dist/memory/hsg.js");
// @ts-ignore
const db_js_1 = require("openmemory-js/dist/core/db.js");
// --- GLOBALS & CONTEXT ---
const requestContext = new async_hooks_1.AsyncLocalStorage();
let PACKAGE_VERSION = "0.0.0";
try {
    const packageJsonPath = (0, path_1.join)(__dirname, "../package.json");
    const packageJson = JSON.parse((0, fs_1.readFileSync)(packageJsonPath, "utf-8"));
    PACKAGE_VERSION = packageJson.version;
}
catch { }
const VALID_VERSION = (PACKAGE_VERSION.match(/^\d+\.\d+\.\d+$/)
    ? PACKAGE_VERSION
    : "0.0.0");
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
const logActivity = async (tool, status = 200) => {
    try {
        const ctx = requestContext.getStore();
        const client = ctx?.clientName || "unknown";
        const ts = Date.now();
        const isError = status >= 400 ? 1 : 0;
        await (0, db_js_1.run_async)("INSERT INTO cybermem_access_log (timestamp, client_name, client_version, method, endpoint, tool, status, is_error) VALUES (?, ?, ?, 'POST', '/mcp', ?, ?, ?)", [ts, client, PACKAGE_VERSION, tool, status.toString(), isError]);
        await (0, db_js_1.run_async)("INSERT INTO cybermem_stats (client_name, tool, count, errors, last_updated) VALUES (?, ?, 1, ?, ?) ON CONFLICT(client_name, tool) DO UPDATE SET count=count+1, errors=errors+?, last_updated=?", [client, tool, isError, ts, isError, ts]);
    }
    catch (err) {
        console.error("[MCP] Log Error:", err.message);
    }
};
// --- INITIALIZATION ---
async function initialize() {
    const dbPath = process.env.OM_DB_PATH;
    const dir = (0, path_1.dirname)(dbPath);
    if (dir && !(0, fs_1.existsSync)(dir))
        (0, fs_1.mkdirSync)(dir, { recursive: true });
    // Migrations
    try {
        await (0, db_js_1.run_async)("CREATE TABLE IF NOT EXISTS cybermem_stats (id INTEGER PRIMARY KEY AUTOINCREMENT, client_name TEXT NOT NULL, tool TEXT NOT NULL, count INTEGER DEFAULT 0, errors INTEGER DEFAULT 0, last_updated INTEGER NOT NULL, UNIQUE(client_name, tool));");
        const statsInfo = await (0, db_js_1.all_async)("PRAGMA table_info(cybermem_stats)");
        if (statsInfo.some((r) => r.name === "operation")) {
            await (0, db_js_1.run_async)("ALTER TABLE cybermem_stats RENAME COLUMN operation TO tool;");
        }
        await (0, db_js_1.run_async)("CREATE TABLE IF NOT EXISTS cybermem_access_log (id INTEGER PRIMARY KEY AUTOINCREMENT, timestamp INTEGER NOT NULL, client_name TEXT NOT NULL, client_version TEXT, method TEXT NOT NULL, endpoint TEXT NOT NULL, tool TEXT NOT NULL, status TEXT NOT NULL, is_error INTEGER DEFAULT 0);");
        const logInfo = await (0, db_js_1.all_async)("PRAGMA table_info(cybermem_access_log)");
        if (logInfo.some((r) => r.name === "operation")) {
            await (0, db_js_1.run_async)("ALTER TABLE cybermem_access_log RENAME COLUMN operation TO tool;");
        }
        else if (!logInfo.some((r) => r.name === "tool")) {
            await (0, db_js_1.run_async)("ALTER TABLE cybermem_access_log ADD COLUMN tool TEXT DEFAULT 'unknown';");
        }
    }
    catch (e) {
        console.error("[INIT] Migration Warning:", e.message);
    }
}
// --- SERVER SETUP ---
const server = new fastmcp_1.FastMCP({
    name: "cybermem",
    version: VALID_VERSION,
    instructions: CYBERMEM_INSTRUCTIONS,
    health: { enabled: true, path: "/health" },
});
const memory = new memory_js_1.Memory();
const app = server.getApp();
app.use("*", async (c, next) => {
    const clientName = (c.req.header("X-Client-Name") || c.req.header("x-client-name") || "unknown").split("/")[0];
    return requestContext.run({ clientName }, next);
});
// TOOLS
server.addTool({
    name: "add_memory",
    parameters: zod_1.z.object({ content: zod_1.z.string(), tags: zod_1.z.array(zod_1.z.string()).optional() }),
    execute: async (args) => {
        const res = await memory.add(args.content, { tags: args.tags });
        await logActivity("add_memory");
        return JSON.stringify(res);
    },
});
server.addTool({
    name: "query_memory",
    parameters: zod_1.z.object({ query: zod_1.z.string(), k: zod_1.z.number().default(5) }),
    execute: async (args) => {
        const res = await memory.search(args.query, { limit: args.k });
        await logActivity("query_memory");
        return JSON.stringify(res);
    },
});
server.addTool({
    name: "update_memory",
    parameters: zod_1.z.object({ id: zod_1.z.string(), content: zod_1.z.string().optional(), tags: zod_1.z.array(zod_1.z.string()).optional() }),
    execute: async (args) => {
        const res = await (0, hsg_js_1.update_memory)(args.id, args.content, args.tags);
        await logActivity("update_memory");
        return JSON.stringify(res);
    },
});
server.addTool({
    name: "reinforce_memory",
    parameters: zod_1.z.object({ id: zod_1.z.string(), boost: zod_1.z.number().default(0.1) }),
    execute: async (args) => {
        await (0, hsg_js_1.reinforce_memory)(args.id, args.boost);
        await logActivity("reinforce_memory");
        return `Memory reinforced: ${args.id}`;
    },
});
server.addTool({
    name: "delete_memory",
    parameters: zod_1.z.object({ id: zod_1.z.string() }),
    execute: async (args) => {
        await (0, db_js_1.run_async)("DELETE FROM memories WHERE id=?", [args.id]);
        await (0, db_js_1.run_async)("DELETE FROM vectors WHERE id=?", [args.id]);
        await logActivity("delete_memory");
        return "Deleted";
    },
});
// START
async function main() {
    await initialize();
    const argsArr = process.argv.slice(2);
    const getArg = (name) => {
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
