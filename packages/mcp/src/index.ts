#!/usr/bin/env node
/**
 * CyberMem MCP Server
 *
 * STDIO→HTTP bridge for AI agents to interact with CyberMem memory system.
 * Uses the new McpServer API (non-deprecated) and StreamableHTTPServerTransport.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import axios from "axios";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import { z } from "zod";

dotenv.config();

// Parse CLI args for remote mode
const args = process.argv.slice(2);
const getArg = (name: string): string | undefined => {
  const idx = args.indexOf(name);
  return idx !== -1 && args[idx + 1] ? args[idx + 1] : undefined;
};

const cliUrl = getArg("--url");
const cliApiKey = getArg("--api-key");
const cliClientName = getArg("--client-name");

// Use CLI args first, then env, then defaults
const API_URL =
  cliUrl || process.env.CYBERMEM_URL || "http://localhost:8626/memory";
const API_KEY = cliApiKey || process.env.OM_API_KEY || "";

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
const PROTOCOL_REMINDER =
  "CyberMem Protocol: Store FULL content (no summaries), always include tags [topic, year, source:client-name]. Query 'user context profile' on session start.";

// Create McpServer instance (new API)
const server = new McpServer(
  {
    name: "cybermem",
    version: "0.7.0",
  },
  {
    capabilities: {
      tools: {},
      resources: {},
    },
    instructions: CYBERMEM_INSTRUCTIONS,
  },
);

// Create axios instance for API calls
const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    Authorization: `Bearer ${API_KEY}`,
  },
});

// Helper to add client name header
function getHeaders(customClientName?: string) {
  return {
    "X-Client-Name": customClientName || currentClientName,
  };
}

// Register resources using new API
server.registerResource(
  "CyberMem Agent Protocol",
  "cybermem://protocol",
  {
    description: "Instructions for AI agents using CyberMem memory system",
    mimeType: "text/plain",
  },
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

// Register tools using new registerTool API
server.registerTool(
  "add_memory",
  {
    description: `Store a new memory in CyberMem. ${PROTOCOL_REMINDER}`,
    inputSchema: z.object({
      content: z
        .string()
        .describe(
          "Full content with all details - NO truncation or summarization",
        ),
      user_id: z.string().optional(),
      tags: z
        .array(z.string())
        .optional()
        .describe("Always include [topic, year, source:your-client-name]"),
    }),
  },
  async (args) => {
    const response = await apiClient.post("/add", args, {
      headers: getHeaders(),
    });
    return {
      content: [{ type: "text", text: JSON.stringify(response.data) }],
    };
  },
);

server.registerTool(
  "query_memory",
  {
    description: `Search for relevant memories. On session start, call query_memory("user context profile") first.`,
    inputSchema: z.object({
      query: z.string(),
      k: z.number().default(5),
    }),
  },
  async (args) => {
    const response = await apiClient.post("/query", args, {
      headers: getHeaders(),
    });
    return {
      content: [{ type: "text", text: JSON.stringify(response.data) }],
    };
  },
);

server.registerTool(
  "list_memories",
  {
    description: "List recent memories",
    inputSchema: z.object({
      limit: z.number().default(10),
    }),
  },
  async (args) => {
    const limit = args?.limit || 10;
    const response = await apiClient.get(`/all?l=${limit}`, {
      headers: getHeaders(),
    });
    return {
      content: [{ type: "text", text: JSON.stringify(response.data) }],
    };
  },
);

server.registerTool(
  "delete_memory",
  {
    description: "Delete a memory by ID",
    inputSchema: z.object({
      id: z.string(),
    }),
  },
  async (args) => {
    await apiClient.delete(`/${args.id}`, {
      headers: getHeaders(),
    });
    return {
      content: [{ type: "text", text: `Memory ${args.id} deleted` }],
    };
  },
);

server.registerTool(
  "update_memory",
  {
    description: "Update a memory by ID",
    inputSchema: z.object({
      id: z.string(),
      content: z.string().optional(),
      tags: z.array(z.string()).optional(),
      metadata: z.record(z.unknown()).optional(),
    }),
  },
  async (args) => {
    const { id, ...updates } = args;
    const response = await apiClient.patch(`/${id}`, updates, {
      headers: getHeaders(),
    });
    return {
      content: [{ type: "text", text: JSON.stringify(response.data) }],
    };
  },
);

async function run() {
  const isSse = process.argv.includes("--sse") || !!process.env.PORT;

  if (isSse) {
    // HTTP/SSE mode using StreamableHTTPServerTransport
    const app = express();
    app.use(cors());
    app.use(express.json());
    const port = process.env.PORT || 8627;

    // Use the new StreamableHTTPServerTransport
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => crypto.randomUUID(),
    });

    // Handle MCP requests
    app.all("/mcp", async (req, res) => {
      // Extract client name from header
      const clientName = req.headers["x-client-name"] as string;
      if (clientName) {
        currentClientName = clientName;
      }

      try {
        await transport.handleRequest(req, res);
      } catch (error) {
        console.error("MCP request error:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    });

    // Connect server to transport
    await server.connect(transport);

    app.listen(port, () => {
      console.error(
        `CyberMem MCP Server running on HTTP at http://localhost:${port}`,
      );
      console.error(`  - MCP endpoint: http://localhost:${port}/mcp`);
    });
  } else {
    // STDIO mode (default for npx usage)
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("CyberMem MCP Server running on stdio");
  }
}

run().catch((error) => {
  console.error("Fatal error running server:", error);
  process.exit(1);
});
