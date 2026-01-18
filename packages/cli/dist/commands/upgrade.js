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
async function upgrade(options) {
    let target = "local";
    if (options.rpi)
        target = "rpi";
    if (options.vps)
        target = "vps";
    console.log(chalk_1.default.blue(`Upgrading CyberMem (${target})...`));
    try {
        if (target === "local") {
            console.log(chalk_1.default.blue("Pulling latest Docker images..."));
            // Re-use logic: find compose file from template if needed, OR use installed ~/.cybermem one?
            // "upgrade" implies updating running instance.
            // running instance uses ~/.cybermem/docker-compose.yml (if init copied it?)
            // Wait, init uses template directly?
            // "deploy/init" logic for local:
            // "docker-compose -f composeFile ...". composeFile was from templateDir.
            // It did NOT copy compose file to ~/.cybermem for local.
            // It uses the installed package's template.
            // So for upgrade (which might be run from newer CLI version), we use the NEW CLI's template.
            // Resolve Template Directory (Same logic as init)
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
            const dataDir = path_1.default.join(configDir, "data");
            // Pull images
            await (0, execa_1.default)("docker-compose", [
                "-f",
                composeFile,
                "--env-file",
                envFile,
                "--project-name",
                "cybermem",
                "pull",
            ], {
                stdio: "inherit",
                env: {
                    ...process.env,
                    DATA_DIR: dataDir,
                    CYBERMEM_ENV_PATH: envFile,
                    OM_API_KEY: "", // Local bypass
                },
            });
            // Up (recreate)
            console.log(chalk_1.default.blue("Restarting services..."));
            await (0, execa_1.default)("docker-compose", [
                "-f",
                composeFile,
                "--env-file",
                envFile,
                "--project-name",
                "cybermem",
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
                },
            });
            console.log(chalk_1.default.green("✅ Upgrade complete!"));
        }
        else if (target === "rpi" || target === "vps") {
            // Remote upgrade
            const answers = await inquirer_1.default.prompt([
                {
                    type: "input",
                    name: "host",
                    message: "Enter SSH Host (e.g. pi@raspberrypi.local):",
                    validate: (input) => input.includes("@") ? true : "Format must be user@host",
                },
            ]);
            const sshHost = answers.host;
            console.log(chalk_1.default.blue(`Upgrading remote host ${sshHost}...`));
            // 1. Upload NEW docker-compose.yml (from this CLI version)
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
            const composeFile = path_1.default.join(templateDir, "docker-compose.yml");
            console.log(chalk_1.default.blue("Uploading newest definitions..."));
            await (0, execa_1.default)("scp", [
                composeFile,
                `${sshHost}:~/.cybermem/docker-compose.yml`,
            ]);
            // 2. Pull and Up on Remote
            const remoteCmd = `
                export CYBERMEM_ENV_PATH=~/.cybermem/.env
                export DATA_DIR=~/.cybermem/data
                export DOCKER_DEFAULT_PLATFORM=linux/arm64
                docker-compose -f ~/.cybermem/docker-compose.yml pull
                docker-compose -f ~/.cybermem/docker-compose.yml up -d --remove-orphans
            `;
            await (0, execa_1.default)("ssh", [sshHost, remoteCmd], { stdio: "inherit" });
            console.log(chalk_1.default.green("✅ Remote upgrade complete!"));
        }
    }
    catch (error) {
        console.error(chalk_1.default.red("Upgrade failed:"), error);
        process.exit(1);
    }
}
