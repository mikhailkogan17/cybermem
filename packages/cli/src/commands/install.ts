import chalk from "chalk";
import crypto from "crypto";
import execa from "execa";
import fs from "fs";
import inquirer from "inquirer";
import os from "os";
import path from "path";

// Helper to handle and suggest fixes for common errors
function handleExecError(error: any, context: string) {
  const stderr = error.stderr || "";
  let suggestion = "";

  if (stderr.includes("Permission denied") || stderr.includes("publickey")) {
    suggestion =
      "\n💡 Next Step: Ensure your SSH keys are added to the remote host: `ssh-copy-id user@host`";
  } else if (
    stderr.includes("Connection timed out") ||
    stderr.includes("Could not resolve host")
  ) {
    suggestion =
      "\n💡 Next Step: Check your network connection or the remote host's availability.";
  } else if (stderr.includes("ansible-playbook: command not found")) {
    suggestion =
      "\n💡 Next Step: Install Ansible: `brew install ansible` (on macOS).";
  } else if (stderr.includes("docker-compose: command not found")) {
    suggestion =
      "\n💡 Next Step: Install Docker and ensure docker-compose is in your PATH.";
  } else if (stderr.includes("port is already allocated")) {
    suggestion =
      "\n💡 Next Step: Check for port conflicts (8626, 3000, 8080) and stop competing services.";
  }

  console.error(chalk.red(`\n❌ ${context} failed:`), error.message);
  if (suggestion) console.log(chalk.yellow(suggestion));
  process.exit(1);
}

// Hash token using PBKDF2 (built-in, no bcrypt dependency)
async function hashToken(token: string): Promise<string> {
  return new Promise((resolve, reject) => {
    // Use a fixed salt prefix for deterministic validation
    const salt = crypto
      .createHash("sha256")
      .update("cybermem-salt-v1")
      .digest("hex")
      .slice(0, 16);
    crypto.pbkdf2(token, salt, 100000, 64, "sha512", (err, key) => {
      if (err) reject(err);
      else resolve(key.toString("hex"));
    });
  });
}

export async function install(options: any) {
  // Determine target from flags
  let target = "local";
  if (options.rpi) target = "rpi";
  if (options.vps) target = "vps";

  const isStaging = !!options.staging;
  const envType = isStaging ? "staging" : "prod";
  const useTailscale = !!options.remoteAccess;

  console.log(
    chalk.blue(
      `Initializing CyberMem (${target}-${envType}${useTailscale ? "-ts" : "-local"})...`,
    ),
  );

  try {
    // Resolve Template Directory (Support both Dev and Prod)
    let templateDir = path.resolve(__dirname, "../../templates");
    if (!fs.existsSync(templateDir)) {
      templateDir = path.resolve(__dirname, "../../../templates");
    }
    if (!fs.existsSync(templateDir)) {
      templateDir = path.resolve(process.cwd(), "packages/cli/templates");
    }
    if (!fs.existsSync(templateDir)) {
      // Fallback for different build structures
      templateDir = path.resolve(__dirname, "../templates");
    }

    if (!fs.existsSync(templateDir)) {
      throw new Error(
        `Templates not found at ${templateDir}. Please ensure package is built correctly.`,
      );
    }

    // Generate secure token for ALL deployment types
    const accessToken = `sk-${crypto.randomBytes(24).toString("base64url")}`;
    const tokenHash = await hashToken(accessToken); // PBKDF2 hash
    const tokenId = crypto.randomBytes(8).toString("hex");
    const tokenName = isStaging ? "staging-verifier" : "admin-cli";

    if (target === "local") {
      const composeFile = path.join(templateDir, "docker-compose.yml");

      if (!fs.existsSync(composeFile)) {
        console.error(
          chalk.red(`Internal Error: Template not found at ${composeFile}`),
        );
        process.exit(1);
      }

      // Home Directory Config
      const homeDir = os.homedir();
      const configDir = path.join(homeDir, ".cybermem");
      const envFile = path.join(configDir, ".env");
      const dataDir = path.join(configDir, isStaging ? "data-staging" : "data");

      // 1. Ensure ~/.cybermem exists
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
      }
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      // 2. Local Mode
      if (!fs.existsSync(envFile)) {
        console.log(
          chalk.yellow(`Initializing local configuration in ${configDir}...`),
        );
        const templateEnv = path.join(templateDir, "envs/local.env");
        const envContent = fs.readFileSync(templateEnv, "utf-8");
        fs.writeFileSync(envFile, envContent);
        console.log(chalk.green(`Created .env at ${envFile}`));
      }

      const dbPath = path.join(dataDir, "openmemory.sqlite");

      // Initialize access token and store hash in SQLite (BEFORE starting containers to avoid race/lock)
      console.log(chalk.blue("Initializing access token..."));

      // Check if token key already exists (idempotency)
      try {
        const sqlite3 = await import("sqlite3");
        const db = new sqlite3.default.Database(dbPath);

        // Promisify db.run and db.get for cleaner logic
        const run = (sql: string, params: any[] = []) =>
          new Promise<void>((resolve, reject) => {
            db.run(sql, params, (err) => (err ? reject(err) : resolve()));
          });

        const get = (sql: string, params: any[] = []) =>
          new Promise<any>((resolve, reject) => {
            db.get(sql, params, (err, row) =>
              err ? reject(err) : resolve(row),
            );
          });

        // Check if table exists and has correct schema
        const tableInfo = await new Promise<any[]>((resolve, reject) => {
          db.all("PRAGMA table_info(access_keys)", (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
          });
        });

        const hasIdColumn = tableInfo.some((col) => col.name === "id");

        if (tableInfo.length > 0 && !hasIdColumn) {
          console.warn(
            chalk.yellow("Detected malformed access_keys table. Recreating..."),
          );
          await run("DROP TABLE access_keys");
        }

        // Create table if not exists
        await run(`CREATE TABLE IF NOT EXISTS access_keys (
          id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
          key_hash TEXT NOT NULL,
          name TEXT DEFAULT 'default',
          user_id TEXT DEFAULT 'default',
          created_at TEXT DEFAULT (datetime('now')),
          last_used_at TEXT,
          is_active INTEGER DEFAULT 1
        );`);

        const row = await get(
          "SELECT COUNT(*) as count FROM access_keys WHERE is_active = 1",
        );

        if (row && row.count > 0) {
          db.close();
          console.log(chalk.gray("Access token configuration preserved."));
          // proceed without showing token
        } else {
          // Insert new key
          await run(
            "INSERT INTO access_keys (id, key_hash, name, user_id) VALUES (?, ?, ?, ?)",
            [tokenId, tokenHash, tokenName, "admin"],
          );
          db.close();
          // Store token as Docker Secret (File)
          const secretsDir = path.join(configDir, "secrets");
          if (!fs.existsSync(secretsDir))
            fs.mkdirSync(secretsDir, { recursive: true });

          const secretPath = path.join(secretsDir, "om_api_key");
          fs.writeFileSync(secretPath, accessToken, {
            encoding: "utf-8",
            mode: 0o600,
          });
        }
      } catch (e: any) {
        console.warn(
          chalk.yellow("Could not initialize access token: " + e.message),
        );
      }

      console.log(chalk.blue("Starting CyberMem services in Local Mode..."));

      try {
        await execa(
          "docker-compose",
          [
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
          ],
          {
            stdio: "inherit",
            env: {
              ...process.env,
              DATA_DIR: dataDir,
              SECRETS_DIR: path.join(configDir, "secrets"), // Pass secrets dir context
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
          },
        );
      } catch (e) {
        handleExecError(e, "Local deployment");
      }

      await printSuccessMessage(true, accessToken);

      async function printSuccessMessage(showToken: boolean, token?: string) {
        console.log(chalk.green("\n🎉 CyberMem Installed!"));
        console.log("");

        if (showToken && token) {
          console.log(chalk.bold("⚡ Your Access Token (save this!):"));
          console.log(chalk.cyan.bold(`   ${token}`));
          console.log("");
          console.log(
            chalk.gray(
              "   Use this token to connect MCP clients from other devices.",
            ),
          );
          console.log(
            chalk.gray("   You can regenerate it from Dashboard Settings."),
          );
          console.log("");
        }

        const entryPort = isStaging ? "8625" : "8626";
        console.log(chalk.bold("Next Steps:"));
        console.log(
          `  1. Open ${chalk.underline(`http://localhost:${entryPort}/client-setup`)} to connect your MCP clients`,
        );
        console.log(
          `  2. Local access is auto-authenticated (no token needed on localhost)`,
        );
        console.log("");
        console.log(
          chalk.dim(
            "Local mode is active: No auth required for connections from this device.",
          ),
        );

        // Network Awareness: Check for k3d mappings
        try {
          const { stdout } = await execa("k3d", [
            "cluster",
            "list",
            "--no-headers",
          ]);
          if (stdout.includes("cybermem")) {
            console.log(
              chalk.cyan("\nℹ️ Detected k3d cluster. Mapping check:"),
            );
            console.log(
              chalk.gray(
                `  LoadBalancer ${isStaging ? "8625" : "8626"} -> http://localhost:${isStaging ? "8625" : "8626"}`,
              ),
            );
            console.log(
              chalk.gray(
                `  Dashboard ${isStaging ? "3001" : "3000"} -> http://localhost:${isStaging ? "3001" : "3000"}`,
              ),
            );
          }
        } catch (e) {
          // ignore if k3d not present
        }
      }
    } else if (target === "rpi" || target === "vps") {
      const composeFile = path.join(templateDir, "docker-compose.yml");

      const answers = await inquirer.prompt([
        {
          type: "input",
          name: "host",
          message: "Enter SSH Host (e.g. pi@raspberrypi.local):",
          validate: (input) =>
            input.includes("@") ? true : "Format must be user@host",
        },
      ]);
      const sshHost = answers.host;

      console.log(chalk.blue(`Remote deploying to ${sshHost} via Ansible...`));

      // 1. Check if ansible-playbook is available
      try {
        await execa("ansible-playbook", ["--version"]);
      } catch (e) {
        throw new Error(
          "ansible-playbook not found. Please install Ansible on your MacBook to use remote deployment.",
        );
      }

      // 2. Parse sshHost (user@host)
      const [sshUser, host] = sshHost.split("@");
      if (!host) {
        throw new Error("Invalid SSH Host format. Use user@host");
      }

      // 3. Resolve Ansible Paths
      const playbookPath = path.join(
        templateDir,
        "ansible/playbooks/deploy-cybermem.yml",
      );
      const ansibleDir = path.join(templateDir, "ansible");

      if (!fs.existsSync(playbookPath)) {
        throw new Error(`Ansible playbook not found at ${playbookPath}`);
      }

      // 4. Run Ansible Playbook with Token Injection
      console.log(chalk.blue("Running CyberMem Deployment Playbook..."));

      // We use the comma-separated inventory trick for single host
      const inventory = `${host},`;

      try {
        await execa(
          "ansible-playbook",
          [
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
            `auth_token_name=${tokenName}`,
            "--extra-vars",
            `CYBERMEM_ENV=${envType}`, // Ensure ENV propogates
            "--extra-vars",
            `TRAEFIK_PORT=${isStaging ? "8625" : "8626"}`,
            "--extra-vars",
            `PROJECT_NAME=${isStaging ? "cybermem-staging" : "cybermem"}`,
          ],
          {
            stdio: "inherit",
            cwd: ansibleDir, // Run from ansible template dir so it finds roles/etc
          },
        );
      } catch (e) {
        handleExecError(e, "Remote deployment");
      }

      console.log(
        chalk.green("\n✅ Remote deployment successful via Ansible!"),
      );
      console.log(chalk.bold("⚡ Your Initial Access Token:"));
      console.log(chalk.cyan.bold(`   ${accessToken}`));
      console.log("");
      console.log(
        chalk.bold(
          `Dashboard should be available at: http://${host}:${isStaging ? "3001" : "3000"} (once images are pulled)`,
        ),
      );
    }
  } catch (error) {
    console.error(chalk.red("Deployment failed:"), error);
    process.exit(1);
  }
}
