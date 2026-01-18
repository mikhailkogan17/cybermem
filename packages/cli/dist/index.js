#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const backup_1 = require("./commands/backup");
const init_1 = require("./commands/init");
const reset_1 = require("./commands/reset");
const restore_1 = require("./commands/restore");
const upgrade_1 = require("./commands/upgrade");
const program = new commander_1.Command();
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
    .action(init_1.init);
// Command: Upgrade
program
    .command("upgrade")
    .description("Upgrade CyberMem (Update Images & Config)")
    .option("--rpi", "Target Raspberry Pi")
    .option("--vps", "Target VPS")
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
    .action(reset_1.reset);
program.parse(process.argv);
