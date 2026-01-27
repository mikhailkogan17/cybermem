"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uninstall = uninstall;
const chalk_1 = __importDefault(require("chalk"));
const execa_1 = __importDefault(require("execa"));
const fs_1 = __importDefault(require("fs"));
const inquirer_1 = __importDefault(require("inquirer"));
const os_1 = __importDefault(require("os"));
const path_1 = __importDefault(require("path"));
// Helper to handle and suggest fixes for common errors
function handleExecError(error, context) {
    const stderr = error.stderr || "";
    let suggestion = "";
    if (stderr.includes("Permission denied") || stderr.includes("publickey")) {
        suggestion =
            "\n💡 Next Step: Ensure your SSH keys are added to the remote host: `ssh-copy-id user@host`";
    }
    else if (stderr.includes("docker-compose: command not found")) {
        suggestion =
            "\n💡 Next Step: Install Docker and ensure docker-compose is in your PATH.";
    }
    console.error(chalk_1.default.red(`\n❌ ${context} failed:`), error.message);
    if (suggestion)
        console.log(chalk_1.default.yellow(suggestion));
    // process.exit(1); // Don't always exit on uninstall failure so we can try data wipe?
}
async function uninstall(options) {
    let target = "local";
    if (options.rpi)
        target = "rpi";
    if (options.vps)
        target = "vps";
    console.log(chalk_1.default.blue(`Uninstalling CyberMem (${target})...`));
    try {
        if (target === "local") {
            const answers = await inquirer_1.default.prompt([
                {
                    type: "confirm",
                    name: "confirm",
                    message: chalk_1.default.red("Are you sure you want to uninstall CyberMem? This will stop all services."),
                    default: false,
                },
                {
                    type: "confirm",
                    name: "wipeData",
                    message: chalk_1.default.yellow("Do you also want to wipe all data (~/.cybermem)?"),
                    default: false,
                    when: (a) => a.confirm,
                },
            ]);
            if (!answers.confirm) {
                console.log(chalk_1.default.gray("Aborted."));
                return;
            }
            // Resolve Template Directory
            let templateDir = path_1.default.resolve(__dirname, "../../templates");
            if (!fs_1.default.existsSync(templateDir)) {
                templateDir = path_1.default.resolve(__dirname, "../../../templates");
            }
            if (!fs_1.default.existsSync(templateDir)) {
                templateDir = path_1.default.resolve(process.cwd(), "packages/cli/templates");
            }
            const composeFile = path_1.default.join(templateDir, "docker-compose.yml");
            const homeDir = os_1.default.homedir();
            const configDir = path_1.default.join(homeDir, ".cybermem");
            const envFile = path_1.default.join(configDir, ".env");
            console.log(chalk_1.default.blue("Stopping services..."));
            try {
                await (0, execa_1.default)("docker-compose", [
                    "-f",
                    composeFile,
                    "--env-file",
                    envFile,
                    "--project-name",
                    "cybermem",
                    "down",
                ], {
                    stdio: "inherit",
                    env: {
                        ...process.env,
                        DATA_DIR: path_1.default.join(configDir, "data"),
                        CYBERMEM_ENV_PATH: envFile,
                        OM_API_KEY: "",
                    },
                });
            }
            catch (e) {
                handleExecError(e, "Local uninstall");
            }
            if (answers.wipeData) {
                console.log(chalk_1.default.yellow(`Wiping configuration at ${configDir}...`));
                fs_1.default.rmSync(configDir, { recursive: true, force: true });
            }
            console.log(chalk_1.default.green("✅ CyberMem uninstalled successfully."));
        }
        else if (target === "rpi" || target === "vps") {
            let sshHost = options.host;
            if (!sshHost) {
                const answers = await inquirer_1.default.prompt([
                    {
                        type: "input",
                        name: "host",
                        message: "Enter SSH Host (e.g. pi@raspberrypi.local):",
                        validate: (input) => input.includes("@") ? true : "Format must be user@host",
                    },
                ]);
                sshHost = answers.host;
            }
            console.log(chalk_1.default.blue(`Uninstalling remote host ${sshHost} via Ansible...`));
            // Resolve Ansible Paths
            let templateDir = path_1.default.resolve(__dirname, "../../templates");
            if (!fs_1.default.existsSync(templateDir)) {
                templateDir = path_1.default.resolve(__dirname, "../../../templates");
            }
            if (!fs_1.default.existsSync(templateDir)) {
                templateDir = path_1.default.resolve(process.cwd(), "packages/cli/templates");
            }
            const playbookPath = path_1.default.join(templateDir, "ansible/playbooks/deploy-cybermem.yml");
            const ansibleDir = path_1.default.join(templateDir, "ansible");
            const host = sshHost.split("@")[1];
            const sshUser = sshHost.split("@")[0];
            // We use state=absent via extra vars to trigger a teardown in the playbook
            // (Assuming the playbook supports it or we add support)
            // For now, let's use a simple remote command until we harden the playbook to support uninstall
            const remoteCmd = `
            cd ~/.cybermem && docker-compose down
            rm -rf ~/.cybermem/docker-compose.yml
        `;
            try {
                await (0, execa_1.default)("ssh", [sshHost, remoteCmd], { stdio: "inherit" });
            }
            catch (e) {
                handleExecError(e, "Remote uninstall");
            }
            console.log(chalk_1.default.green("✅ Remote uninstallation complete!"));
        }
    }
    catch (error) {
        console.error(chalk_1.default.red("Uninstall failed:"), error);
        process.exit(1);
    }
}
