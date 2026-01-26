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
  } else if (stderr.includes("docker-compose: command not found")) {
    suggestion =
      "\n💡 Next Step: Install Docker and ensure docker-compose is in your PATH.";
  }

  console.error(chalk.red(`\n❌ ${context} failed:`), error.message);
  if (suggestion) console.log(chalk.yellow(suggestion));
  // process.exit(1); // Don't always exit on uninstall failure so we can try data wipe?
}

export async function uninstall(options: any) {
  let target = "local";
  if (options.rpi) target = "rpi";
  if (options.vps) target = "vps";

  console.log(chalk.blue(`Uninstalling CyberMem (${target})...`));

  try {
    if (target === "local") {
      const answers = await inquirer.prompt([
        {
          type: "confirm",
          name: "confirm",
          message: chalk.red(
            "Are you sure you want to uninstall CyberMem? This will stop all services.",
          ),
          default: false,
        },
        {
          type: "confirm",
          name: "wipeData",
          message: chalk.yellow(
            "Do you also want to wipe all data (~/.cybermem)?",
          ),
          default: false,
          when: (a) => a.confirm,
        },
      ]);

      if (!answers.confirm) {
        console.log(chalk.gray("Aborted."));
        return;
      }

      // Resolve Template Directory
      let templateDir = path.resolve(__dirname, "../../templates");
      if (!fs.existsSync(templateDir)) {
        templateDir = path.resolve(__dirname, "../../../templates");
      }
      if (!fs.existsSync(templateDir)) {
        templateDir = path.resolve(process.cwd(), "packages/cli/templates");
      }
      const composeFile = path.join(templateDir, "docker-compose.yml");

      const homeDir = os.homedir();
      const configDir = path.join(homeDir, ".cybermem");
      const envFile = path.join(configDir, ".env");

      console.log(chalk.blue("Stopping services..."));
      try {
        await execa(
          "docker-compose",
          [
            "-f",
            composeFile,
            "--env-file",
            envFile,
            "--project-name",
            "cybermem",
            "down",
          ],
          {
            stdio: "inherit",
            env: {
              ...process.env,
              DATA_DIR: path.join(configDir, "data"),
              CYBERMEM_ENV_PATH: envFile,
              OM_API_KEY: "",
            },
          },
        );
      } catch (e) {
        handleExecError(e, "Local uninstall");
      }

      if (answers.wipeData) {
        console.log(chalk.yellow(`Wiping configuration at ${configDir}...`));
        fs.rmSync(configDir, { recursive: true, force: true });
      }

      console.log(chalk.green("✅ CyberMem uninstalled successfully."));
    } else if (target === "rpi" || target === "vps") {
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
        chalk.blue(`Uninstalling remote host ${sshHost} via Ansible...`),
      );

      // Resolve Ansible Paths
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
        await execa("ssh", [sshHost, remoteCmd], { stdio: "inherit" });
      } catch (e) {
        handleExecError(e, "Remote uninstall");
      }
      console.log(chalk.green("✅ Remote uninstallation complete!"));
    }
  } catch (error) {
    console.error(chalk.red("Uninstall failed:"), error);
    process.exit(1);
  }
}
