"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.dashboard = dashboard;
const chalk_1 = __importDefault(require("chalk"));
const net_1 = __importDefault(require("net"));
const open_1 = __importDefault(require("open"));
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
async function dashboard(options) {
    console.log(chalk_1.default.blue("Checking CyberMem stack status..."));
    const [dashboardUp, prometheusUp] = await Promise.all([
        checkPort(3000),
        checkPort(9092),
    ]);
    if (!dashboardUp) {
        console.error(chalk_1.default.red("❌ Dashboard is NOT running on port 3000."));
        console.log(chalk_1.default.yellow("Run 'cybermem up' or 'cd packages/dashboard && npm run dev' to start it."));
        // process.exit(1); // Optional: stay open to allow attempts? Nah, let's exit.
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
}
