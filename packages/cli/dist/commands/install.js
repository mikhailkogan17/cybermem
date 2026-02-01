"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.install = install;
const chalk_1 = __importDefault(require("chalk"));
const crypto_1 = __importDefault(require("crypto"));
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
    else if (stderr.includes("port is already allocated")) {
        suggestion =
            "\n💡 Next Step: Check for port conflicts (8626, 3000, 8080) and stop competing services.";
    }
    console.error(chalk_1.default.red(`\n❌ ${context} failed:`), error.message);
    if (suggestion)
        console.log(chalk_1.default.yellow(suggestion));
    process.exit(1);
}
// Hash token using PBKDF2 (built-in, no bcrypt dependency)
async function hashToken(token) {
    return new Promise((resolve, reject) => {
        // Use a fixed salt prefix for deterministic validation
        const salt = crypto_1.default
            .createHash("sha256")
            .update("cybermem-salt-v1")
            .digest("hex")
            .slice(0, 16);
        crypto_1.default.pbkdf2(token, salt, 100000, 64, "sha512", (err, key) => {
            if (err)
                reject(err);
            else
                resolve(key.toString("hex"));
        });
    });
}
async function install(options) {
    // Determine target from flags
    let target = "local";
    if (options.rpi)
        target = "rpi";
    if (options.vps)
        target = "vps";
    const isStaging = !!options.staging;
    const envType = isStaging ? "staging" : "prod";
    const useTailscale = !!options.remoteAccess;
    console.log(chalk_1.default.blue(`Initializing CyberMem (${target}-${envType}${useTailscale ? "-ts" : "-local"})...`));
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
        // Generate secure token for ALL deployment types
        // Format: sk- + 32 chars (16 bytes hex)
        const accessToken = `sk-${crypto_1.default.randomBytes(16).toString("hex")}`;
        const tokenHash = await hashToken(accessToken); // PBKDF2 hash
        const tokenId = crypto_1.default.randomBytes(8).toString("hex");
        const tokenName = isStaging ? "staging-verifier" : "admin-cli";
        if (target === "local") {
            const composeFile = path_1.default.join(templateDir, "docker-compose.yml");
            if (!fs_1.default.existsSync(composeFile)) {
                console.error(chalk_1.default.red(`Internal Error: Template not found at ${composeFile}`));
                process.exit(1);
            }
            // Home Directory Config
            const homeDir = os_1.default.homedir();
            const configDir = path_1.default.join(homeDir, ".cybermem");
            const envFile = path_1.default.join(configDir, ".env");
            const dataDir = path_1.default.join(configDir, isStaging ? "data-staging" : "data");
            // 1. Ensure ~/.cybermem exists
            if (!fs_1.default.existsSync(configDir)) {
                fs_1.default.mkdirSync(configDir, { recursive: true });
            }
            if (!fs_1.default.existsSync(dataDir)) {
                fs_1.default.mkdirSync(dataDir, { recursive: true });
            }
            // 2. Local Mode
            if (!fs_1.default.existsSync(envFile)) {
                console.log(chalk_1.default.yellow(`Initializing local configuration in ${configDir}...`));
                const templateEnv = path_1.default.join(templateDir, "envs/local.env");
                const envContent = fs_1.default.readFileSync(templateEnv, "utf-8");
                fs_1.default.writeFileSync(envFile, envContent);
                console.log(chalk_1.default.green(`Created .env at ${envFile}`));
            }
            const dbPath = path_1.default.join(dataDir, "openmemory.sqlite");
            const secretsDir = path_1.default.join(configDir, "secrets");
            const secretPath = path_1.default.join(secretsDir, "om_api_key");
            let localAccessToken = accessToken;
            // 1.5 Load existing local secret if present (SSoT)
            if (fs_1.default.existsSync(secretPath)) {
                localAccessToken = fs_1.default.readFileSync(secretPath, "utf-8").trim();
                console.log(chalk_1.default.gray(`Loaded existing SSoT token from ${secretPath}`));
            }
            // Initialize access token and store hash in SQLite (BEFORE starting containers to avoid race/lock)
            console.log(chalk_1.default.blue("Initializing local access token..."));
            // Check if token key already exists (idempotency)
            try {
                const sqlite3 = await Promise.resolve().then(() => __importStar(require("sqlite3")));
                const db = new sqlite3.default.Database(dbPath);
                // Promisify db.run and db.get for cleaner logic
                const run = (sql, params = []) => new Promise((resolve, reject) => {
                    db.run(sql, params, (err) => (err ? reject(err) : resolve()));
                });
                const get = (sql, params = []) => new Promise((resolve, reject) => {
                    db.get(sql, params, (err, row) => err ? reject(err) : resolve(row));
                });
                // Check if table exists and has correct schema
                const tableInfo = await new Promise((resolve, reject) => {
                    db.all("PRAGMA table_info(access_keys)", (err, rows) => {
                        if (err)
                            reject(err);
                        else
                            resolve(rows);
                    });
                });
                const hasIdColumn = tableInfo.some((col) => col.name === "id");
                if (tableInfo.length > 0 && !hasIdColumn) {
                    console.warn(chalk_1.default.yellow("Detected malformed access_keys table. Recreating..."));
                    await run("DROP TABLE access_keys");
                }
                // Create table if not exists with hash matching current localAccessToken
                const currentHash = await hashToken(localAccessToken);
                await run(`CREATE TABLE IF NOT EXISTS access_keys (
          id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
          key_hash TEXT NOT NULL,
          name TEXT DEFAULT 'default',
          user_id TEXT DEFAULT 'default',
          created_at TEXT DEFAULT (datetime('now')),
          last_used_at TEXT,
          is_active INTEGER DEFAULT 1
        );`);
                const row = await get("SELECT COUNT(*) as count FROM access_keys WHERE is_active = 1");
                if (row && row.count > 0) {
                    db.close();
                    console.log(chalk_1.default.gray("Access token configuration preserved."));
                    // proceed without showing token
                }
                else {
                    // Insert new key
                    await run("INSERT INTO access_keys (id, key_hash, name, user_id) VALUES (?, ?, ?, ?)", [tokenId, currentHash, tokenName, "admin"]);
                    db.close();
                    // Store token as Docker Secret (File)
                    if (!fs_1.default.existsSync(secretsDir))
                        fs_1.default.mkdirSync(secretsDir, { recursive: true });
                    fs_1.default.writeFileSync(secretPath, localAccessToken, {
                        encoding: "utf-8",
                        mode: 0o600,
                    });
                }
            }
            catch (e) {
                console.warn(chalk_1.default.yellow("Could not initialize access token: " + e.message));
            }
            console.log(chalk_1.default.blue("Starting CyberMem services in Local Mode..."));
            try {
                // Detect if we should use 'docker compose' (v2) or 'docker-compose' (v1)
                let composeCmd = ["docker-compose"];
                try {
                    await (0, execa_1.default)("docker", ["compose", "version"]);
                    composeCmd = ["docker", "compose"];
                }
                catch (e) {
                    // Fallback to v1 if v2 not found
                }
                await (0, execa_1.default)(composeCmd[0], [
                    ...composeCmd.slice(1),
                    "-f",
                    composeFile,
                    "--env-file",
                    envFile,
                    "--project-name",
                    "cybermem" + (isStaging ? "-staging" : ""),
                    "up",
                    "-d",
                    "--build",
                    "--remove-orphans",
                ], {
                    stdio: "inherit",
                    env: {
                        ...process.env,
                        DATA_DIR: dataDir,
                        SECRETS_DIR: path_1.default.join(configDir, "secrets"), // Pass secrets dir context
                        CYBERMEM_ENV_PATH: envFile,
                        OM_API_KEY: "", // Legacy env var disabled
                        PROJECT_NAME: "cybermem" + (isStaging ? "-staging" : ""),
                        // Refined environment tagging
                        CYBERMEM_ENV: envType,
                        CYBERMEM_INSTANCE: target,
                        CYBERMEM_TAILSCALE: useTailscale ? "true" : "false",
                        // Port parameterization
                        TRAEFIK_PORT: isStaging ? "8625" : "8626",
                        DASHBOARD_PORT: isStaging ? "3001" : "3000",
                    },
                });
            }
            catch (e) {
                handleExecError(e, "Local deployment");
            }
            await printSuccessMessage(true, localAccessToken);
            async function printSuccessMessage(showToken, token) {
                console.log(chalk_1.default.green("\n🎉 CyberMem Installed!"));
                console.log("");
                if (showToken && token) {
                    console.log(chalk_1.default.bold("⚡ Your Access Token (save this!):"));
                    console.log(chalk_1.default.cyan.bold(`   ${token}`));
                    console.log("");
                    console.log(chalk_1.default.gray("   Use this token to connect MCP clients from other devices."));
                    console.log(chalk_1.default.gray("   You can regenerate it from Dashboard Settings."));
                    console.log("");
                }
                const entryPort = isStaging ? "8625" : "8626";
                console.log(chalk_1.default.bold("Next Steps:"));
                console.log(`  1. Open ${chalk_1.default.underline(`http://localhost:${entryPort}/client-setup`)} to connect your MCP clients`);
                console.log(`  2. Local access is auto-authenticated (no token needed on localhost)`);
                console.log("");
                console.log(chalk_1.default.dim("Local mode is active: No auth required for connections from this device."));
            }
        }
        else if (target === "rpi" || target === "vps") {
            const composeFile = path_1.default.join(templateDir, "docker-compose.yml");
            const answers = await inquirer_1.default.prompt([
                {
                    type: "input",
                    name: "host",
                    message: "Enter SSH Host (e.g. pi@raspberrypi.local):",
                    validate: (input) => input.includes("@") ? true : "Format must be user@host",
                },
            ]);
            const sshHost = answers.host;
            console.log(chalk_1.default.blue(`Remote deploying to ${sshHost} via Ansible...`));
            // 1. Check if ansible-playbook is available
            try {
                await (0, execa_1.default)("ansible-playbook", ["--version"]);
            }
            catch (e) {
                throw new Error("ansible-playbook not found. Please install Ansible on your MacBook to use remote deployment.");
            }
            // 2. Parse sshHost (user@host)
            const [sshUser, host] = sshHost.split("@");
            if (!host) {
                throw new Error("Invalid SSH Host format. Use user@host");
            }
            // 3. Resolve Ansible Paths
            const playbookPath = path_1.default.join(templateDir, "ansible/playbooks/deploy-cybermem.yml");
            const ansibleDir = path_1.default.join(templateDir, "ansible");
            if (!fs_1.default.existsSync(playbookPath)) {
                throw new Error(`Ansible playbook not found at ${playbookPath}`);
            }
            // 4. Run Ansible Playbook with Token Injection
            console.log(chalk_1.default.blue("Running CyberMem Deployment Playbook..."));
            // We use the comma-separated inventory trick for single host
            const inventory = `${host},`;
            try {
                await (0, execa_1.default)("ansible-playbook", [
                    "-i",
                    inventory,
                    "-u",
                    sshUser,
                    playbookPath,
                    "--extra-vars",
                    `ansible_ssh_extra_args='-o StrictHostKeyChecking=no'`,
                    "--extra-vars",
                    `auth_token_hash=${tokenHash}`, // Pass the hash
                    "--extra-vars",
                    `auth_token_id=${tokenId}`,
                    "--extra-vars",
                    `auth_token_id=${tokenId}`,
                    "--extra-vars",
                    `auth_token_name=${tokenName}`,
                    "--extra-vars",
                    `auth_token_value=${accessToken}`,
                    "--extra-vars",
                    `CYBERMEM_ENV=${envType}`, // Ensure ENV propogates
                    "--extra-vars",
                    `TRAEFIK_PORT=${isStaging ? "8625" : "8626"}`,
                    "--extra-vars",
                    `CYBERMEM_TAILSCALE=${useTailscale}`,
                    "--extra-vars",
                    `PROJECT_NAME=${isStaging ? "cybermem-staging" : "cybermem"}`,
                ], {
                    stdio: "inherit",
                    cwd: ansibleDir, // Run from ansible template dir so it finds roles/etc
                });
            }
            catch (e) {
                handleExecError(e, "Remote deployment");
            }
            console.log(chalk_1.default.green("\n✅ Remote deployment successful via Ansible!"));
            console.log(chalk_1.default.bold("⚡ Your Initial Access Token:"));
            console.log(chalk_1.default.cyan.bold(`   ${accessToken}`));
            console.log("");
            console.log(chalk_1.default.bold(`Dashboard should be available at: http://${host}:${isStaging ? "3001" : "3000"} (once images are pulled)`));
        }
    }
    catch (error) {
        console.error(chalk_1.default.red("Deployment failed:"), error);
        process.exit(1);
    }
}
