import { Command } from 'commander';
import { backup } from './commands/backup';
import { deploy } from './commands/deploy';
import { restore } from './commands/restore';

const program = new Command();

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
  .option('-h, --host <host>', 'SSH Host (user@ip) for remote deployment')
  .option('--remote-access', 'Enable Tailscale Funnel for HTTPS remote access')
  .action(deploy);

program
  .command('backup')
  .description('Backup CyberMem data to a tarball')
  .action(backup);

program
  .command('restore')
  .description('Restore CyberMem data from a backup file')
  .argument('<file>', 'Backup file to restore')
  .action(restore);

program.parse(process.argv);
