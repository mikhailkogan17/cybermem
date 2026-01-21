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

  const [dashboardUp, dbExporterUp] = await Promise.all([
    checkPort(3000),
    checkPort(8000),
  ]);

  if (!dashboardUp) {
    console.error(chalk.red("❌ Dashboard is NOT running on port 3000."));
    console.log(
      chalk.yellow("Run 'npx @cybermem/cli init' to start the stack."),
    );
  } else {
    console.log(chalk.green("✅ Dashboard is running on port 3000."));
  }

  if (!dbExporterUp) {
    console.warn(chalk.yellow("⚠️  db-exporter is NOT running on port 8000."));
    console.warn(
      chalk.gray(
        "   API may not be available. Run 'docker-compose up -d' to start services.",
      ),
    );
  } else {
    console.log(chalk.green("✅ db-exporter is running on port 8000."));
  }

  if (dashboardUp) {
    console.log(chalk.blue("\nOpening dashboard..."));
    await open("http://localhost:3000");
  } else {
    console.log(
      chalk.gray("\nTip: Access remote dashboard at http://<your-server>:3000"),
    );
    console.log(
      chalk.gray("     Copy your access token from Settings to connect."),
    );
  }
}
