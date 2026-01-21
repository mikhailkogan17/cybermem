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

export async function init(options: any) {
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

      console.log(chalk.blue(`Remote deploying to ${sshHost}...`));

      // 1. Create remote directory
      await execa("ssh", [sshHost, "mkdir -p ~/.cybermem/data"]);

      // 1.5 Check and fix Docker architecture (64-bit kernel with 32-bit Docker)
      console.log(chalk.blue("Checking Docker architecture..."));
      try {
        const { stdout: kernelArch } = await execa("ssh", [
          sshHost,
          "uname -m",
        ]);
        const { stdout: dockerArch } = await execa("ssh", [
          sshHost,
          'docker version --format "{{.Server.Arch}}" 2>/dev/null || echo "unknown"',
        ]);

        if (kernelArch.trim() === "aarch64" && dockerArch.trim() !== "arm64") {
          console.log(
            chalk.yellow(
              `⚠️  Docker is ${dockerArch.trim()}, kernel is aarch64. Installing arm64 Docker...`,
            ),
          );

          const installCmd = `
                        sudo systemctl stop docker docker.socket 2>/dev/null || true
                        curl -fsSL https://download.docker.com/linux/static/stable/aarch64/docker-27.5.1.tgz -o /tmp/docker.tgz
                        sudo tar -xzf /tmp/docker.tgz -C /usr/local/bin --strip-components=1
                        sudo /usr/local/bin/dockerd &
                        sleep 5
                        docker version --format "{{.Server.Arch}}"
                    `;

          const { stdout } = await execa("ssh", [sshHost, installCmd], {
            shell: true,
          });
          if (stdout.includes("arm64")) {
            console.log(chalk.green("✅ Docker arm64 installed successfully"));
          } else {
            console.log(
              chalk.yellow(
                "⚠️  Docker arm64 install may need manual verification",
              ),
            );
          }
        } else if (dockerArch.trim() === "arm64") {
          console.log(chalk.green(`✅ Docker is already arm64`));
        } else {
          console.log(
            chalk.gray(
              `Docker arch: ${dockerArch.trim()}, kernel: ${kernelArch.trim()}`,
            ),
          );
        }
      } catch (e: any) {
        console.log(
          chalk.yellow(`⚠️  Docker arch check skipped: ${e.message}`),
        );
      }

      // 2. Initial Env Setup (if missing)
      try {
        await execa("ssh", [sshHost, "[ -f ~/.cybermem/.env ]"]);
        console.log(chalk.gray("Remote .env exists, skipping generation."));
      } catch (e) {
        console.log(chalk.yellow("Generating remote configuration..."));

        let templateName = "rpi.env";
        if (target === "vps") templateName = "vps.env";
        else if (useTailscale) templateName = "rpi-tailscale.env";

        const templateEnv = path.join(templateDir, "envs", templateName);
        let envContent = fs.readFileSync(templateEnv, "utf-8");
        const newKey = `cm-${crypto.randomBytes(16).toString("hex")}`;

        // Replace OM_API_KEY with generated key
        if (envContent.includes("OM_API_KEY=")) {
          envContent = envContent.replace(
            /OM_API_KEY=.*/,
            `OM_API_KEY=${newKey}`,
          );
        }

        const tempEnv = path.join(os.tmpdir(), "cybermem-remote.env");
        fs.writeFileSync(tempEnv, envContent);
        await execa("scp", [tempEnv, `${sshHost}:~/.cybermem/.env`]);
        fs.unlinkSync(tempEnv);
        console.log(
          chalk.green(`✅ Security configuration generated (${templateName}).`),
        );
      }

      // 3. Copy Docker Compose
      console.log(chalk.blue("Uploading templates..."));
      await execa("scp", [
        composeFile,
        `${sshHost}:~/.cybermem/docker-compose.yml`,
      ]);

      // 4. Run Docker Compose Remotely
      console.log(chalk.blue("Starting services on RPi..."));
      // DOCKER_DEFAULT_PLATFORM=linux/arm64 forces arm64 images on RPi with 64-bit kernel but 32-bit Docker
      const remoteCmd = `
                export CYBERMEM_ENV_PATH=~/.cybermem/.env
                export DATA_DIR=~/.cybermem/data
                export DOCKER_DEFAULT_PLATFORM=linux/arm64
                docker-compose -f ~/.cybermem/docker-compose.yml up -d --remove-orphans
            `;

      await execa("ssh", [sshHost, remoteCmd], { stdio: "inherit" });

      console.log(chalk.green("\n✅ RPi deployment successful!"));
      const hostIp = sshHost.split("@")[1];
      console.log(chalk.bold("Access Points (LAN):"));
      console.log(
        `  - Dashboard:   ${chalk.underline(`http://${hostIp}:3000`)} (admin/admin)`,
      );
      console.log(
        `  - OpenMemory:  ${chalk.underline(`http://${hostIp}:8080`)}`,
      );

      // Tailscale Funnel setup
      if (useTailscale) {
        console.log(
          chalk.blue("\n🔗 Setting up Remote Access (Tailscale Funnel)..."),
        );

        try {
          try {
            await execa("ssh", [sshHost, "which tailscale"]);
          } catch (e) {
            console.log(chalk.yellow("  Tailscale not found. Installing..."));
            await execa(
              "ssh",
              [sshHost, "curl -fsSL https://tailscale.com/install.sh | sh"],
              { stdio: "inherit" },
            );
          }

          console.log(chalk.blue("  Ensuring Tailscale is up..."));
          try {
            await execa("ssh", [sshHost, "tailscale status"]);
          } catch (e) {
            console.log(
              chalk.yellow(
                "  ⚠️  Tailscale authentication required. Please follow the prompts:",
              ),
            );
            await execa("ssh", [sshHost, "sudo tailscale up"], {
              stdio: "inherit",
            });
          }

          console.log(
            chalk.blue("  Configuring HTTPS Funnel (requires sudo access)..."),
          );
          console.log(
            chalk.gray("  You may be prompted for your RPi password."),
          );

          await execa("ssh", ["-t", sshHost, "sudo tailscale serve reset"], {
            stdio: "inherit",
          }).catch(() => {});
          await execa(
            "ssh",
            [
              "-t",
              sshHost,
              "sudo tailscale serve --bg --set-path /cybermem http://127.0.0.1:8626",
            ],
            { stdio: "inherit" },
          );
          await execa(
            "ssh",
            ["-t", sshHost, "sudo tailscale serve --bg http://127.0.0.1:3000"],
            { stdio: "inherit" },
          );
          await execa(
            "ssh",
            ["-t", sshHost, "sudo tailscale funnel --bg 443"],
            { stdio: "inherit" },
          );

          const { stdout } = await execa("ssh", [
            sshHost,
            "tailscale status --json | jq -r '.Self.DNSName' | sed 's/\\.$//'",
          ]);
          const dnsName = stdout.trim();

          console.log(chalk.green("\n🌐 Remote Access Active (HTTPS):"));
          console.log(
            `  - Dashboard: ${chalk.underline(`https://${dnsName}/`)}`,
          );
          console.log(
            `  - MCP API:   ${chalk.underline(`https://${dnsName}/cybermem/mcp`)}`,
          );
        } catch (e) {
          console.log(chalk.red("\n❌ Remote Access setup failed:"));
          console.error(e);
          console.log(
            chalk.gray(
              "Manual setup: curl -fsSL https://tailscale.com/install.sh | sh && sudo tailscale up",
            ),
          );
        }
      } else {
        console.log(
          chalk.gray(
            "\n💡 For remote access, re-run with: npx @cybermem/cli --rpi --remote-access",
          ),
        );
      }
    }
  } catch (error) {
    console.error(chalk.red("Deployment failed:"), error);
    process.exit(1);
  }
}
