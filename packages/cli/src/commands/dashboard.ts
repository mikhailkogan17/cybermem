import chalk from "chalk";
import fs from "fs";
import net from "net";
import open from "open";
import os from "os";
import path from "path";

const TOKEN_FILE = path.join(os.homedir(), ".cybermem", "token.json");

const checkPort = (port: number): Promise<boolean> => {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    const onError = () => {
      socket.destroy();
      resolve(false);
    };
    socket.setTimeout(500);
    socket.once("error", onError);
    socket.once("timeout", onError);
    socket.connect(port, "localhost", () => {
      socket.end();
      resolve(true);
    });
  });
};

/**
 * Get stored token from ~/.cybermem/token.json
 */
function getStoredToken(): string | null {
  try {
    if (!fs.existsSync(TOKEN_FILE)) return null;
    const data = JSON.parse(fs.readFileSync(TOKEN_FILE, "utf-8"));
    if (new Date(data.expires_at) < new Date()) {
      console.warn(chalk.yellow("Token expired. Run: cybermem-cli login"));
      return null;
    }
    return data.access_token;
  } catch {
    return null;
  }
}

export async function dashboard(options: any) {
  console.log(chalk.blue("Checking CyberMem stack status..."));

  const [dashboardUp, prometheusUp] = await Promise.all([
    checkPort(3000),
    checkPort(9092),
  ]);

  if (!dashboardUp) {
    console.error(chalk.red("❌ Dashboard is NOT running on port 3000."));
    console.log(
      chalk.yellow(
        "Run 'cybermem up' or 'cd packages/dashboard && npm run dev' to start it.",
      ),
    );
  } else {
    console.log(chalk.green("✅ Dashboard is running on port 3000."));
  }

  if (!prometheusUp) {
    console.warn(chalk.yellow("⚠️  Prometheus is NOT running on port 9092."));
    console.warn(
      chalk.gray(
        "   Charts will be empty. Run 'cybermem up' or 'docker-compose up' to enable metrics.",
      ),
    );
  } else {
    console.log(chalk.green("✅ Prometheus is running on port 9092."));
  }

  if (dashboardUp) {
    console.log(chalk.blue("\nOpening dashboard..."));
    await open("http://localhost:3000");
  } else {
    // Try remote dashboard if local isn't up
    const token = getStoredToken();
    if (token) {
      // Check for remote URL from environment or config
      const remoteUrl = process.env.CYBERMEM_DASHBOARD_URL;
      if (remoteUrl) {
        console.log(chalk.blue("\nOpening remote dashboard..."));
        await open(`${remoteUrl}/api/auth/token?token=${token}`);
      } else {
        console.log(
          chalk.gray(
            "\nTip: Set CYBERMEM_DASHBOARD_URL to open remote dashboard.",
          ),
        );
      }
    } else {
      console.log(
        chalk.gray("\nTip: Run 'cybermem-cli login' to enable remote access."),
      );
    }
  }
}
