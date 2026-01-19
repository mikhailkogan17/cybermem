import chalk from "chalk";
import net from "net";
import open from "open";

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
    // process.exit(1); // Optional: stay open to allow attempts? Nah, let's exit.
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
  }
}
