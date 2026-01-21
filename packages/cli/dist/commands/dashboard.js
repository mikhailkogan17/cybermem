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
    const [dashboardUp, dbExporterUp] = await Promise.all([
        checkPort(3000),
        checkPort(8000),
    ]);
    if (!dashboardUp) {
        console.error(chalk_1.default.red("❌ Dashboard is NOT running on port 3000."));
        console.log(chalk_1.default.yellow("Run 'npx @cybermem/cli init' to start the stack."));
    }
    else {
        console.log(chalk_1.default.green("✅ Dashboard is running on port 3000."));
    }
    if (!dbExporterUp) {
        console.warn(chalk_1.default.yellow("⚠️  db-exporter is NOT running on port 8000."));
        console.warn(chalk_1.default.gray("   API may not be available. Run 'docker-compose up -d' to start services."));
    }
    else {
        console.log(chalk_1.default.green("✅ db-exporter is running on port 8000."));
    }
    if (dashboardUp) {
        console.log(chalk_1.default.blue("\nOpening dashboard..."));
        await (0, open_1.default)("http://localhost:3000");
    }
    else {
        console.log(chalk_1.default.gray("\nTip: Access remote dashboard at http://<your-server>:3000"));
        console.log(chalk_1.default.gray("     Copy your access token from Settings to connect."));
    }
}
