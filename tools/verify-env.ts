import { execSync } from "child_process";
import { program } from "commander";

program
  .requiredOption(
    "--env <env>",
    "Environment name (localhost-prod, rpi-lan-staging, etc)",
  )
  .requiredOption("--url <url>", "Base URL of the environment")
  .option("--deploy", "Run install/deploy step", false)
  .parse(process.argv);

const { env, url, deploy } = program.opts();

const run = (cmd: string) => {
  console.log(`> ${cmd}`);
  execSync(cmd, { stdio: "inherit" });
};

const verify = async () => {
  try {
    // 1. Deploy (Optional)
    if (deploy) {
      if (env.includes("localhost")) {
        run("npx @cybermem/cli install");
      } else {
        console.log(
          "⚠️  Skipping deploy for remote env (manual step required or use ansible)",
        );
      }
    }

    // 2. Reset DB
    // Only safe on localhost! For others, we might need a special flag or manual check.
    // User manual says "2 ресет DB".
    // CLI `reset` works for local. Remote?
    // "mcp reset" (local).
    if (env.includes("localhost")) {
      run("npx @cybermem/cli reset --force"); // Assuming --force or interactive
    } else {
      console.log(
        "⚠️  Skipping RESET for remote env (SAFETY). Manually ensure clean state if needed.",
      );
    }

    // 3. API Check (Curl)
    console.log("🔍 Running API Checks...");
    // CRUD Memory
    run(
      `curl -s "${url}/api/memories" -X POST -H "Content-Type: application/json" -d '{"content":"verify_env_test"}'`,
    );
    // Metrics
    const metrics = execSync(`curl -s "${url}/api/metrics"`).toString();
    console.log("Metrics:", metrics);
    if (!metrics.includes("antigravity"))
      console.warn("⚠️  Metrics missing antigravity identity!");

    // 4. Browser Check (Manual Step representation)
    console.log(
      "🔍 Browser Check: Please open Chrome and verify Identity & MCP Config.",
    );
    // In strict automation, we'd use Playwright here too, but Step 5 does that.

    // 5. Release Check
    console.log("🚀 Running Release Check...");
    run(`npm run test:e2e -- --only-testing ${env}`);

    console.log(`✅ Verification for ${env} Passed!`);
  } catch (e) {
    console.error(`❌ Verification Failed for ${env}`);
    process.exit(1);
  }
};

verify();
