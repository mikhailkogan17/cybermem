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
// Async Storage for Request Context (User ID and Client Name)
const requestContext = new async_hooks_1.AsyncLocalStorage();
// CLI args processing
const args = process.argv.slice(2);
// Read version from package.json
let PACKAGE_VERSION = "0.0.0";
try {
    const packageJsonPath = (0, path_1.join)(__dirname, "../package.json");
    const packageJson = JSON.parse((0, fs_1.readFileSync)(packageJsonPath, "utf-8"));
    PACKAGE_VERSION = packageJson.version;
}
catch (error) {
    console.error("[MCP] Failed to read package.json version", error);
}
// Ensure version matches ${number}.${number}.${number} for FastMCP
const VALID_VERSION = (PACKAGE_VERSION.match(/^\d+\.\d+\.\d+$/) ? PACKAGE_VERSION : "0.0.0");
// Protocol Instructions
const CYBERMEM_INSTRUCTIONS = `CyberMem is a persistent context daemon for AI agents.
PROTOCOL:
1. On session start: call query_memory("user context profile")
2. Store new insights immediately with add_memory (STABLE data)
3. For corrections: use update_memory (STRUCTURAL mutation, high cost)
4. To prevent decay: use reinforce_memory (METABOLIC boost, low cost)
5. Always include tags: [topic, year, source:your-client-name]
For full protocol: https://docs.cybermem.dev/agent-protocol`;
// Global to track client names for the current session/request
let globalClientName = "unknown";
// Start the server
startServer();
async function startServer() {
    const getArg = (name) => {
        const idx = args.indexOf(name);
        return idx !== -1 && args[idx + 1] ? args[idx + 1] : undefined;
    };
    const cliEnv = getArg("--env");
    if (cliEnv === "staging") {
        console.error("[MCP] Running in Staging environment");
        process.env.CYBERMEM_ENV = "staging";
    }
    // --- IMPLEMENTATION LOGIC ---
    let memory = null;
    let sdk_update_memory = null;
    let sdk_reinforce_memory = null;
    // LOCAL SDK MODE
    const dbPath = process.env.OM_DB_PATH;
    const fs = await import("fs");
    const path = await import("path");
    try {
        const dir = path.dirname(dbPath);
        if (dir)
            fs.mkdirSync(dir, { recursive: true });
    }
    catch { }
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
            db.run("CREATE TABLE IF NOT EXISTS cybermem_stats (id INTEGER PRIMARY KEY AUTOINCREMENT, client_name TEXT NOT NULL, tool TEXT NOT NULL, count INTEGER DEFAULT 0, errors INTEGER DEFAULT 0, last_updated INTEGER NOT NULL, UNIQUE(client_name, tool));");
            db.run("CREATE TABLE IF NOT EXISTS cybermem_access_log (id INTEGER PRIMARY KEY AUTOINCREMENT, timestamp INTEGER NOT NULL, client_name TEXT NOT NULL, client_version TEXT, method TEXT NOT NULL, endpoint TEXT NOT NULL, tool TEXT NOT NULL, status TEXT NOT NULL, is_error INTEGER DEFAULT 0);");
            db.run("CREATE TABLE IF NOT EXISTS access_keys (id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))), key_hash TEXT NOT NULL, name TEXT DEFAULT 'default', user_id TEXT DEFAULT 'default', created_at TEXT DEFAULT (datetime('now')), last_used_at TEXT, is_active INTEGER DEFAULT 1);");
        });
        db.close();
    }
    catch (e) {
        console.error("Failed to initialize OpenMemory SDK:", e);
        process.exit(1);
    }
    // PERSISTENT LOGGING DB
    let loggingDb = null;
    const initLoggingDb = async () => {
        if (loggingDb)
            return loggingDb;
        const dbPath = process.env.OM_DB_PATH;
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
    const logActivity = async (tool, opts = {}) => {
        const ctx = requestContext.getStore();
        const client = opts.clientName || ctx?.clientName || globalClientName || "unknown";
        const { method = "POST", endpoint = "/mcp", status = 200 } = opts;
        try {
            const db = await initLoggingDb();
            const ts = Date.now();
            const is_error = status >= 400 ? 1 : 0;
            db.serialize(() => {
                db.run("INSERT INTO cybermem_access_log (timestamp, client_name, client_version, method, endpoint, tool, status, is_error) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", [
                    ts,
                    client,
                    PACKAGE_VERSION,
                    method,
                    endpoint,
                    tool,
                    status.toString(),
                    is_error,
                ]);
                db.run("INSERT INTO cybermem_stats (client_name, tool, count, errors, last_updated) VALUES (?, ?, 1, ?, ?) ON CONFLICT(client_name, tool) DO UPDATE SET count = count + 1, errors = errors + ?, last_updated = ?", [client, tool, is_error, ts, is_error, ts]);
            });
        }
        catch { }
    };
    // Initialize FastMCP
    const server = new fastmcp_1.FastMCP({
        name: "cybermem",
        version: VALID_VERSION,
        instructions: CYBERMEM_INSTRUCTIONS,
    });
    const app = server.getApp();
    // Middleware for identity tracking
    app.use("*", async (c, next) => {
        const clientName = c.req.header("X-Client-Name") ||
            c.req.header("x-client-name") ||
            "unknown";
        return requestContext.run({ clientName }, next);
    });
    // Health Check
    app.get("/health", (c) => c.json({ status: "ok" }));
    // RESOURCES
    server.addResource({
        uri: "cybermem://protocol",
        name: "CyberMem Agent Protocol",
        description: "Instructions for AI agents",
        mimeType: "text/plain",
        load: async () => ({
            text: CYBERMEM_INSTRUCTIONS,
        }),
    });
    // TOOLS
    server.addTool({
        name: "add_memory",
        description: "Store a new memory. Use for high-quality, stable data.",
        parameters: zod_1.z.object({
            content: zod_1.z.string(),
            tags: zod_1.z.array(zod_1.z.string()).optional(),
        }),
        execute: async (args) => {
            const res = await memory.add(args.content, { tags: args.tags });
            await logActivity("add_memory", {
                method: "TOOL",
                endpoint: "add_memory",
                status: 200,
            });
            return JSON.stringify(res);
        },
    });
    server.addTool({
        name: "query_memory",
        description: "Search memories.",
        parameters: zod_1.z.object({
            query: zod_1.z.string(),
            k: zod_1.z.number().default(5),
        }),
        execute: async (args) => {
            const res = await memory.search(args.query, { limit: args.k });
            await logActivity("query_memory", {
                method: "TOOL",
                endpoint: "query_memory",
                status: 200,
            });
            return JSON.stringify(res);
        },
    });
    server.addTool({
        name: "update_memory",
        description: "Mutate existing memory (content/tags).",
        parameters: zod_1.z.object({
            id: zod_1.z.string(),
            content: zod_1.z.string().optional(),
            tags: zod_1.z.array(zod_1.z.string()).optional(),
        }),
        execute: async (args) => {
            if (!sdk_update_memory)
                throw new Error("Update not available in SDK");
            if (args.content === undefined && args.tags === undefined) {
                throw new Error("At least one of 'content' or 'tags' must be provided to update_memory");
            }
            const res = await sdk_update_memory(args.id, args.content, args.tags);
            await logActivity("update_memory", {
                method: "TOOL",
                endpoint: "update_memory",
                status: 200,
            });
            return JSON.stringify(res);
        },
    });
    server.addTool({
        name: "reinforce_memory",
        description: "Metabolic boost (salience).",
        parameters: zod_1.z.object({
            id: zod_1.z.string(),
            boost: zod_1.z.number().default(0.1),
        }),
        execute: async (args) => {
            if (!sdk_reinforce_memory)
                throw new Error("Reinforce not available in SDK");
            const res = await sdk_reinforce_memory(args.id, args.boost);
            await logActivity("reinforce_memory", {
                method: "TOOL",
                endpoint: "reinforce_memory",
                status: 200,
            });
            return {
                content: [
                    {
                        type: "text",
                        text: `Memory reinforced: ${args.id}`,
                    },
                ],
            };
        },
    });
    server.addTool({
        name: "delete_memory",
        description: "Delete memory",
        parameters: zod_1.z.object({
            id: zod_1.z.string(),
        }),
        execute: async (args) => {
            const dbPath = process.env.OM_DB_PATH;
            const sqlite3 = await import("sqlite3");
            const db = new sqlite3.default.Database(dbPath);
            return new Promise((resolve, reject) => {
                db.serialize(() => {
                    db.run("DELETE FROM memories WHERE id = ?", [args.id]);
                    db.run("DELETE FROM vectors WHERE id = ?", [args.id], async (err) => {
                        db.close();
                        await logActivity("delete", {
                            method: "DELETE",
                            endpoint: `/memory/${args.id}`,
                            status: err ? 500 : 200,
                        });
                        if (err)
                            reject(err);
                        else
                            resolve("Deleted");
                    });
                });
            });
        },
    });
    // Listen for connections to log client identity
    server.on("connect", ({ session }) => {
        // Attempt to extract client name from capabilities or info if available in future SDKs
        // For now, it's just a log entry
        console.error(`[MCP] Client connected. Session: ${session.sessionId || "stdio"}`);
    });
    // START SERVER
    const useHttp = args.includes("--http") || args.includes("--port");
    if (useHttp) {
        const port = parseInt(getArg("--port") || "3100", 10);
        await server.start({
            transportType: "httpStream",
            httpStream: {
                port: port,
                endpoint: "/sse",
            },
        });
        console.error(`CyberMem MCP running on http://localhost:${port}`);
    }
    else {
        await server.start({
            transportType: "stdio",
        });
        console.error("CyberMem MCP connected via STDIO");
    }
}
