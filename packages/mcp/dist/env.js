"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const os_1 = __importDefault(require("os"));
const path_1 = __importDefault(require("path"));
dotenv_1.default.config();
// CLI Enforcement: Ensure CyberMem is deployed via @cybermem/cli
if (!process.env.CYBERMEM_INSTANCE) {
    console.error("\n❌ FATAL: CyberMem must be started via @cybermem/cli ('mcp install' or 'mcp up').");
    console.error("Manual 'npm start' or 'docker-compose up' without CLI tagging is forbidden.\n");
    process.exit(1);
}
// Normalize OM_DB_PATH early so all components (SDK, exporters) use the same file
const homedir = os_1.default.homedir();
process.env.OM_DB_PATH =
    process.env.OM_DB_PATH ||
        path_1.default.resolve(homedir, ".cybermem/data/openmemory.sqlite");
process.env.DB_PATH = process.env.OM_DB_PATH;
process.env.OM_TIER = process.env.OM_TIER || "hybrid";
process.env.OM_PORT = process.env.OM_PORT || "0";
process.env.PORT = process.env.PORT || "0";
