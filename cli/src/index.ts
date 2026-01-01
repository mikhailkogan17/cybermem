#!/usr/bin/env node
import { Command } from 'commander';
import { deployCommand } from './commands/deploy';
import { initCommand } from './commands/init';

const program = new Command();

program
  .name('cybermem')
  .description('CyberMem Deployment & Management CLI')
  .version('0.1.0');

program.addCommand(initCommand);
program.addCommand(deployCommand);

program.parse(process.argv);
