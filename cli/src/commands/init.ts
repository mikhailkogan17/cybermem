import chalk from 'chalk';
import { Command } from 'commander';
import fs from 'fs';
import inquirer from 'inquirer';
import path from 'path';

export const initCommand = new Command('init')
  .description('Initialize CyberMem configuration')
  .action(async () => {
    console.log(chalk.bold.blue('🤖 CyberMem Setup Wizard'));

    const { target } = await inquirer.prompt([
      {
        type: 'list',
        name: 'target',
        message: 'Where do you want to deploy?',
        choices: [
          { name: 'Local (Docker Compose)', value: 'local' },
          { name: 'Raspberry Pi (Ansible)', value: 'rpi' },
          { name: 'VPS (Kubernetes/Helm)', value: 'vps' }
        ]
      }
    ]);

    console.log(chalk.green(`Selected target: ${target}`));

    if (target === 'local') {
        const { confirm } = await inquirer.prompt([
            {
                type: 'confirm',
                name: 'confirm',
                message: 'This will create docker-compose.yml and .env in current directory. Continue?',
                default: true
            }
        ]);
        if(confirm) {
            const templateDir = path.resolve(__dirname, '../../templates');
            const envSrc = path.join(templateDir, 'envs/local.example');

            if (!fs.existsSync(envSrc)) {
                 console.error(chalk.red(`Template not found at ${envSrc}.`));
                 return;
            }

            // Generate .env
            let envContent = fs.readFileSync(envSrc, 'utf-8');
            const crypto = require('crypto');
            const newKey = `sk-${crypto.randomBytes(16).toString('hex')}`;

            // Replace placeholder or key
            if(envContent.includes('key-change-me') || envContent.includes('OM_API_KEY=')) {
                 envContent = envContent.replace(/OM_API_KEY=.*/, `OM_API_KEY=${newKey}`);
            } else {
                 envContent += `\nOM_API_KEY=${newKey}\n`;
            }

            fs.writeFileSync('.env', envContent);
            console.log(chalk.gray('Created .env with generated API Key'));
            console.log(chalk.gray('(Docker Compose configuration is managed internally by the CLI)'));

            console.log(chalk.green('\nInitialization complete! Run "cybermem deploy" to start.'));
        }
    } else {
         console.log(chalk.yellow('Target init not fully implemented in CLI yet.'));
    }
  });
