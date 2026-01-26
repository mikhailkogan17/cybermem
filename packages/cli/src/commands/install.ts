import chalk from "chalk";
import crypto from "crypto";
import execa from "execa";
import fs from "fs";
import inquirer from "inquirer";
import os from "os";
import path from "path";

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

  const useTailscale = options.remoteAccess;
  console.log(chalk.blue(`Initializing CyberMem (${target})...`));

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
      const dataDir = path.join(configDir, "data");

      // 1. Ensure ~/.cybermem exists
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
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

      console.log(chalk.blue("Starting CyberMem services in Local Mode..."));

      await execa(
        "docker-compose",
        [
          "-f",
          composeFile,
          "--env-file",
          envFile,
          "--project-name",
          "cybermem",
          "up",
          "-d",
          "--remove-orphans",
        ],
        {
          stdio: "inherit",
          env: {
            ...process.env,
            DATA_DIR: dataDir,
            CYBERMEM_ENV_PATH: envFile,
            OM_API_KEY: "",
          },
        },
      );

      // Generate access token and store hash in SQLite
      const accessToken = `sk-${crypto.randomBytes(24).toString("base64url")}`;
      const bcryptHash = await hashToken(accessToken);
      const dbPath = path.join(dataDir, "openmemory.sqlite");

      // Wait for SQLite DB to be created by MCP server
      console.log(chalk.blue("Initializing access token..."));
      await new Promise((resolve) => setTimeout(resolve, 3000));

      // Check if token already exists
      try {
        const sqlite3 = await import("sqlite3");
        const db = new sqlite3.default.Database(dbPath);

        // Create table if not exists (in case MCP hasn't run yet)
        db.run(`CREATE TABLE IF NOT EXISTS access_keys (
          id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
          key_hash TEXT NOT NULL,
          name TEXT DEFAULT 'default',
          user_id TEXT DEFAULT 'default',
          created_at TEXT DEFAULT (datetime('now')),
          last_used_at TEXT,
          is_active INTEGER DEFAULT 1
        );`);

        // Check for existing key
        db.get(
          "SELECT COUNT(*) as count FROM access_keys WHERE is_active = 1",
          [],
          (err: any, row: any) => {
            if (err || (row && row.count > 0)) {
              db.close();
              // Token exists, don't regenerate
              console.log(chalk.gray("Access token already configured."));
              printSuccessMessage(false);
              return;
            }

            // Insert new key
            db.run(
              "INSERT INTO access_keys (id, key_hash, name, user_id) VALUES (?, ?, ?, ?)",
              [
                crypto.randomBytes(8).toString("hex"),
                bcryptHash,
                "default",
                "default",
              ],
              (err: any) => {
                db.close();
                if (err) {
                  console.warn(
                    chalk.yellow(
                      "Could not store access token: " + err.message,
                    ),
                  );
                  printSuccessMessage(false);
                } else {
                  printSuccessMessage(true, accessToken);
                }
              },
            );
          },
        );
      } catch (e: any) {
        console.warn(
          chalk.yellow("Could not initialize access token: " + e.message),
        );
        console.log(
          chalk.gray("You can generate a token from the Dashboard Settings."),
        );
        printSuccessMessage(false);
      }

      function printSuccessMessage(showToken: boolean, token?: string) {
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

        console.log(chalk.bold("Next Steps:"));
        console.log(
          `  1. Open ${chalk.underline("http://localhost:3000/client-setup")} to connect your MCP clients`,
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

      // 4. Run Ansible Playbook
      console.log(chalk.blue("Running CyberMem Deployment Playbook..."));

      // We use the comma-separated inventory trick for single host
      const inventory = `${host},`;

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
        ],
        {
          stdio: "inherit",
          cwd: ansibleDir, // Run from ansible template dir so it finds roles/etc
        },
      );

      console.log(
        chalk.green("\n✅ Remote deployment successful via Ansible!"),
      );
      console.log(
        chalk.bold(
          `Dashboard should be available at: http://${host}:3000 (once images are pulled)`,
        ),
      );
    }
  } catch (error) {
    console.error(chalk.red("Deployment failed:"), error);
    process.exit(1);
  }
}
