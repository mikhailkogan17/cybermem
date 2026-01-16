#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const backup_1 = require("./commands/backup");
const deploy_1 = require("./commands/deploy");
const reset_1 = require("./commands/reset");
const restore_1 = require("./commands/restore");
const program = new commander_1.Command();
program
    .name('mcp')
    .description('CyberMem - Deploy your AI memory server in one command')
    .version('1.0.0');
// Default Command: Deploy
program
    .command('deploy', { isDefault: true })
    .description('Deploy CyberMem (Default)')
    .option('--rpi', 'Deploy to Raspberry Pi (default: local)')
    .option('--vps', 'Deploy to VPS/Cloud server')
    .option('--remote-access', 'Enable Tailscale Funnel for HTTPS remote access')
    .action(deploy_1.deploy);
program
    .command('backup')
    .description('Backup CyberMem data to a tarball')
    .action(backup_1.backup);
program
    .command('restore')
    .description('Restore CyberMem data from a backup file')
    .argument('<file>', 'Backup file to restore')
    .action(restore_1.restore);
program
    .command('reset')
    .description('Reset (wipe) the CyberMem database - DESTRUCTIVE!')
    .action(reset_1.reset);
program.parse(process.argv);
