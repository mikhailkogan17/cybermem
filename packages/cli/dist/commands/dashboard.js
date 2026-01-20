"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.dashboard = dashboard;
const chalk_1 = __importDefault(require("chalk"));
const fs_1 = __importDefault(require("fs"));
const net_1 = __importDefault(require("net"));
const open_1 = __importDefault(require("open"));
const os_1 = __importDefault(require("os"));
const path_1 = __importDefault(require("path"));
const TOKEN_FILE = path_1.default.join(os_1.default.homedir(), ".cybermem", "token.json");
const checkPort = (port) => {
    return new Promise((resolve) => {
        const socket = new net_1.default.Socket();
        const onError = () => {
            socket.destroy();
            resolve(false);
        };
        socket.setTimeout(500);
        socket.once("error", onError);
        socket.once("timeout", onError);
        socket.connect(port, "localhost", () => {
            socket.end();
            resolve(true);
        });
    });
};
/**
 * Get stored token from ~/.cybermem/token.json
 */
function getStoredToken() {
    try {
        if (!fs_1.default.existsSync(TOKEN_FILE))
            return null;
        const data = JSON.parse(fs_1.default.readFileSync(TOKEN_FILE, "utf-8"));
        if (new Date(data.expires_at) < new Date()) {
            console.warn(chalk_1.default.yellow("Token expired. Run: cybermem-cli login"));
            return null;
        }
        return data.access_token;
    }
    catch {
        return null;
    }
}
async function dashboard(options) {
    console.log(chalk_1.default.blue("Checking CyberMem stack status..."));
    const [dashboardUp, prometheusUp] = await Promise.all([
        checkPort(3000),
        checkPort(9092),
    ]);
    if (!dashboardUp) {
        console.error(chalk_1.default.red("❌ Dashboard is NOT running on port 3000."));
        console.log(chalk_1.default.yellow("Run 'cybermem up' or 'cd packages/dashboard && npm run dev' to start it."));
    }
    else {
        console.log(chalk_1.default.green("✅ Dashboard is running on port 3000."));
    }
    if (!prometheusUp) {
        console.warn(chalk_1.default.yellow("⚠️  Prometheus is NOT running on port 9092."));
        console.warn(chalk_1.default.gray("   Charts will be empty. Run 'cybermem up' or 'docker-compose up' to enable metrics."));
    }
    else {
        console.log(chalk_1.default.green("✅ Prometheus is running on port 9092."));
    }
    if (dashboardUp) {
        console.log(chalk_1.default.blue("\nOpening dashboard..."));
        await (0, open_1.default)("http://localhost:3000");
    }
    else {
        // Try remote dashboard if local isn't up
        const token = getStoredToken();
        if (token) {
            // Check for remote URL from environment or config
            const remoteUrl = process.env.CYBERMEM_DASHBOARD_URL;
            if (remoteUrl) {
                console.log(chalk_1.default.blue("\nOpening remote dashboard..."));
                await (0, open_1.default)(`${remoteUrl}/api/auth/token?token=${token}`);
            }
            else {
                console.log(chalk_1.default.gray("\nTip: Set CYBERMEM_DASHBOARD_URL to open remote dashboard."));
            }
        }
        else {
            console.log(chalk_1.default.gray("\nTip: Run 'cybermem-cli login' to enable remote access."));
        }
    }
}
