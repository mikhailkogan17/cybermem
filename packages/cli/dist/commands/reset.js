"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.reset = reset;
const chalk_1 = __importDefault(require("chalk"));
const child_process_1 = require("child_process");
const ora_1 = __importDefault(require("ora"));
const inquirer_1 = __importDefault(require("inquirer"));
async function reset(options) {
    // ⚠️ PRODUCTION PROTECTION - Never wipe RPi database
    const cyberMemEnv = process.env.CYBERMEM_ENV || "";
    const hostname = process.env.HOSTNAME || "";
    if (cyberMemEnv === "production" || hostname.includes("raspberrypi")) {
        console.error(chalk_1.default.red("❌ BLOCKED: Cannot reset database in production environment!"));
        console.error(chalk_1.default.yellow("   CYBERMEM_ENV=" + cyberMemEnv + ", HOSTNAME=" + hostname));
        console.error(chalk_1.default.gray("   Use npx @cybermem/cli backup first, then manually clear if needed."));
        process.exit(1);
    }
    // Confirmation Prompt
    if (!options.force) {
        const { confirm } = await inquirer_1.default.prompt([
            {
                type: "confirm",
                name: "confirm",
                message: "⚠️  WARNING: This will corrupt all memories. Are you sure?",
                default: false,
            },
        ]);
        if (!confirm) {
            console.log(chalk_1.default.gray("Reset cancelled."));
            return;
        }
    }
    const spinner = (0, ora_1.default)("Resetting CyberMem database...").start();
    try {
        const containerName = process.env.MCP_CONTAINER_NAME || "cybermem-mcp-server-1";
        // Check if container exists
        try {
            (0, child_process_1.execSync)(`docker inspect ${containerName}`, { stdio: "pipe" });
        }
        catch {
            spinner.fail("Container not found. Is CyberMem running?");
            process.exit(1);
        }
        // Remove SQLite files
        spinner.text = "Removing database files...";
        (0, child_process_1.execSync)(`docker exec ${containerName} sh -c 'rm -f /data/openmemory.sqlite*'`, {
            stdio: "pipe",
        });
        // Restart container
        spinner.text = "Restarting container...";
        (0, child_process_1.execSync)(`docker restart ${containerName}`, { stdio: "pipe" });
        // Wait for health
        spinner.text = "Waiting for health check...";
        let healthy = false;
        for (let i = 0; i < 30; i++) {
            await new Promise((r) => setTimeout(r, 2000));
            try {
                (0, child_process_1.execSync)("curl -s http://localhost:8626/health | grep -q ok", {
                    stdio: "pipe",
                });
                healthy = true;
                break;
            }
            catch {
                // Still starting up
            }
        }
        if (!healthy) {
            spinner.fail("Container failed to become healthy");
            process.exit(1);
        }
        // Restart exporters
        spinner.text = "Restarting exporters...";
        try {
            (0, child_process_1.execSync)("docker restart cybermem-log-exporter cybermem-db-exporter", {
                stdio: "pipe",
            });
        }
        catch {
            // Exporters may not exist
        }
        spinner.succeed(chalk_1.default.green("Database reset successfully!"));
        console.log(chalk_1.default.gray("  All memories have been deleted."));
    }
    catch (error) {
        spinner.fail(`Reset failed: ${error.message}`);
        process.exit(1);
    }
}
