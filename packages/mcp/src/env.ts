import dotenv from "dotenv";
import os from "os";
import path from "path";

dotenv.config();

// CLI Enforcement: Ensure CyberMem is deployed via @cybermem/cli
if (!process.env.CYBERMEM_INSTANCE) {
  console.error(
    "\n❌ FATAL: CyberMem must be started via @cybermem/cli ('mcp install' or 'mcp up').",
  );
  console.error(
    "Manual 'npm start' or 'docker-compose up' without CLI tagging is forbidden.\n",
  );
  process.exit(1);
}

// Normalize OM_DB_PATH early so all components (SDK, exporters) use the same file
const homedir = os.homedir();
process.env.OM_DB_PATH =
  process.env.OM_DB_PATH ||
  path.resolve(homedir, ".cybermem/data/openmemory.sqlite");

process.env.OM_TIER = process.env.OM_TIER || "hybrid";
process.env.OM_PORT = process.env.OM_PORT || "0";
process.env.PORT = process.env.PORT || "0";
