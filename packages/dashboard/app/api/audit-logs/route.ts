import fs from "fs";
import { NextResponse } from "next/server";
import path from "path";

export const dynamic = "force-dynamic";

// Use env var for db-exporter URL (Docker internal vs local dev)
const DB_EXPORTER_URL = process.env.DB_EXPORTER_URL || "http://localhost:8000";

// Load clients config for name normalization
let clientsConfig: any[] = [];
try {
  const configPath = path.join(process.cwd(), "public", "clients.json");
  clientsConfig = JSON.parse(fs.readFileSync(configPath, "utf-8"));
} catch (e) {
  console.error("Failed to load clients.json:", e);
}

// Normalize raw client name (e.g. "claude-ai") to friendly name (e.g. "Claude Desktop")
function normalizeClientName(rawName: string): string {
  if (!rawName) return "Unknown";
  const nameLower = rawName.toLowerCase();
  const client = clientsConfig.find((c: any) => {
    try {
      return new RegExp(c.match, "i").test(nameLower);
    } catch {
      return nameLower.includes(c.match);
    }
  });
  return client?.name || rawName;
}

const CLIENTS = ["Claude Code", "v0", "Cursor", "GitHub Copilot", "Windsurf"];
const OPERATIONS = ["Read", "Write", "Update", "Delete", "Create"];
const STATUSES = ["Success", "Success", "Success", "Warning", "Error"];
const DESCRIPTIONS = {
  Success: [
    "Operation completed successfully",
    "Resource accessed",
    "Data synchronized",
  ],
  Warning: [
    "High latency detected",
    "Rate limit approaching",
    "Deprecation warning",
  ],
  Error: [
    "Unauthorized access",
    "Internal server error",
    "Timeout exceeded",
    "Validation failed",
  ],
};

export async function GET(request: Request) {
  try {
    const homedir =
      process.env.HOME || process.env.USER || "/Users/mikhailkogan";
    const dbPath =
      process.env.OM_DB_PATH ||
      path.resolve(homedir, ".cybermem/data/openmemory.sqlite");

    if (!fs.existsSync(dbPath)) {
      console.error(`[AUDIT-LOGS-API] SQLite DB NOT FOUND at ${dbPath}`);
      return NextResponse.json({ logs: [] });
    }

    console.error(`[AUDIT-LOGS-API] Reading logs from ${dbPath}`);
    const sqlite3 = require("sqlite3").verbose();
    const { open } = require("sqlite");
    const db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
      mode: sqlite3.OPEN_READONLY,
    });

    await db.run("PRAGMA busy_timeout=5000");

    const rawLogsResults = await db.all(
      "SELECT * FROM cybermem_access_log ORDER BY timestamp DESC LIMIT 100",
    );
    const rawLogs = JSON.parse(JSON.stringify(rawLogsResults || []));
    await db.close();

    console.error(`[AUDIT-LOGS-API] Found ${rawLogs.length} logs in SQLite`);

    const logs = (rawLogs || []).map((log: any) => {
      const statusCode = parseInt(log.status) || 0;
      let status = "Success";
      if (log.is_error === 1 || statusCode >= 400 || statusCode === 0)
        status = "Error";
      else if (statusCode >= 300) status = "Warning";

      let tool = log.tool.toLowerCase();
      // Friendly labels for core tools if needed
      if (tool === "add_memory") tool = "Write";
      else if (tool === "query_memory") tool = "Read";
      else if (tool === "update_memory") tool = "Update";
      else if (tool === "delete_memory") tool = "Delete";
      else tool = tool.charAt(0).toUpperCase() + tool.slice(1);

      return {
        timestamp: log.timestamp,
        client: normalizeClientName(log.client_name),
        tool: tool,
        status: status,
        method: log.method,
        description: log.endpoint,
        rawStatus: log.status,
      };
    });

    return NextResponse.json({ logs });
  } catch (error) {
    console.error("[AUDIT-LOGS-API] Error fetching audit logs:", error);
    return NextResponse.json({ logs: [] });
  }
}
