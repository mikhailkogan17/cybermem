import chalk from "chalk";
import execa from "execa";
import fs from "fs";
import inquirer from "inquirer";
import os from "os";
import path from "path";

export async function upgrade(options: any) {
  let target = "local";
  if (options.rpi) target = "rpi";
  if (options.vps) target = "vps";

  console.log(chalk.blue(`Upgrading CyberMem (${target})...`));

  try {
    if (target === "local") {
      console.log(chalk.blue("Pulling latest Docker images..."));

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
      let templateDir = path.resolve(__dirname, "../../templates");
      if (!fs.existsSync(templateDir)) {
        templateDir = path.resolve(__dirname, "../../../templates");
      }
      if (!fs.existsSync(templateDir)) {
        templateDir = path.resolve(process.cwd(), "packages/cli/templates");
      }
      if (!fs.existsSync(templateDir)) {
        templateDir = path.resolve(__dirname, "../templates");
      }

      if (!fs.existsSync(templateDir)) {
        throw new Error(`Templates not found at ${templateDir}.`);
      }

      const composeFile = path.join(templateDir, "docker-compose.yml");
      const homeDir = os.homedir();
      const configDir = path.join(homeDir, ".cybermem");
      const envFile = path.join(configDir, ".env");
      const dataDir = path.join(configDir, "data");

      // Pull images
      await execa(
        "docker-compose",
        [
          "-f",
          composeFile,
          "--env-file",
          envFile,
          "--project-name",
          "cybermem",
          "pull",
        ],
        {
          stdio: "inherit",
          env: {
            ...process.env,
            DATA_DIR: dataDir,
            CYBERMEM_ENV_PATH: envFile,
            OM_API_KEY: "", // Local bypass
          },
        },
      );

      // Up (recreate)
      console.log(chalk.blue("Restarting services..."));
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
            OM_API_KEY: "", // Local bypass
          },
        },
      );

      console.log(chalk.green("✅ Upgrade complete!"));
    } else if (target === "rpi" || target === "vps") {
      // Remote upgrade
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

      console.log(chalk.blue(`Upgrading remote host ${sshHost}...`));

      // 1. Upload NEW docker-compose.yml (from this CLI version)
      // Resolve Template Directory
      let templateDir = path.resolve(__dirname, "../../templates");
      if (!fs.existsSync(templateDir)) {
        templateDir = path.resolve(__dirname, "../../../templates");
      }
      if (!fs.existsSync(templateDir)) {
        templateDir = path.resolve(process.cwd(), "packages/cli/templates");
      }
      if (!fs.existsSync(templateDir)) {
        templateDir = path.resolve(__dirname, "../templates");
      }
      const composeFile = path.join(templateDir, "docker-compose.yml");

      console.log(chalk.blue("Uploading newest definitions..."));
      await execa("scp", [
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

      await execa("ssh", [sshHost, remoteCmd], { stdio: "inherit" });
      console.log(chalk.green("✅ Remote upgrade complete!"));
    }
  } catch (error) {
    console.error(chalk.red("Upgrade failed:"), error);
    process.exit(1);
  }
}
