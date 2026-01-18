"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.init = init;
const chalk_1 = __importDefault(require("chalk"));
const crypto_1 = __importDefault(require("crypto"));
const execa_1 = __importDefault(require("execa"));
const fs_1 = __importDefault(require("fs"));
const inquirer_1 = __importDefault(require("inquirer"));
const os_1 = __importDefault(require("os"));
const path_1 = __importDefault(require("path"));
async function init(options) {
    // Determine target from flags
    let target = "local";
    if (options.rpi)
        target = "rpi";
    if (options.vps)
        target = "vps";
    const useTailscale = options.remoteAccess;
    console.log(chalk_1.default.blue(`Initializing CyberMem (${target})...`));
    try {
        // Resolve Template Directory (Support both Dev and Prod)
        let templateDir = path_1.default.resolve(__dirname, "../../templates");
        if (!fs_1.default.existsSync(templateDir)) {
            templateDir = path_1.default.resolve(__dirname, "../../../templates");
        }
        if (!fs_1.default.existsSync(templateDir)) {
            templateDir = path_1.default.resolve(process.cwd(), "packages/cli/templates");
        }
        if (!fs_1.default.existsSync(templateDir)) {
            // Fallback for different build structures
            templateDir = path_1.default.resolve(__dirname, "../templates");
        }
        if (!fs_1.default.existsSync(templateDir)) {
            throw new Error(`Templates not found at ${templateDir}. Please ensure package is built correctly.`);
        }
        if (target === "local") {
            const composeFile = path_1.default.join(templateDir, "docker-compose.yml");
            const internalEnvExample = path_1.default.join(templateDir, "envs/local.example");
            if (!fs_1.default.existsSync(composeFile)) {
                console.error(chalk_1.default.red(`Internal Error: Template not found at ${composeFile}`));
                process.exit(1);
            }
            // Home Directory Config
            const homeDir = os_1.default.homedir();
            const configDir = path_1.default.join(homeDir, ".cybermem");
            const envFile = path_1.default.join(configDir, ".env");
            const dataDir = path_1.default.join(configDir, "data");
            // 1. Ensure ~/.cybermem exists
            if (!fs_1.default.existsSync(configDir)) {
                fs_1.default.mkdirSync(configDir, { recursive: true });
                fs_1.default.mkdirSync(dataDir, { recursive: true });
            }
            // 2. Local Mode: Simplified setup without mandatory API key
            if (!fs_1.default.existsSync(envFile)) {
                console.log(chalk_1.default.yellow(`Initializing local configuration in ${configDir}...`));
                const envContent = fs_1.default.readFileSync(internalEnvExample, "utf-8");
                fs_1.default.writeFileSync(envFile, envContent);
                console.log(chalk_1.default.green(`Created .env at ${envFile}`));
            }
            console.log(chalk_1.default.blue("Starting CyberMem services in Local Mode..."));
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
                    OM_API_KEY: "",
                },
            });
            console.log(chalk_1.default.green("\n🎉 CyberMem Installed!"));
            console.log("");
            console.log(chalk_1.default.bold("Next Steps:"));
            console.log(`  1. Open ${chalk_1.default.underline("http://localhost:3000/client-connect")} to connect your MCP clients`);
            console.log(`  2. Default password: ${chalk_1.default.bold("admin")} (you'll be prompted to change it)`);
            console.log("");
            console.log(chalk_1.default.dim("Local mode is active: No API key required for connections from this laptop."));
        }
        else if (target === "rpi") {
            const composeFile = path_1.default.join(templateDir, "docker-compose.yml");
            const internalEnvExample = path_1.default.join(templateDir, "envs/rpi.example");
            const answers = await inquirer_1.default.prompt([
                {
                    type: "input",
                    name: "host",
                    message: "Enter SSH Host (e.g. pi@raspberrypi.local):",
                    validate: (input) => input.includes("@") ? true : "Format must be user@host",
                },
            ]);
            const sshHost = answers.host;
            console.log(chalk_1.default.blue(`Remote deploying to ${sshHost}...`));
            // 1. Create remote directory
            await (0, execa_1.default)("ssh", [sshHost, "mkdir -p ~/.cybermem/data"]);
            // 1.5 Check and fix Docker architecture (64-bit kernel with 32-bit Docker)
            console.log(chalk_1.default.blue("Checking Docker architecture..."));
            try {
                const { stdout: kernelArch } = await (0, execa_1.default)("ssh", [
                    sshHost,
                    "uname -m",
                ]);
                const { stdout: dockerArch } = await (0, execa_1.default)("ssh", [
                    sshHost,
                    'docker version --format "{{.Server.Arch}}" 2>/dev/null || echo "unknown"',
                ]);
                if (kernelArch.trim() === "aarch64" && dockerArch.trim() !== "arm64") {
                    console.log(chalk_1.default.yellow(`⚠️  Docker is ${dockerArch.trim()}, kernel is aarch64. Installing arm64 Docker...`));
                    const installCmd = `
                        sudo systemctl stop docker docker.socket 2>/dev/null || true
                        curl -fsSL https://download.docker.com/linux/static/stable/aarch64/docker-27.5.1.tgz -o /tmp/docker.tgz
                        sudo tar -xzf /tmp/docker.tgz -C /usr/local/bin --strip-components=1
                        sudo /usr/local/bin/dockerd &
                        sleep 5
                        docker version --format "{{.Server.Arch}}"
                    `;
                    const { stdout } = await (0, execa_1.default)("ssh", [sshHost, installCmd], {
                        shell: true,
                    });
                    if (stdout.includes("arm64")) {
                        console.log(chalk_1.default.green("✅ Docker arm64 installed successfully"));
                    }
                    else {
                        console.log(chalk_1.default.yellow("⚠️  Docker arm64 install may need manual verification"));
                    }
                }
                else if (dockerArch.trim() === "arm64") {
                    console.log(chalk_1.default.green(`✅ Docker is already arm64`));
                }
                else {
                    console.log(chalk_1.default.gray(`Docker arch: ${dockerArch.trim()}, kernel: ${kernelArch.trim()}`));
                }
            }
            catch (e) {
                console.log(chalk_1.default.yellow(`⚠️  Docker arch check skipped: ${e.message}`));
            }
            // 2. Initial Env Setup (if missing)
            try {
                await (0, execa_1.default)("ssh", [sshHost, "[ -f ~/.cybermem/.env ]"]);
                console.log(chalk_1.default.gray("Remote .env exists, skipping generation."));
            }
            catch (e) {
                console.log(chalk_1.default.yellow("Generating remote configuration..."));
                let envContent = fs_1.default.readFileSync(internalEnvExample, "utf-8");
                const newKey = `sk-${crypto_1.default.randomBytes(16).toString("hex")}`;
                // Replace OM_API_KEY with generated key (Internal Use Only)
                if (envContent.includes("OM_API_KEY=")) {
                    envContent = envContent.replace(/OM_API_KEY=.*/, `OM_API_KEY=${newKey}`);
                }
                else {
                    envContent += `\nOM_API_KEY=${newKey}\n`;
                }
                // Add INTERNAL comment
                envContent +=
                    "\n# INTERNAL KEY - DO NOT EXPOSE. Use OAuth for client access.\n";
                const tempEnv = path_1.default.join(os_1.default.tmpdir(), "cybermem-rpi.env");
                fs_1.default.writeFileSync(tempEnv, envContent);
                await (0, execa_1.default)("scp", [tempEnv, `${sshHost}:~/.cybermem/.env`]);
                fs_1.default.unlinkSync(tempEnv);
                console.log(chalk_1.default.green("✅ Security configuration generated."));
            }
            // 3. Copy Docker Compose
            console.log(chalk_1.default.blue("Uploading templates..."));
            await (0, execa_1.default)("scp", [
                composeFile,
                `${sshHost}:~/.cybermem/docker-compose.yml`,
            ]);
            // 4. Run Docker Compose Remotely
            console.log(chalk_1.default.blue("Starting services on RPi..."));
            // DOCKER_DEFAULT_PLATFORM=linux/arm64 forces arm64 images on RPi with 64-bit kernel but 32-bit Docker
            const remoteCmd = `
                export CYBERMEM_ENV_PATH=~/.cybermem/.env
                export DATA_DIR=~/.cybermem/data
                export DOCKER_DEFAULT_PLATFORM=linux/arm64
                docker-compose -f ~/.cybermem/docker-compose.yml up -d --remove-orphans
            `;
            await (0, execa_1.default)("ssh", [sshHost, remoteCmd], { stdio: "inherit" });
            console.log(chalk_1.default.green("\n✅ RPi deployment successful!"));
            const hostIp = sshHost.split("@")[1];
            console.log(chalk_1.default.bold("Access Points (LAN):"));
            console.log(`  - Dashboard:   ${chalk_1.default.underline(`http://${hostIp}:3000`)} (admin/admin)`);
            console.log(`  - OpenMemory:  ${chalk_1.default.underline(`http://${hostIp}:8080`)}`);
            // Tailscale Funnel setup
            if (useTailscale) {
                console.log(chalk_1.default.blue("\n🔗 Setting up Remote Access (Tailscale Funnel)..."));
                try {
                    try {
                        await (0, execa_1.default)("ssh", [sshHost, "which tailscale"]);
                    }
                    catch (e) {
                        console.log(chalk_1.default.yellow("  Tailscale not found. Installing..."));
                        await (0, execa_1.default)("ssh", [sshHost, "curl -fsSL https://tailscale.com/install.sh | sh"], { stdio: "inherit" });
                    }
                    console.log(chalk_1.default.blue("  Ensuring Tailscale is up..."));
                    try {
                        await (0, execa_1.default)("ssh", [sshHost, "tailscale status"]);
                    }
                    catch (e) {
                        console.log(chalk_1.default.yellow("  ⚠️  Tailscale authentication required. Please follow the prompts:"));
                        await (0, execa_1.default)("ssh", [sshHost, "sudo tailscale up"], {
                            stdio: "inherit",
                        });
                    }
                    console.log(chalk_1.default.blue("  Configuring HTTPS Funnel (requires sudo access)..."));
                    console.log(chalk_1.default.gray("  You may be prompted for your RPi password."));
                    await (0, execa_1.default)("ssh", ["-t", sshHost, "sudo tailscale serve reset"], {
                        stdio: "inherit",
                    }).catch(() => { });
                    await (0, execa_1.default)("ssh", [
                        "-t",
                        sshHost,
                        "sudo tailscale serve --bg --set-path /cybermem http://127.0.0.1:8626",
                    ], { stdio: "inherit" });
                    await (0, execa_1.default)("ssh", ["-t", sshHost, "sudo tailscale serve --bg http://127.0.0.1:3000"], { stdio: "inherit" });
                    await (0, execa_1.default)("ssh", ["-t", sshHost, "sudo tailscale funnel --bg 443"], { stdio: "inherit" });
                    const { stdout } = await (0, execa_1.default)("ssh", [
                        sshHost,
                        "tailscale status --json | jq -r '.Self.DNSName' | sed 's/\\.$//'",
                    ]);
                    const dnsName = stdout.trim();
                    console.log(chalk_1.default.green("\n🌐 Remote Access Active (HTTPS):"));
                    console.log(`  - Dashboard: ${chalk_1.default.underline(`https://${dnsName}/`)}`);
                    console.log(`  - MCP API:   ${chalk_1.default.underline(`https://${dnsName}/cybermem/mcp`)}`);
                }
                catch (e) {
                    console.log(chalk_1.default.red("\n❌ Remote Access setup failed:"));
                    console.error(e);
                    console.log(chalk_1.default.gray("Manual setup: curl -fsSL https://tailscale.com/install.sh | sh && sudo tailscale up"));
                }
            }
            else {
                console.log(chalk_1.default.gray("\n💡 For remote access, re-run with: npx @cybermem/cli --rpi --remote-access"));
            }
        }
        else if (target === "vps") {
            console.log(chalk_1.default.yellow("VPS deployment is similar to RPi."));
            console.log(chalk_1.default.blue("\n📋 VPS Deployment Steps:"));
            console.log("1. Run: npx @cybermem/cli --rpi pi@your-vps-ip");
            console.log("2. For HTTPS, choose one of:");
            console.log(chalk_1.default.gray("   a) Tailscale Funnel: --remote-access flag"));
            console.log(chalk_1.default.gray("   b) Caddy (recommended for public VPS):"));
            console.log(chalk_1.default.gray("      - Install Caddy: sudo apt install caddy"));
            console.log(chalk_1.default.gray("      - Configure /etc/caddy/Caddyfile:"));
            console.log(chalk_1.default.cyan(`
        cybermem.yourdomain.com {
            reverse_proxy localhost:3000
        }
        api.cybermem.yourdomain.com {
            reverse_proxy localhost:8080
        }
      `));
            console.log(chalk_1.default.gray("      - Restart: sudo systemctl restart caddy"));
            console.log(chalk_1.default.green("\n📚 Full docs: https://docs.cybermem.dev#https"));
        }
    }
    catch (error) {
        console.error(chalk_1.default.red("Deployment failed:"), error);
        process.exit(1);
    }
}
