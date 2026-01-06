#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const index_js_1 = require("@modelcontextprotocol/sdk/server/index.js");
const sse_js_1 = require("@modelcontextprotocol/sdk/server/sse.js");
const stdio_js_1 = require("@modelcontextprotocol/sdk/server/stdio.js");
const types_js_1 = require("@modelcontextprotocol/sdk/types.js");
const axios_1 = __importDefault(require("axios"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const express_1 = __importDefault(require("express"));
dotenv_1.default.config();
// Default to local CyberMem backend (via Traefik on port 8626)
const API_URL = process.env.CYBERMEM_URL || "http://localhost:8626/memory";
const API_KEY = process.env.CYBERMEM_API_KEY || "";
// Track client name per session
// Since we don't have a built-in session ID in the request context easily,
// we'll use a global fallback and allow updating it.
// For SSE, we can extract it from the HTTP request.
let currentClientName = "cybermem-mcp";
const server = new index_js_1.Server({
    name: "cybermem-mcp",
    version: "0.2.0",
}, {
    capabilities: {
        tools: {},
    },
});
const tools = [
    {
        name: "add_memory",
        description: "Store a new memory in CyberMem",
        inputSchema: {
            type: "object",
            properties: {
                content: { type: "string" },
                user_id: { type: "string" },
                tags: { type: "array", items: { type: "string" } },
            },
            required: ["content"],
        },
    },
    {
        name: "query_memory",
        description: "Search for relevant memories",
        inputSchema: {
            type: "object",
            properties: {
                query: { type: "string" },
                k: { type: "number", default: 5 },
            },
            required: ["query"],
        },
    },
    {
        name: "list_memories",
        description: "List recent memories",
        inputSchema: {
            type: "object",
            properties: {
                limit: { type: "number", default: 10 },
            },
        },
    },
    {
        name: "delete_memory",
        description: "Delete a memory by ID",
        inputSchema: {
            type: "object",
            properties: {
                id: { type: "string" },
            },
            required: ["id"],
        },
    },
    {
        name: "update_memory",
        description: "Update a memory by ID",
        inputSchema: {
            type: "object",
            properties: {
                id: { type: "string" },
                content: { type: "string" },
                tags: { type: "array", items: { type: "string" } },
                metadata: { type: "object" },
            },
            required: ["id"],
        },
    }
];
server.setRequestHandler(types_js_1.ListToolsRequestSchema, async () => ({
    tools,
}));
// Create axios instance
const apiClient = axios_1.default.create({
    baseURL: API_URL,
    headers: {
        "Authorization": `Bearer ${API_KEY}`,
    },
});
// Helper to get client with context
function getClient(customHeaders = {}) {
    // Identity is taken from currentClientName which is updated per-request in SSE mode
    const clientName = customHeaders["X-Client-Name"] || currentClientName;
    return {
        ...apiClient,
        get: (url, config) => apiClient.get(url, { ...config, headers: { "X-Client-Name": clientName, ...config?.headers } }),
        post: (url, data, config) => apiClient.post(url, data, { ...config, headers: { "X-Client-Name": clientName, ...config?.headers } }),
        put: (url, data, config) => apiClient.put(url, data, { ...config, headers: { "X-Client-Name": clientName, ...config?.headers } }),
        patch: (url, data, config) => apiClient.patch(url, data, { ...config, headers: { "X-Client-Name": clientName, ...config?.headers } }),
        delete: (url, config) => apiClient.delete(url, { ...config, headers: { "X-Client-Name": clientName, ...config?.headers } }),
    };
}
server.setRequestHandler(types_js_1.CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    try {
        switch (name) {
            case "add_memory": {
                const response = await getClient().post("/add", args);
                return { content: [{ type: "text", text: JSON.stringify(response.data) }] };
            }
            case "query_memory": {
                const response = await getClient().post("/query", args);
                return { content: [{ type: "text", text: JSON.stringify(response.data) }] };
            }
            case "list_memories": {
                const limit = args?.limit || 10;
                const response = await getClient().get(`/all?l=${limit}`);
                return { content: [{ type: "text", text: JSON.stringify(response.data) }] };
            }
            case "delete_memory": {
                const { id } = args;
                await getClient().delete(`/${id}`);
                return { content: [{ type: "text", text: `Memory ${id} deleted` }] };
            }
            case "update_memory": {
                const { id, ...updates } = args;
                const response = await getClient().patch(`/${id}`, updates);
                return { content: [{ type: "text", text: JSON.stringify(response.data) }] };
            }
            default:
                throw new Error(`Unknown tool: ${name}`);
        }
    }
    catch (error) {
        return {
            content: [{ type: "text", text: `Error: ${error.message}` }],
            isError: true,
        };
    }
});
async function run() {
    const isSse = process.argv.includes("--sse") || !!process.env.PORT;
    if (isSse) {
        const app = (0, express_1.default)();
        app.use((0, cors_1.default)());
        const port = process.env.PORT || 8627;
        let transport = null;
        app.get("/sse", async (req, res) => {
            // Extract client name from header
            const clientName = req.headers["x-client-name"];
            if (clientName) {
                currentClientName = clientName;
            }
            transport = new sse_js_1.SSEServerTransport("/messages", res);
            await server.connect(transport);
        });
        app.post("/messages", async (req, res) => {
            // Also check headers on messages
            const clientName = req.headers["x-client-name"];
            if (clientName) {
                currentClientName = clientName;
            }
            if (transport) {
                await transport.handlePostMessage(req, res);
            }
            else {
                res.status(400).send("Session not established");
            }
        });
        app.listen(port, () => {
            console.error(`CyberMem MCP Server running on SSE at http://localhost:${port}`);
            console.error(`  - SSE endpoint: http://localhost:${port}/sse`);
            console.error(`  - Message endpoint: http://localhost:${port}/messages`);
        });
    }
    else {
        const transport = new stdio_js_1.StdioServerTransport();
        await server.connect(transport);
        console.error("CyberMem MCP Server running on stdio");
    }
}
run().catch((error) => {
    console.error("Fatal error running server:", error);
    process.exit(1);
});
