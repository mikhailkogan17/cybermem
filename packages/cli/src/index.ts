#!/usr/bin/env node
import { Command } from "commander";
import { backup } from "./commands/backup";
import { dashboard } from "./commands/dashboard";
import { init } from "./commands/init";
import { reset } from "./commands/reset";
import { restore } from "./commands/restore";
import { upgrade } from "./commands/upgrade";

const program = new Command();

program
  .name("mcp")
  .description("CyberMem - Deploy your AI memory server in one command")
  .version("1.0.0");

// Command: Init (formerly deploy)
program
  .command("init")
  .description("Initialize CyberMem (Scaffold & Start)")
  .option("--rpi", "Deploy to Raspberry Pi")
  .option("--vps", "Deploy to VPS/Cloud server")
  .option("--remote-access", "Enable Tailscale Funnel for HTTPS remote access")
  .action(init);

// Command: Upgrade
program
  .command("upgrade")
  .description("Upgrade CyberMem instance (pull latest images)")
  .option("--local", "Upgrade local instance (default)")
  .option("--rpi", "Upgrade remote RPi")
  .option("--vps", "Upgrade remote VPS")
  .option(
    "--host <host>",
    "SSH host for remote upgrade (e.g. pi@raspberrypi.local)",
  )
  .action(upgrade);

program
  .command("backup")
  .description("Backup CyberMem data to a tarball")
  .action(backup);

program
  .command("restore")
  .description("Restore CyberMem data from a backup file")
  .argument("<file>", "Backup file to restore")
  .action(restore);

program
  .command("reset")
  .description("Reset (wipe) the CyberMem database - DESTRUCTIVE!")
  .action(reset);

program
  .command("dashboard")
  .description("Open the CyberMem dashboard and check stack status")
  .action(dashboard);

program.parse(process.argv);
