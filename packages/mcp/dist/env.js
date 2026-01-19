"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Environment Initialization for CyberMem MCP
 * Must be imported first to set side-effect vars.
 */
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
process.env.OM_TIER = process.env.OM_TIER || "hybrid";
process.env.OM_PORT = process.env.OM_PORT || "0";
process.env.PORT = process.env.PORT || "0";
