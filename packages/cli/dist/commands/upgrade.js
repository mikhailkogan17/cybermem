"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.upgrade = upgrade;
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
    else if (stderr.includes("Connection timed out") ||
        stderr.includes("Could not resolve host")) {
        suggestion =
            "\n💡 Next Step: Check your network connection or the remote host's availability.";
    }
    else if (stderr.includes("ansible-playbook: command not found")) {
        suggestion =
            "\n💡 Next Step: Install Ansible: `brew install ansible` (on macOS).";
    }
    else if (stderr.includes("docker-compose: command not found")) {
        suggestion =
            "\n💡 Next Step: Install Docker and ensure docker-compose is in your PATH.";
    }
    console.error(chalk_1.default.red(`\n❌ ${context} failed:`), error.message);
    if (suggestion)
        console.log(chalk_1.default.yellow(suggestion));
    process.exit(1);
}
async function upgrade(options) {
    let target = "local";
    if (options.rpi)
        target = "rpi";
    if (options.vps)
        target = "vps";
    const isStaging = !!options.staging;
    const envType = isStaging ? "staging" : "prod";
    const projectSuffix = isStaging ? "-staging" : "";
    console.log(chalk_1.default.blue(`Upgrading CyberMem (${target}-${envType})...`));
    try {
        if (target === "local") {
            console.log(chalk_1.default.blue("Pulling latest Docker images..."));
            // Resolve Template Directory
            let templateDir = path_1.default.resolve(__dirname, "../../templates");
            if (!fs_1.default.existsSync(templateDir)) {
                templateDir = path_1.default.resolve(__dirname, "../../../templates");
            }
            if (!fs_1.default.existsSync(templateDir)) {
                templateDir = path_1.default.resolve(process.cwd(), "packages/cli/templates");
            }
            if (!fs_1.default.existsSync(templateDir)) {
                templateDir = path_1.default.resolve(__dirname, "../templates");
            }
            if (!fs_1.default.existsSync(templateDir)) {
                throw new Error(`Templates not found at ${templateDir}.`);
            }
            const composeFile = path_1.default.join(templateDir, "docker-compose.yml");
            const homeDir = os_1.default.homedir();
            const configDir = path_1.default.join(homeDir, ".cybermem");
            const envFile = path_1.default.join(configDir, ".env");
            const dataDir = path_1.default.join(configDir, isStaging ? "data-staging" : "data");
            // Pull images
            try {
                await (0, execa_1.default)("docker-compose", [
                    "-f",
                    composeFile,
                    "--env-file",
                    envFile,
                    "--project-name",
                    `cybermem${projectSuffix}`,
                    "pull",
                ], {
                    stdio: "inherit",
                    env: {
                        ...process.env,
                        DATA_DIR: dataDir,
                        CYBERMEM_ENV_PATH: envFile,
                        OM_API_KEY: "", // Local bypass
                        PROJECT_NAME: `cybermem${projectSuffix}`,
                        TRAEFIK_PORT: isStaging ? "8625" : "8626",
                        DASHBOARD_PORT: isStaging ? "3001" : "3000",
                        CYBERMEM_ENV: envType,
                        CYBERMEM_INSTANCE: target,
                    },
                });
            }
            catch (e) {
                handleExecError(e, "Local image pull");
            }
            // Up (recreate)
            console.log(chalk_1.default.blue("Restarting services..."));
            await (0, execa_1.default)("docker-compose", [
                "-f",
                composeFile,
                "--env-file",
                envFile,
                "--project-name",
                `cybermem${projectSuffix}`,
                "up",
                "-d",
                "--remove-orphans",
            ], {
                stdio: "inherit",
                env: {
                    ...process.env,
                    DATA_DIR: dataDir,
                    CYBERMEM_ENV_PATH: envFile,
                    OM_API_KEY: "", // Local bypass
                    PROJECT_NAME: `cybermem${projectSuffix}`,
                    TRAEFIK_PORT: isStaging ? "8625" : "8626",
                    DASHBOARD_PORT: isStaging ? "3001" : "3000",
                    CYBERMEM_ENV: envType,
                    CYBERMEM_INSTANCE: target,
                },
            });
            console.log(chalk_1.default.green("✅ Upgrade complete!"));
        }
        else if (target === "rpi" || target === "vps") {
            // Remote upgrade via Ansible
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
            console.log(chalk_1.default.blue(`Upgrading remote host ${sshHost} via Ansible...`));
            // 1. Resolve Template Directory
            let templateDir = path_1.default.resolve(__dirname, "../../templates");
            if (!fs_1.default.existsSync(templateDir)) {
                templateDir = path_1.default.resolve(__dirname, "../../../templates");
            }
            if (!fs_1.default.existsSync(templateDir)) {
                templateDir = path_1.default.resolve(process.cwd(), "packages/cli/templates");
            }
            const playbookPath = path_1.default.join(templateDir, "ansible/playbooks/deploy-cybermem.yml");
            const ansibleDir = path_1.default.join(templateDir, "ansible");
            const [sshUser, host] = sshHost.split("@");
            // 2. Run Ansible Playbook
            // For upgrade, the playbook's default state (started) will pull latest images
            // if we ensure it performs a pull. Our playbook already pulls images.
            try {
                await (0, execa_1.default)("ansible-playbook", [
                    "-i",
                    `${host},`,
                    "-u",
                    sshUser,
                    playbookPath,
                    "--extra-vars",
                    `ansible_ssh_extra_args='-o StrictHostKeyChecking=no' CYBERMEM_ENV=${envType} TRAEFIK_PORT=${isStaging ? "8625" : "8626"} PROJECT_NAME=cybermem${projectSuffix} project_dir=/home/${sshUser}/cybermem${projectSuffix}`,
                ], {
                    stdio: "inherit",
                    cwd: ansibleDir,
                });
            }
            catch (e) {
                handleExecError(e, "Remote upgrade");
            }
            console.log(chalk_1.default.green("✅ Remote upgrade complete via Ansible!"));
        }
    }
    catch (error) {
        console.error(chalk_1.default.red("Upgrade failed:"), error);
        process.exit(1);
    }
}
