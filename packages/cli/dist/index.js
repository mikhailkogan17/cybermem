#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const deploy_1 = require("./commands/deploy");
const init_1 = require("./commands/init");
const program = new commander_1.Command();
program
    .name('cybermem')
    .description('CyberMem Deployment & Management CLI')
    .version('0.1.0');
program.addCommand(init_1.initCommand);
program.addCommand(deploy_1.deployCommand);
program.parse(process.argv);
