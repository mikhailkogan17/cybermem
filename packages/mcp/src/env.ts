import dotenv from "dotenv";
import os from "os";
import path from "path";

dotenv.config();

// Auto-set CYBERMEM_INSTANCE for stdio mode (npx @cybermem/mcp)
// When started via @cybermem/cli, CYBERMEM_INSTANCE is already set.
if (!process.env.CYBERMEM_INSTANCE) {
  process.env.CYBERMEM_INSTANCE = `local-${os.hostname()}`;
  console.error(
    `[MCP] No CYBERMEM_INSTANCE set, defaulting to "${process.env.CYBERMEM_INSTANCE}"`,
  );
}

// Normalize OM_DB_PATH early so all components (SDK, exporters) use the same file
const homedir = os.homedir();
process.env.OM_DB_PATH =
  process.env.OM_DB_PATH ||
  path.resolve(homedir, ".cybermem/data/openmemory.sqlite");
process.env.DB_PATH = process.env.OM_DB_PATH;

process.env.OM_TIER = process.env.OM_TIER || "hybrid";
process.env.OM_PORT = process.env.OM_PORT || "0";
process.env.PORT = process.env.PORT || "0";
