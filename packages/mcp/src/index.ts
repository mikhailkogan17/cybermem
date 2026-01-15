#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool
} from "@modelcontextprotocol/sdk/types.js";
import axios from "axios";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";

dotenv.config();

// Parse CLI args for remote mode
const args = process.argv.slice(2);
const getArg = (name: string): string | undefined => {
  const idx = args.indexOf(name);
  return idx !== -1 && args[idx + 1] ? args[idx + 1] : undefined;
};

const cliUrl = getArg('--url');
const cliApiKey = getArg('--api-key');
const cliClientName = getArg('--client-name');

// Use CLI args first, then env, then defaults
// Default to local CyberMem backend (via Traefik on port 8626)
const API_URL = cliUrl || process.env.CYBERMEM_URL || "http://localhost:8626/memory";
const API_KEY = cliApiKey || process.env.OM_API_KEY || "";

// Track client name per session
let currentClientName = cliClientName || "cybermem-mcp";

const server = new Server(
  {
    name: "cybermem-mcp",
    version: "0.2.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

const tools: Tool[] = [
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

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools,
}));

// Create axios instance
const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    "Authorization": `Bearer ${API_KEY}`,
  },
});

// Helper to get client with context
function getClient(customHeaders: Record<string, string> = {}) {
    // Identity is taken from currentClientName which is updated per-request in SSE mode
    const clientName = customHeaders["X-Client-Name"] || currentClientName;

    return {
        ...apiClient,
        get: (url: string, config?: any) => apiClient.get(url, { ...config, headers: { "X-Client-Name": clientName, ...config?.headers } }),
        post: (url: string, data?: any, config?: any) => apiClient.post(url, data, { ...config, headers: { "X-Client-Name": clientName, ...config?.headers } }),
        put: (url: string, data?: any, config?: any) => apiClient.put(url, data, { ...config, headers: { "X-Client-Name": clientName, ...config?.headers } }),
        patch: (url: string, data?: any, config?: any) => apiClient.patch(url, data, { ...config, headers: { "X-Client-Name": clientName, ...config?.headers } }),
        delete: (url: string, config?: any) => apiClient.delete(url, { ...config, headers: { "X-Client-Name": clientName, ...config?.headers } }),
    }
}

server.setRequestHandler(CallToolRequestSchema, async (request) => {
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
        const { id } = args as { id: string };
        await getClient().delete(`/${id}`);
        return { content: [{ type: "text", text: `Memory ${id} deleted` }] };
      }
      case "update_memory": {
        const { id, ...updates } = args as { id: string; [key: string]: any };
        const response = await getClient().patch(`/${id}`, updates);
        return { content: [{ type: "text", text: JSON.stringify(response.data) }] };
      }
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error: any) {
    return {
      content: [{ type: "text", text: `Error: ${error.message}` }],
      isError: true,
    };
  }
});

async function run() {
  const isSse = process.argv.includes("--sse") || !!process.env.PORT;

  if (isSse) {
    const app = express();
    app.use(cors());
    const port = process.env.PORT || 8627;

    let transport: SSEServerTransport | null = null;

    app.get("/sse", async (req, res) => {
      // Extract client name from header
      const clientName = req.headers["x-client-name"] as string;
      if (clientName) {
        currentClientName = clientName;
      }

      transport = new SSEServerTransport("/messages", res);
      await server.connect(transport);
    });

    app.post("/messages", async (req, res) => {
      // Also check headers on messages
      const clientName = req.headers["x-client-name"] as string;
      if (clientName) {
        currentClientName = clientName;
      }

      if (transport) {
        await transport.handlePostMessage(req, res);
      } else {
        res.status(400).send("Session not established");
      }
    });

    app.listen(port, () => {
      console.error(`CyberMem MCP Server running on SSE at http://localhost:${port}`);
      console.error(`  - SSE endpoint: http://localhost:${port}/sse`);
      console.error(`  - Message endpoint: http://localhost:${port}/messages`);
    });

  } else {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("CyberMem MCP Server running on stdio");
  }
}

run().catch((error) => {
  console.error("Fatal error running server:", error);
  process.exit(1);
});
