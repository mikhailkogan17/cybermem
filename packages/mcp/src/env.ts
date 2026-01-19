/**
 * Environment Initialization for CyberMem MCP
 * Must be imported first to set side-effect vars.
 */
import dotenv from "dotenv";
dotenv.config();

process.env.OM_TIER = process.env.OM_TIER || "hybrid";
process.env.OM_PORT = process.env.OM_PORT || "0";
process.env.PORT = process.env.PORT || "0";
