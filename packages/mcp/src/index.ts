#!/usr/bin/env node
/**
 * CyberMem MCP Server
 *
 * MCP server for AI agents to interact with CyberMem memory system.
 * Uses openmemory-js SDK directly (no HTTP, embedded SQLite).
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import { Memory } from "openmemory-js";
import { z } from "zod";
import { login, logout, showStatus } from "./auth.js";

dotenv.config();

// Handle CLI auth commands first
const args = process.argv.slice(2);

if (args.includes("--login")) {
  login()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("Login failed:", err.message);
      process.exit(1);
    });
} else if (args.includes("--logout")) {
  logout();
  process.exit(0);
} else if (args.includes("--status")) {
  showStatus();
  process.exit(0);
} else {
  // Continue with MCP server startup
  startServer();
}

async function startServer() {
  // Parse CLI args
  const getArg = (name: string): string | undefined => {
    const idx = args.indexOf(name);
    return idx !== -1 && args[idx + 1] ? args[idx + 1] : undefined;
  };

  const cliClientName = getArg("--client-name");

  // Track client name per session (used in tags)
  const currentClientName = cliClientName || "cybermem-mcp";

  // Configure openmemory-js SDK data path
  // Use ~/.cybermem/data/ so db-exporter can mount it
  const homedir = process.env.HOME || process.env.USERPROFILE || "";
  const dataDir = `${homedir}/.cybermem/data`;
  process.env.OM_DB_PATH = `${dataDir}/openmemory.sqlite`;

  // Ensure data directory exists
  const fs = require("fs");
  try {
    fs.mkdirSync(dataDir, { recursive: true });
  } catch {}

  // Initialize openmemory-js SDK (embedded SQLite)
  const memory = new Memory();

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

  // Create McpServer instance
  const server = new McpServer(
    {
      name: "cybermem",
      version: "0.8.0",
    },
    {
      capabilities: {
        tools: {},
        resources: {},
      },
      instructions: CYBERMEM_INSTRUCTIONS,
    },
  );

  // Register resources
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

  // Register tools using openmemory-js SDK
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
      // Add source tag automatically
      const tags = args.tags || [];
      if (!tags.some((t) => t.startsWith("source:"))) {
        tags.push(`source:${currentClientName}`);
      }

      const result = await memory.add(args.content, {
        user_id: args.user_id,
        tags,
      });

      return {
        content: [{ type: "text", text: JSON.stringify(result) }],
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
      const results = await memory.search(args.query, { limit: args.k });
      return {
        content: [{ type: "text", text: JSON.stringify(results) }],
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
      // Use search with empty query to list recent
      const results = await memory.search("", { limit: args.limit || 10 });
      return {
        content: [{ type: "text", text: JSON.stringify(results) }],
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
      // openmemory-js doesn't have delete by ID, use wipe for now
      // TODO: Implement delete_by_id in SDK or via direct DB query
      return {
        content: [
          {
            type: "text",
            text: `Delete not yet implemented in SDK. Memory ID: ${args.id}`,
          },
        ],
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
      }),
    },
    async (args) => {
      // TODO: Implement update in SDK
      return {
        content: [
          {
            type: "text",
            text: `Update not yet implemented in SDK. Memory ID: ${args.id}`,
          },
        ],
      };
    },
  );

  // Determine transport mode
  const transportArg = args.find(
    (arg) => arg === "--stdio" || arg === "--http",
  );
  const useHttp = transportArg === "--http" || args.includes("--port");

  if (useHttp) {
    // HTTP mode for testing/development
    const port = parseInt(getArg("--port") || "3100", 10);
    const app = express();

    app.use(cors());
    app.use(express.json());

    app.get("/health", (_req, res) => {
      res.json({ ok: true, version: "0.8.0", mode: "sdk" });
    });

    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => crypto.randomUUID(),
    });

    app.all("/mcp", async (req, res) => {
      await transport.handleRequest(req, res, req.body);
    });

    app.all("/sse", async (req, res) => {
      await transport.handleRequest(req, res, req.body);
    });

    server.connect(transport).then(() => {
      app.listen(port, () => {
        console.log(
          `CyberMem MCP (SDK mode) running on http://localhost:${port}`,
        );
        console.log("Health: /health | MCP: /mcp");
      });
    });
  } else {
    // STDIO mode (default for MCP clients)
    const transport = new StdioServerTransport();
    server.connect(transport).then(() => {
      console.error("CyberMem MCP (SDK mode) connected via STDIO");
    });
  }
}
