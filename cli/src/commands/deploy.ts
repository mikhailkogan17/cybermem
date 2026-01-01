import chalk from 'chalk';
import { Command } from 'commander';
import crypto from 'crypto';
import execa from 'execa';
import fs from 'fs';
import os from 'os';
import path from 'path';

export const deployCommand = new Command('deploy')
  .description('Deploy CyberMem services')
  .option('-t, --target <target>', 'Deployment target (local, rpi, vps)', 'local')
  .action(async (options) => {
    const target = options.target;
    console.log(chalk.blue(`Deploying to ${target}...`));

    try {
        if (target === 'local') {
            const templateDir = path.resolve(__dirname, '../../templates');
            const composeFile = path.join(templateDir, 'docker-compose.yml');
            const internalEnvExample = path.join(templateDir, 'envs/local.example');

            if (!fs.existsSync(composeFile)) {
                 console.error(chalk.red(`Internal Error: Template not found at ${composeFile}`));
                 process.exit(1);
            }

            // Home Directory Config
            const homeDir = os.homedir();
            const configDir = path.join(homeDir, '.cybermem');
            const envFile = path.join(configDir, '.env');
            const dataDir = path.join(configDir, 'data');

            // 1. Ensure ~/.cybermem exists
            if (!fs.existsSync(configDir)) {
                fs.mkdirSync(configDir, { recursive: true });
                fs.mkdirSync(dataDir, { recursive: true });
            }

            // 2. Generate .env if missing
            if (!fs.existsSync(envFile)) {
                console.log(chalk.yellow(`Initializing configuration in ${configDir}...`));
                let envContent = fs.readFileSync(internalEnvExample, 'utf-8');

                const newKey = `sk-${crypto.randomBytes(16).toString('hex')}`;

                // Replace placeholder or key
                if(envContent.includes('key-change-me') || envContent.includes('OM_API_KEY=')) {
                    envContent = envContent.replace(/OM_API_KEY=.*/, `OM_API_KEY=${newKey}`);
                } else {
                    envContent += `\nOM_API_KEY=${newKey}\n`;
                }

                fs.writeFileSync(envFile, envContent);
                console.log(chalk.green(`Generated secure .env at ${envFile}`));
            }

            console.log(chalk.blue('Starting CyberMem services...'));

            // Execute docker-compose with internal file and USER HOME env
            await execa('docker-compose', [
                '-f', composeFile,
                '--env-file', envFile,
                '--project-name', 'cybermem',
                'up', '-d', '--remove-orphans'
            ], {
                stdio: 'inherit',
                env: {
                    ...process.env,
                    // Pass DATA_DIR to compose so it mounts ~/.cybermem/data instead of ./data
                    DATA_DIR: dataDir,
                    CYBERMEM_ENV_PATH: envFile
                }
            });

            console.log(chalk.green('\n✅ Local deployment successful!'));
            console.log(chalk.bold('Access Points:'));
            console.log(`  - Dashboard:   ${chalk.underline('http://localhost:3000')} (admin/admin)`);
            console.log(`  - OpenMemory:  ${chalk.underline('http://localhost:8080')}`);
            console.log(`  - Traefik:     ${chalk.underline('http://localhost:8081')}`);

             // Check for key
            const envContent = fs.readFileSync(envFile, 'utf-8');
            const match = envContent.match(/OM_API_KEY=(sk-[a-f0-9]+)/);
            if (match) {
                    console.log(chalk.yellow(`\n🔑 Master API Key: ${match[1]}`));
            }
        }
        // ... rpi, vps logic placeholders
    } catch (error) {
        console.error(chalk.red('Deployment failed:'), error);
        process.exit(1);
    }
  });
