import chalk from "chalk";
import { execSync } from "child_process";
import ora from "ora";

export async function reset(): Promise<void> {
  // ⚠️ PRODUCTION PROTECTION - Never wipe RPi database
  const cyberMemEnv = process.env.CYBERMEM_ENV || "";
  const hostname = process.env.HOSTNAME || "";

  if (cyberMemEnv === "production" || hostname.includes("raspberrypi")) {
    console.error(
      chalk.red("❌ BLOCKED: Cannot reset database in production environment!"),
    );
    console.error(
      chalk.yellow("   CYBERMEM_ENV=" + cyberMemEnv + ", HOSTNAME=" + hostname),
    );
    console.error(
      chalk.gray(
        "   Use npx @cybermem/cli backup first, then manually clear if needed.",
      ),
    );
    process.exit(1);
  }

  const spinner = ora("Resetting CyberMem database...").start();

  try {
    const containerName = "cybermem-mcp";

    // Check if container exists
    try {
      execSync(`docker inspect ${containerName}`, { stdio: "pipe" });
    } catch {
      spinner.fail("Container not found. Is CyberMem running?");
      process.exit(1);
    }

    // Remove SQLite files
    spinner.text = "Removing database files...";
    execSync(
      `docker exec ${containerName} sh -c 'rm -f /data/openmemory.sqlite*'`,
      {
        stdio: "pipe",
      },
    );

    // Restart container
    spinner.text = "Restarting container...";
    execSync(`docker restart ${containerName}`, { stdio: "pipe" });

    // Wait for health
    spinner.text = "Waiting for health check...";
    let healthy = false;
    for (let i = 0; i < 30; i++) {
      await new Promise((r) => setTimeout(r, 2000));
      try {
        execSync("curl -s http://localhost:8626/health | grep -q ok", {
          stdio: "pipe",
        });
        healthy = true;
        break;
      } catch {
        // Still starting up
      }
    }

    if (!healthy) {
      spinner.fail("Container failed to become healthy");
      process.exit(1);
    }

    // Restart exporters
    spinner.text = "Restarting exporters...";
    try {
      execSync("docker restart cybermem-log-exporter cybermem-db-exporter", {
        stdio: "pipe",
      });
    } catch {
      // Exporters may not exist
    }

    spinner.succeed(chalk.green("Database reset successfully!"));
    console.log(chalk.gray("  All memories have been deleted."));
  } catch (error: any) {
    spinner.fail(`Reset failed: ${error.message}`);
    process.exit(1);
  }
}
