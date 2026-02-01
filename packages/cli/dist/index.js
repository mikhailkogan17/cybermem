#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const backup_1 = require("./commands/backup");
const dashboard_1 = require("./commands/dashboard");
const install_1 = require("./commands/install");
const reset_1 = require("./commands/reset");
const restore_1 = require("./commands/restore");
const uninstall_1 = require("./commands/uninstall");
const upgrade_1 = require("./commands/upgrade");
const program = new commander_1.Command();
program
    .name("mcp")
    .description("CyberMem - Deploy your AI memory server in one command")
    .version("1.0.0");
// Command: Install
program
    .command("install")
    .description("Install CyberMem (Scaffold & Start)")
    .option("--rpi", "Deploy to Raspberry Pi")
    .option("--vps", "Deploy to VPS/Cloud server")
    .option("--staging", "Deploy to staging environment (different ports/data)")
    .option("--remote-access", "Enable Tailscale Funnel for HTTPS remote access")
    .action(install_1.install);
// Command: Uninstall
program
    .command("uninstall")
    .description("Uninstall CyberMem (Teardown services)")
    .option("--rpi", "Uninstall from Raspberry Pi")
    .option("--vps", "Uninstall from VPS/Cloud server")
    .option("--host <host>", "SSH host for remote uninstall")
    .action(uninstall_1.uninstall);
// Command: Upgrade
program
    .command("upgrade")
    .description("Upgrade CyberMem instance (pull latest images)")
    .option("--local", "Upgrade local instance (default)")
    .option("--rpi", "Upgrade remote RPi")
    .option("--vps", "Upgrade remote VPS")
    .option("--staging", "Upgrade staging environment")
    .option("--host <host>", "SSH host for remote upgrade (e.g. pi@raspberrypi.local)")
    .action(upgrade_1.upgrade);
program
    .command("backup")
    .description("Backup CyberMem data to a tarball")
    .action(backup_1.backup);
program
    .command("restore")
    .description("Restore CyberMem data from a backup file")
    .argument("<file>", "Backup file to restore")
    .action(restore_1.restore);
program
    .command("reset")
    .description("Reset (wipe) the CyberMem database - DESTRUCTIVE!")
    .option("-f, --force", "Skip confirmation prompt")
    .action(reset_1.reset);
program
    .command("dashboard")
    .description("Open the CyberMem dashboard and check stack status")
    .action(dashboard_1.dashboard);
program.parse(process.argv);
