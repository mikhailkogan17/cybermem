import chalk from "chalk";
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
  }

  console.error(chalk.red(`\n❌ ${context} failed:`), error.message);
  if (suggestion) console.log(chalk.yellow(suggestion));
  process.exit(1);
}

export async function upgrade(options: any) {
  let target = "local";
  if (options.rpi) target = "rpi";
  if (options.vps) target = "vps";

  const isStaging = !!options.staging;
  const envType = isStaging ? "staging" : "prod";
  const projectSuffix = isStaging ? "-staging" : "";

  console.log(chalk.blue(`Upgrading CyberMem (${target}-${envType})...`));

  try {
    if (target === "local") {
      console.log(chalk.blue("Pulling latest Docker images..."));

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

      if (!fs.existsSync(templateDir)) {
        throw new Error(`Templates not found at ${templateDir}.`);
      }

      const composeFile = path.join(templateDir, "docker-compose.yml");
      const homeDir = os.homedir();
      const configDir = path.join(homeDir, ".cybermem");
      const envFile = path.join(configDir, ".env");
      const dataDir = path.join(configDir, isStaging ? "data-staging" : "data");

      // Pull images
      try {
        await execa(
          "docker-compose",
          [
            "-f",
            composeFile,
            "--env-file",
            envFile,
            "--project-name",
            `cybermem${projectSuffix}`,
            "pull",
          ],
          {
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
          },
        );
      } catch (e) {
        handleExecError(e, "Local image pull");
      }

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
          `cybermem${projectSuffix}`,
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
            PROJECT_NAME: `cybermem${projectSuffix}`,
            TRAEFIK_PORT: isStaging ? "8625" : "8626",
            DASHBOARD_PORT: isStaging ? "3001" : "3000",
            CYBERMEM_ENV: envType,
            CYBERMEM_INSTANCE: target,
          },
        },
      );

      console.log(chalk.green("✅ Upgrade complete!"));
    } else if (target === "rpi" || target === "vps") {
      // Remote upgrade via Ansible
      let sshHost = options.host;
      if (!sshHost) {
        const answers = await inquirer.prompt([
          {
            type: "input",
            name: "host",
            message: "Enter SSH Host (e.g. pi@raspberrypi.local):",
            validate: (input: string) =>
              input.includes("@") ? true : "Format must be user@host",
          },
        ]);
        sshHost = answers.host;
      }

      console.log(
        chalk.blue(`Upgrading remote host ${sshHost} via Ansible...`),
      );

      // 1. Resolve Template Directory
      let templateDir = path.resolve(__dirname, "../../templates");
      if (!fs.existsSync(templateDir)) {
        templateDir = path.resolve(__dirname, "../../../templates");
      }
      if (!fs.existsSync(templateDir)) {
        templateDir = path.resolve(process.cwd(), "packages/cli/templates");
      }

      const playbookPath = path.join(
        templateDir,
        "ansible/playbooks/deploy-cybermem.yml",
      );
      const ansibleDir = path.join(templateDir, "ansible");

      const [sshUser, host] = sshHost.split("@");

      // 2. Run Ansible Playbook
      // For upgrade, the playbook's default state (started) will pull latest images
      // if we ensure it performs a pull. Our playbook already pulls images.
      try {
        await execa(
          "ansible-playbook",
          [
            "-i",
            `${host},`,
            "-u",
            sshUser,
            playbookPath,
            "--extra-vars",
            `ansible_ssh_extra_args='-o StrictHostKeyChecking=no' CYBERMEM_ENV=${envType} TRAEFIK_PORT=${isStaging ? "8625" : "8626"} PROJECT_NAME=cybermem${projectSuffix} project_dir=/home/${sshUser}/cybermem${projectSuffix}`,
          ],
          {
            stdio: "inherit",
            cwd: ansibleDir,
          },
        );
      } catch (e) {
        handleExecError(e, "Remote upgrade");
      }

      console.log(chalk.green("✅ Remote upgrade complete via Ansible!"));
    }
  } catch (error) {
    console.error(chalk.red("Upgrade failed:"), error);
    process.exit(1);
  }
}
