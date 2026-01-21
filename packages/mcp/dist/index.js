#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("./env.js");
/**
 * CyberMem MCP Server
 *
 * Supports two modes:
 * 1. Local/Server Mode (default): Uses openmemory-js SDK directly.
 * 2. Remote Client Mode (with --url): Proxies requests to a remote CyberMem server via HTTP.
 */
const mcp_js_1 = require("@modelcontextprotocol/sdk/server/mcp.js");
const stdio_js_1 = require("@modelcontextprotocol/sdk/server/stdio.js");
const streamableHttp_js_1 = require("@modelcontextprotocol/sdk/server/streamableHttp.js");
const types_js_1 = require("@modelcontextprotocol/sdk/types.js");
const async_hooks_1 = require("async_hooks");
const axios_1 = __importDefault(require("axios"));
const cors_1 = __importDefault(require("cors"));
const express_1 = __importDefault(require("express"));
const zod_1 = require("zod");
// Redirect all stdout to stderr IMMEDIATELY to protect Stdio protocol
const originalStdoutWrite = process.stdout.write.bind(process.stdout);
process.stdout.write = (chunk, encoding, callback) => {
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
const requestContext = new async_hooks_1.AsyncLocalStorage();
// CLI args processing
const args = process.argv.slice(2);
// Start the server
startServer();
async function startServer() {
    const getArg = (name) => {
        const idx = args.indexOf(name);
        return idx !== -1 && args[idx + 1] ? args[idx + 1] : undefined;
    };
    const cliUrl = getArg("--url");
    const cliToken = getArg("--token") || getArg("--api-key");
    let stdioClientName = undefined;
    // Protocol Instructions
    const CYBERMEM_INSTRUCTIONS = `CyberMem is a persistent context daemon for AI agents.
PROTOCOL:
1. On session start: call query_memory("user context profile")
2. Store new insights immediately with add_memory (FULL content)
3. Always include tags: [topic, year, source:your-client-name]
For full protocol: https://docs.cybermem.dev/agent-protocol`;
    const server = new mcp_js_1.McpServer({ name: "cybermem", version: "0.7.5" }, {
        instructions: CYBERMEM_INSTRUCTIONS,
    });
    server.registerResource("CyberMem Agent Protocol", "cybermem://protocol", { description: "Instructions for AI agents", mimeType: "text/plain" }, async () => ({
        contents: [
            {
                uri: "cybermem://protocol",
                mimeType: "text/plain",
                text: CYBERMEM_INSTRUCTIONS,
            },
        ],
    }));
    // Capture client info from handshake
    // @ts-ignore - access underlying server
    server.server.setRequestHandler(types_js_1.InitializeRequestSchema, async (request) => {
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
    let memory = null;
    let apiClient = null;
    if (cliUrl) {
        // REMOTE CLIENT MODE
        console.error(`Connecting to remote CyberMem at ${cliUrl}`);
        apiClient = axios_1.default.create({
            baseURL: cliUrl,
            headers: {
                "X-API-Key": cliToken,
                Accept: "application/json, text/event-stream",
                "Content-Type": "application/json",
            },
        });
        // Dynamically inject client name from context or discovery
        apiClient.interceptors.request.use((config) => {
            const ctx = requestContext.getStore();
            config.headers["X-Client-Name"] =
                ctx?.clientName || stdioClientName || "unknown-mcp-client";
            return config;
        });
    }
    else {
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
            if (dir)
                fs.mkdirSync(dir, { recursive: true });
        }
        catch { }
        try {
            // Dynamic import to ensure env vars are set before loading SDK
            // We import from dist/core/memory directly to avoid triggering the server side-effects in openmemory-js/dist/index.js
            // @ts-ignore
            const { Memory } = await import("openmemory-js/dist/core/memory.js");
            memory = new Memory();
            server._memoryReady = true;
            // --- INITIALIZE LOGGING TABLES ---
            const sqlite3 = await import("sqlite3");
            const db = new sqlite3.default.Database(dbPath);
            db.configure("busyTimeout", 5000);
            db.serialize(() => {
                db.run("PRAGMA journal_mode=WAL;", (err) => {
                    if (err)
                        console.error("[MCP] Init WAL error:", err.message);
                });
                db.run(`CREATE TABLE IF NOT EXISTS cybermem_stats (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            client_name TEXT NOT NULL,
            operation TEXT NOT NULL,
            count INTEGER DEFAULT 0,
            errors INTEGER DEFAULT 0,
            last_updated INTEGER NOT NULL,
            UNIQUE(client_name, operation)
        );`, (err) => {
                    if (err)
                        console.error("[MCP] Init stats table error:", err.message);
                });
                db.run(`CREATE TABLE IF NOT EXISTS cybermem_access_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp INTEGER NOT NULL,
            client_name TEXT NOT NULL,
            client_version TEXT,
            method TEXT NOT NULL,
            endpoint TEXT NOT NULL,
            operation TEXT NOT NULL,
            status TEXT NOT NULL,
            is_error INTEGER DEFAULT 0
        );`, (err) => {
                    if (err)
                        console.error("[MCP] Init access_log table error:", err.message);
                });
                // Access keys table for token-based auth
                db.run(`CREATE TABLE IF NOT EXISTS access_keys (
            id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
            key_hash TEXT NOT NULL,
            name TEXT DEFAULT 'default',
            user_id TEXT DEFAULT 'default',
            created_at TEXT DEFAULT (datetime('now')),
            last_used_at TEXT,
            is_active INTEGER DEFAULT 1
        );`, (err) => {
                    if (err)
                        console.error("[MCP] Init access_keys table error:", err.message);
                });
            });
            db.close();
        }
        catch (e) {
            console.error("Failed to initialize OpenMemory SDK:", e);
            server._memoryReady = false;
        }
    }
    // Helper to log activity to SQLite (Local SDK Mode only)
    const logActivity = async (operation, opts = {}) => {
        if (cliUrl || !memory)
            return;
        const { client: providedClient, method = "POST", endpoint = "/mcp", status = 200, } = opts;
        const ctx = requestContext.getStore();
        const client = providedClient || ctx?.clientName || stdioClientName || "unknown-client";
        try {
            const dbPath = process.env.OM_DB_PATH;
            const sqlite3 = await import("sqlite3");
            const db = new sqlite3.default.Database(dbPath);
            db.configure("busyTimeout", 5000);
            const ts = Date.now();
            const is_error = status >= 400 ? 1 : 0;
            console.error(`[MCP] Logging ${operation} for ${client} (status: ${status})`);
            db.serialize(() => {
                // Log to access_log
                db.run(`INSERT INTO cybermem_access_log
          (timestamp, client_name, client_version, method, endpoint, operation, status, is_error)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [
                    ts,
                    client,
                    "0.7.0",
                    method,
                    endpoint,
                    operation,
                    status.toString(),
                    is_error,
                ], (err) => {
                    if (err)
                        console.error("[MCP] Log access error:", err.message);
                });
                // Log to stats (Upsert)
                db.run(`INSERT INTO cybermem_stats (client_name, operation, count, errors, last_updated)
          VALUES (?, ?, 1, ?, ?)
          ON CONFLICT(client_name, operation) DO UPDATE SET
            count = count + 1,
            errors = errors + ?,
            last_updated = ?`, [client, operation, is_error, ts, is_error, ts], (err) => {
                    if (err)
                        console.error("[MCP] Log stats error:", err.message);
                });
            });
            db.close();
        }
        catch (e) {
            console.error("Failed to log activity to SQLite:", e);
        }
    };
    const addSourceTag = (tags = []) => {
        if (!tags.some((t) => t.startsWith("source:"))) {
            const clientName = requestContext.getStore()?.clientName || stdioClientName || "unknown";
            tags.push(`source:${clientName}`);
        }
        return tags;
    };
    // Helper to get current User ID from context or args
    const getContextUserId = (argsUserId) => {
        const store = requestContext.getStore();
        return argsUserId || store?.userId;
    };
    // --- TOOLS ---
    server.registerTool("add_memory", {
        description: "Store a new memory. " + CYBERMEM_INSTRUCTIONS,
        inputSchema: zod_1.z.object({
            content: zod_1.z.string(),
            user_id: zod_1.z.string().optional(),
            tags: zod_1.z.array(zod_1.z.string()).optional(),
        }),
    }, async (args) => {
        const tags = addSourceTag(args.tags);
        const userId = getContextUserId(args.user_id);
        if (cliUrl) {
            const res = await apiClient.post("/add", {
                ...args,
                user_id: userId,
                tags,
            });
            return { content: [{ type: "text", text: JSON.stringify(res.data) }] };
        }
        else {
            try {
                const res = await memory.add(args.content, {
                    user_id: userId,
                    tags,
                });
                await logActivity("create", {
                    method: "POST",
                    endpoint: "/memory/add",
                    status: 200,
                });
                return { content: [{ type: "text", text: JSON.stringify(res) }] };
            }
            catch (e) {
                await logActivity("create", {
                    method: "POST",
                    endpoint: "/memory/add",
                    status: 500,
                });
                throw e;
            }
        }
    });
    server.registerTool("query_memory", {
        description: "Search memories.",
        inputSchema: zod_1.z.object({ query: zod_1.z.string(), k: zod_1.z.number().default(5) }),
    }, async (args) => {
        const userId = getContextUserId(); // Search is scoped to user if provided
        if (cliUrl) {
            const res = await apiClient.post("/query", args);
            return { content: [{ type: "text", text: JSON.stringify(res.data) }] };
        }
        else {
            try {
                const res = await memory.search(args.query, {
                    limit: args.k,
                    user_id: userId,
                });
                await logActivity("read", {
                    method: "POST",
                    endpoint: "/memory/query",
                    status: 200,
                });
                return { content: [{ type: "text", text: JSON.stringify(res) }] };
            }
            catch (e) {
                await logActivity("read", {
                    method: "POST",
                    endpoint: "/memory/query",
                    status: 500,
                });
                throw e;
            }
        }
    });
    server.registerTool("list_memories", {
        description: "List recent memories",
        inputSchema: zod_1.z.object({ limit: zod_1.z.number().default(10) }),
    }, async (args) => {
        const userId = getContextUserId();
        if (cliUrl) {
            try {
                const res = await apiClient.get(`/all?limit=${args.limit}`);
                return {
                    content: [{ type: "text", text: JSON.stringify(res.data) }],
                };
            }
            catch {
                const res = await apiClient.post("/query", {
                    query: "",
                    k: args.limit,
                });
                return {
                    content: [{ type: "text", text: JSON.stringify(res.data) }],
                };
            }
        }
        else {
            const res = await memory.search("", {
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
    });
    server.registerTool("delete_memory", {
        description: "Delete memory by ID",
        inputSchema: zod_1.z.object({ id: zod_1.z.string() }),
    }, async (args) => {
        if (cliUrl) {
            const res = await apiClient.delete(`/${args.id}`);
            return { content: [{ type: "text", text: JSON.stringify(res.data) }] };
        }
        else {
            const dbPath = process.env.OM_DB_PATH;
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
                    db.run("COMMIT", async (err) => {
                        db.close();
                        if (err) {
                            await logActivity("delete", {
                                method: "DELETE",
                                endpoint: `/memory/${args.id}`,
                                status: 500,
                            });
                            reject(new Error(`Failed to delete memory ${args.id}: ${err.message}`));
                        }
                        else {
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
    });
    server.registerTool("update_memory", {
        description: "Update memory",
        inputSchema: zod_1.z.object({ id: zod_1.z.string(), content: zod_1.z.string().optional() }),
    }, async (args) => {
        await logActivity("update", {
            method: "PATCH",
            endpoint: `/memory/${args.id}`,
            status: 501,
        });
        return { content: [{ type: "text", text: "Update not implemented" }] };
    });
    // --- TRANSPORT ---
    const useHttp = args.includes("--http") || args.includes("--port");
    if (useHttp) {
        const port = parseInt(getArg("--port") || "3100", 10);
        const app = (0, express_1.default)();
        app.use((0, cors_1.default)());
        app.use(express_1.default.json());
        app.get("/health", (req, res) => res.json({
            ok: server._memoryReady,
            version: "0.7.5",
            mode: cliUrl ? "proxy" : "sdk",
            ready: server._memoryReady,
        }));
        app.get("/metrics", async (req, res) => {
            try {
                const dbPath = process.env.OM_DB_PATH;
                const sqlite3 = await import("sqlite3");
                const db = new sqlite3.default.Database(dbPath);
                db.configure("busyTimeout", 5000);
                const getCount = (query) => new Promise((resolve) => db.get(query, (err, row) => resolve(row?.count || 0)));
                const memoriesCount = await getCount("SELECT COUNT(*) as count FROM memories");
                const totalRequests = await getCount("SELECT COUNT(*) as count FROM cybermem_access_log");
                const errorRequests = await getCount("SELECT COUNT(*) as count FROM cybermem_access_log WHERE is_error = 1");
                const uniqueClients = await getCount("SELECT COUNT(DISTINCT client_name) as count FROM cybermem_access_log");
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
            }
            catch (e) {
                res.status(500).send(`# Error: ${e.message}`);
            }
        });
        app.use((req, res, next) => {
            const userId = req.headers["x-user-id"];
            const clientName = req.headers["x-client-name"] ||
                req.headers["user-agent"];
            requestContext.run({ userId, clientName }, next);
        });
        if (!cliUrl && memory) {
            app.post("/add", async (req, res) => {
                try {
                    const contextUserId = requestContext.getStore()?.userId;
                    const { content, user_id, tags } = req.body;
                    const finalTags = addSourceTag(tags);
                    const result = await memory.add(content, {
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
                }
                catch (e) {
                    await logActivity("create", {
                        client: "rest-api",
                        method: "POST",
                        endpoint: "/add",
                        status: 500,
                    });
                    res.status(500).json({ error: e.message });
                }
            });
            app.post("/query", async (req, res) => {
                try {
                    const contextUserId = requestContext.getStore()?.userId;
                    const { query, k } = req.body;
                    const result = await memory.search(query || "", {
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
                }
                catch (e) {
                    await logActivity("read", {
                        client: "rest-api",
                        method: "POST",
                        endpoint: "/query",
                        status: 500,
                    });
                    res.status(500).json({ error: e.message });
                }
            });
            app.get("/all", async (req, res) => {
                try {
                    const contextUserId = requestContext.getStore()?.userId;
                    const limit = parseInt(req.query.limit) || 10;
                    const result = await memory.search("", {
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
                }
                catch (e) {
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
        const transport = new streamableHttp_js_1.StreamableHTTPServerTransport({
            sessionIdGenerator: () => crypto.randomUUID(),
        });
        app.all("/mcp", async (req, res) => await transport.handleRequest(req, res, req.body));
        app.all("/sse", async (req, res) => await transport.handleRequest(req, res, req.body));
        server.connect(transport).then(() => {
            app.listen(port, () => {
                console.error(`CyberMem MCP (ready: ${server._memoryReady}) running on http://localhost:${port}`);
            });
        });
    }
    else {
        const transport = new stdio_js_1.StdioServerTransport();
        server
            .connect(transport)
            .then(() => console.error("CyberMem MCP connected via STDIO"));
    }
}
