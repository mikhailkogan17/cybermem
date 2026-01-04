#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const index_js_1 = require("@modelcontextprotocol/sdk/server/index.js");
const stdio_js_1 = require("@modelcontextprotocol/sdk/server/stdio.js");
const types_js_1 = require("@modelcontextprotocol/sdk/types.js");
const axios_1 = __importDefault(require("axios"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const API_URL = process.env.CYBERMEM_URL || "http://localhost:8088/memory";
const API_KEY = process.env.CYBERMEM_API_KEY || "dev-secret-key";
const server = new index_js_1.Server({
    name: "cybermem-mcp",
    version: "0.1.0",
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
server.setRequestHandler(types_js_1.CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    try {
        switch (name) {
            case "add_memory": {
                const response = await axios_1.default.post(`${API_URL}/add`, args, {
                    headers: { "Authorization": `Bearer ${API_KEY}` }
                });
                return { content: [{ type: "text", text: JSON.stringify(response.data) }] };
            }
            case "query_memory": {
                const response = await axios_1.default.post(`${API_URL}/query`, args, {
                    headers: { "Authorization": `Bearer ${API_KEY}` }
                });
                return { content: [{ type: "text", text: JSON.stringify(response.data) }] };
            }
            case "list_memories": {
                const limit = args?.limit || 10;
                const response = await axios_1.default.get(`${API_URL}/all?l=${limit}`, {
                    headers: { "Authorization": `Bearer ${API_KEY}` }
                });
                return { content: [{ type: "text", text: JSON.stringify(response.data) }] };
            }
            case "delete_memory": {
                const { id } = args;
                await axios_1.default.delete(`${API_URL}/${id}`, {
                    headers: { "Authorization": `Bearer ${API_KEY}` }
                });
                return { content: [{ type: "text", text: `Memory ${id} deleted` }] };
            }
            case "update_memory": {
                const { id, ...updates } = args;
                const response = await axios_1.default.patch(`${API_URL}/${id}`, updates, {
                    headers: { "Authorization": `Bearer ${API_KEY}` }
                });
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
    const transport = new stdio_js_1.StdioServerTransport();
    await server.connect(transport);
    console.error("CyberMem MCP Server running on stdio");
}
run().catch((error) => {
    console.error("Fatal error running server:", error);
    process.exit(1);
});
