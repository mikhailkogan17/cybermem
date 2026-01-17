#!/usr/bin/env node
"use strict";
/**
 * CyberMem MCP Server
 *
 * STDIO→HTTP bridge for AI agents to interact with CyberMem memory system.
 * Uses the new McpServer API (non-deprecated) and StreamableHTTPServerTransport.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mcp_js_1 = require("@modelcontextprotocol/sdk/server/mcp.js");
const stdio_js_1 = require("@modelcontextprotocol/sdk/server/stdio.js");
const streamableHttp_js_1 = require("@modelcontextprotocol/sdk/server/streamableHttp.js");
const axios_1 = __importDefault(require("axios"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const express_1 = __importDefault(require("express"));
const zod_1 = require("zod");
const auth_js_1 = require("./auth.js");
dotenv_1.default.config();
// Handle CLI auth commands first
const args = process.argv.slice(2);
if (args.includes("--login")) {
    (0, auth_js_1.login)()
        .then(() => process.exit(0))
        .catch((err) => {
        console.error("Login failed:", err.message);
        process.exit(1);
    });
}
else if (args.includes("--logout")) {
    (0, auth_js_1.logout)();
    process.exit(0);
}
else if (args.includes("--status")) {
    (0, auth_js_1.showStatus)();
    process.exit(0);
}
else {
    // Continue with MCP server startup
    startServer();
}
function startServer() {
    // Parse CLI args for remote mode
    const getArg = (name) => {
        const idx = args.indexOf(name);
        return idx !== -1 && args[idx + 1] ? args[idx + 1] : undefined;
    };
    const cliUrl = getArg("--url");
    const cliApiKey = getArg("--api-key");
    const cliClientName = getArg("--client-name");
    // Use CLI args first, then stored token, then env, then empty (local mode)
    const API_URL = cliUrl || process.env.CYBERMEM_URL || "http://localhost:8626/memory";
    // Auth priority: CLI arg > stored OAuth token > env var > empty
    const storedToken = (0, auth_js_1.getToken)();
    const API_KEY = cliApiKey || storedToken || process.env.OM_API_KEY || "";
    // Show deprecation warning if using API key from env
    if (!storedToken && process.env.OM_API_KEY) {
        console.error("⚠️  Warning: OM_API_KEY is deprecated. Run 'npx @cybermem/mcp --login' for OAuth.");
    }
    // Track client name per session
    let currentClientName = cliClientName || "cybermem-mcp";
    // CyberMem Agent Protocol - instructions sent to clients on handshake
    const CYBERMEM_INSTRUCTIONS = `CyberMem is a persistent context daemon for AI agents.

PROTOCOL:
1. On session start: call query_memory("user context profile") to load persona
2. Store new insights immediately with add_memory - include FULL content, not summaries
3. Refresh context: 6h for active topics, 24h for projects, 7d for insights
4. Always include tags: [topic, year, source:your-client-name]
5. Priority: CyberMem context > session context > training data

MEMORY FORMAT:
- content: Full text with all details, metrics, dates. NO truncation.
- tags: Always include topic category + year + source:client-name

INTEGRITY RULES:
- Never overwrite without reading first
- Always include metadata (tags, source)
- Sync before critical decisions
- Last-write-wins for conflicts

For full protocol: https://docs.cybermem.dev/agent-protocol`;
    // Short protocol reminder for tool descriptions
    const PROTOCOL_REMINDER = "CyberMem Protocol: Store FULL content (no summaries), always include tags [topic, year, source:client-name]. Query 'user context profile' on session start.";
    // Create McpServer instance (new API)
    const server = new mcp_js_1.McpServer({
        name: "cybermem",
        version: "0.7.0",
    }, {
        capabilities: {
            tools: {},
            resources: {},
        },
        instructions: CYBERMEM_INSTRUCTIONS,
    });
    // Create axios instance for API calls
    const apiClient = axios_1.default.create({
        baseURL: API_URL,
        headers: {
            Authorization: `Bearer ${API_KEY}`,
        },
    });
    // Helper to add client name header
    function getHeaders(customClientName) {
        return {
            "X-Client-Name": customClientName || currentClientName,
        };
    }
    // Register resources using new API
    server.registerResource("CyberMem Agent Protocol", "cybermem://protocol", {
        description: "Instructions for AI agents using CyberMem memory system",
        mimeType: "text/plain",
    }, async () => ({
        contents: [
            {
                uri: "cybermem://protocol",
                mimeType: "text/plain",
                text: CYBERMEM_INSTRUCTIONS,
            },
        ],
    }));
    // Register tools using new registerTool API
    server.registerTool("add_memory", {
        description: `Store a new memory in CyberMem. ${PROTOCOL_REMINDER}`,
        inputSchema: zod_1.z.object({
            content: zod_1.z
                .string()
                .describe("Full content with all details - NO truncation or summarization"),
            user_id: zod_1.z.string().optional(),
            tags: zod_1.z
                .array(zod_1.z.string())
                .optional()
                .describe("Always include [topic, year, source:your-client-name]"),
        }),
    }, async (args) => {
        const response = await apiClient.post("/add", args, {
            headers: getHeaders(),
        });
        return {
            content: [{ type: "text", text: JSON.stringify(response.data) }],
        };
    });
    server.registerTool("query_memory", {
        description: `Search for relevant memories. On session start, call query_memory("user context profile") first.`,
        inputSchema: zod_1.z.object({
            query: zod_1.z.string(),
            k: zod_1.z.number().default(5),
        }),
    }, async (args) => {
        const response = await apiClient.post("/query", args, {
            headers: getHeaders(),
        });
        return {
            content: [{ type: "text", text: JSON.stringify(response.data) }],
        };
    });
    server.registerTool("list_memories", {
        description: "List recent memories",
        inputSchema: zod_1.z.object({
            limit: zod_1.z.number().default(10),
        }),
    }, async (args) => {
        const limit = args?.limit || 10;
        const response = await apiClient.get(`/all?l=${limit}`, {
            headers: getHeaders(),
        });
        return {
            content: [{ type: "text", text: JSON.stringify(response.data) }],
        };
    });
    server.registerTool("delete_memory", {
        description: "Delete a memory by ID",
        inputSchema: zod_1.z.object({
            id: zod_1.z.string(),
        }),
    }, async (args) => {
        await apiClient.delete(`/${args.id}`, {
            headers: getHeaders(),
        });
        return {
            content: [{ type: "text", text: `Memory ${args.id} deleted` }],
        };
    });
    server.registerTool("update_memory", {
        description: "Update a memory by ID",
        inputSchema: zod_1.z.object({
            id: zod_1.z.string(),
            content: zod_1.z.string().optional(),
            tags: zod_1.z.array(zod_1.z.string()).optional(),
            metadata: zod_1.z.record(zod_1.z.unknown()).optional(),
        }),
    }, async (args) => {
        const { id, ...updates } = args;
        const response = await apiClient.patch(`/${id}`, updates, {
            headers: getHeaders(),
        });
        return {
            content: [{ type: "text", text: JSON.stringify(response.data) }],
        };
    });
    async function run() {
        const isSse = process.argv.includes("--sse") || !!process.env.PORT;
        if (isSse) {
            // HTTP/SSE mode using StreamableHTTPServerTransport
            const app = (0, express_1.default)();
            app.use((0, cors_1.default)());
            app.use(express_1.default.json());
            const port = process.env.PORT || 8627;
            // Use the new StreamableHTTPServerTransport
            const transport = new streamableHttp_js_1.StreamableHTTPServerTransport({
                sessionIdGenerator: () => crypto.randomUUID(),
            });
            // Handle MCP requests
            app.all("/mcp", async (req, res) => {
                // Extract client name from header
                const clientName = req.headers["x-client-name"];
                if (clientName) {
                    currentClientName = clientName;
                }
                try {
                    await transport.handleRequest(req, res);
                }
                catch (error) {
                    console.error("MCP request error:", error);
                    res.status(500).json({ error: "Internal server error" });
                }
            });
            // Connect server to transport
            await server.connect(transport);
            app.listen(port, () => {
                console.error(`CyberMem MCP Server running on HTTP at http://localhost:${port}`);
                console.error(`  - MCP endpoint: http://localhost:${port}/mcp`);
            });
        }
        else {
            // STDIO mode (default for npx usage)
            const transport = new stdio_js_1.StdioServerTransport();
            await server.connect(transport);
            console.error("CyberMem MCP Server running on stdio");
        }
    }
    run().catch((error) => {
        console.error("Fatal error running server:", error);
        process.exit(1);
    });
}
