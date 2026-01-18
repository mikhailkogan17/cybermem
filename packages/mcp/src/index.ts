#!/usr/bin/env node
/**
 * CyberMem MCP Server
 *
 * Supports two modes:
 * 1. Local/Server Mode (default): Uses openmemory-js SDK directly.
 * 2. Remote Client Mode (with --url): Proxies requests to a remote CyberMem server via HTTP.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import axios from "axios";
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
  startServer();
}

async function startServer() {
  const getArg = (name: string) => {
    const idx = args.indexOf(name);
    return idx !== -1 && args[idx + 1] ? args[idx + 1] : undefined;
  };

  const cliClientName = getArg("--client-name") || "cybermem-mcp";
  const cliUrl = getArg("--url");
  const cliApiKey = getArg("--api-key");

  // Protocol Instructions
  const CYBERMEM_INSTRUCTIONS = `CyberMem is a persistent context daemon for AI agents.
PROTOCOL:
1. On session start: call query_memory("user context profile")
2. Store new insights immediately with add_memory (FULL content)
3. Always include tags: [topic, year, source:your-client-name]
For full protocol: https://docs.cybermem.dev/agent-protocol`;

  const server = new McpServer(
    { name: "cybermem", version: "0.8.2" },
    {
      instructions: CYBERMEM_INSTRUCTIONS,
    },
  );

  server.registerResource(
    "CyberMem Agent Protocol",
    "cybermem://protocol",
    { description: "Instructions for AI agents", mimeType: "text/plain" },
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

  // --- IMPLEMENTATION LOGIC ---

  let memory: Memory | null = null;
  let apiClient: any = null;

  if (cliUrl) {
    // REMOTE CLIENT MODE
    console.error(`Connecting to remote CyberMem at ${cliUrl}`);
    apiClient = axios.create({
      baseURL: cliUrl,
      headers: {
        Authorization: `Bearer ${cliApiKey}`,
        "X-Client-Name": cliClientName,
      },
    });
  } else {
    // LOCAL SDK MODE
    const homedir = process.env.HOME || process.env.USERPROFILE || "";
    // Default to ~/.cybermem/data if OM_DB_PATH not set
    if (!process.env.OM_DB_PATH) {
      process.env.OM_DB_PATH = `${homedir}/.cybermem/data/openmemory.sqlite`;
    }

    // Ensure directory exists
    const fs = require("fs");
    try {
      const dbPath = process.env.OM_DB_PATH;
      const dir = dbPath.substring(0, dbPath.lastIndexOf("/"));
      if (dir) fs.mkdirSync(dir, { recursive: true });
    } catch {}

    memory = new Memory();
  }

  // Helper to add source tag
  const addSourceTag = (tags: string[] = []) => {
    if (!tags.some((t) => t.startsWith("source:")))
      tags.push(`source:${cliClientName}`);
    return tags;
  };

  // --- TOOLS ---

  server.registerTool(
    "add_memory",
    {
      description: "Store a new memory. " + CYBERMEM_INSTRUCTIONS,
      inputSchema: z.object({
        content: z.string(),
        user_id: z.string().optional(),
        tags: z.array(z.string()).optional(),
      }),
    },
    async (args) => {
      const tags = addSourceTag(args.tags);
      if (cliUrl) {
        const res = await apiClient.post("/add", { ...args, tags });
        return { content: [{ type: "text", text: JSON.stringify(res.data) }] };
      } else {
        const res = await memory!.add(args.content, {
          user_id: args.user_id,
          tags,
        });
        return { content: [{ type: "text", text: JSON.stringify(res) }] };
      }
    },
  );

  server.registerTool(
    "query_memory",
    {
      description: "Search memories.",
      inputSchema: z.object({ query: z.string(), k: z.number().default(5) }),
    },
    async (args) => {
      if (cliUrl) {
        const res = await apiClient.post("/query", args);
        return { content: [{ type: "text", text: JSON.stringify(res.data) }] };
      } else {
        const res = await memory!.search(args.query, { limit: args.k });
        return { content: [{ type: "text", text: JSON.stringify(res) }] };
      }
    },
  );

  server.registerTool(
    "list_memories",
    {
      description: "List recent memories",
      inputSchema: z.object({ limit: z.number().default(10) }),
    },
    async (args) => {
      if (cliUrl) {
        // Fallback to /query with empty string if /list not available, or use /all
        // Old API had /all
        try {
          const res = await apiClient.get(`/all?limit=${args.limit}`);
          return {
            content: [{ type: "text", text: JSON.stringify(res.data) }],
          };
        } catch {
          const res = await apiClient.post("/query", {
            query: "",
            k: args.limit,
          });
          return {
            content: [{ type: "text", text: JSON.stringify(res.data) }],
          };
        }
      } else {
        const res = await memory!.search("", { limit: args.limit });
        return { content: [{ type: "text", text: JSON.stringify(res) }] };
      }
    },
  );

  server.registerTool(
    "delete_memory",
    {
      description: "Delete memory by ID",
      inputSchema: z.object({ id: z.string() }),
    },
    async (args) => {
      if (cliUrl) {
        const res = await apiClient.delete(`/${args.id}`);
        return { content: [{ type: "text", text: JSON.stringify(res.data) }] };
      } else {
        return {
          content: [
            { type: "text", text: "Delete not implemented in SDK yet" },
          ],
        };
      }
    },
  );

  server.registerTool(
    "update_memory",
    {
      description: "Update memory",
      inputSchema: z.object({ id: z.string(), content: z.string().optional() }),
    },
    async (args) => {
      return { content: [{ type: "text", text: "Update not implemented" }] };
    },
  );

  // --- TRANSPORT ---

  const useHttp = args.includes("--http") || args.includes("--port");

  if (useHttp) {
    const port = parseInt(getArg("--port") || "3100", 10);
    const app = express();
    app.use(cors());
    app.use(express.json());

    app.get("/health", (req, res) =>
      res.json({ ok: true, version: "0.8.2", mode: cliUrl ? "proxy" : "sdk" }),
    );

    // REST API Compatibility (for Remote Clients)
    // Only enable if in SDK mode (Server)
    if (!cliUrl && memory) {
      app.post("/add", async (req, res) => {
        try {
          const { content, user_id, tags } = req.body;
          const finalTags = addSourceTag(tags);
          const result = await memory!.add(content, {
            user_id,
            tags: finalTags,
          });
          res.json(result);
        } catch (e: any) {
          res.status(500).json({ error: e.message });
        }
      });

      app.post("/query", async (req, res) => {
        try {
          const { query, k } = req.body;
          const result = await memory!.search(query || "", { limit: k || 5 });
          res.json(result);
        } catch (e: any) {
          res.status(500).json({ error: e.message });
        }
      });

      app.get("/all", async (req, res) => {
        try {
          const limit = parseInt(req.query.limit as string) || 10;
          const result = await memory!.search("", { limit });
          res.json(result);
        } catch (e: any) {
          res.status(500).json({ error: e.message });
        }
      });
    }

    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => crypto.randomUUID(),
    });
    app.all(
      "/mcp",
      async (req, res) => await transport.handleRequest(req, res, req.body),
    );
    app.all(
      "/sse",
      async (req, res) => await transport.handleRequest(req, res, req.body),
    );

    server.connect(transport).then(() => {
      app.listen(port, () => {
        console.log(`CyberMem MCP running on http://localhost:${port}`);
      });
    });
  } else {
    const transport = new StdioServerTransport();
    server
      .connect(transport)
      .then(() => console.error("CyberMem MCP connected via STDIO"));
  }
}
