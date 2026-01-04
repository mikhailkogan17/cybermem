import chalk from 'chalk';
import { Command } from 'commander';
import crypto from 'crypto';
import execa from 'execa';
import fs from 'fs';
import inquirer from 'inquirer';
import os from 'os';
import path from 'path';

export const deployCommand = new Command('deploy')
  .description('Deploy CyberMem services')
  .option('-t, --target <target>', 'Deployment target (local, rpi, vps)', 'local')
  .option('-h, --host <host>', 'SSH Host (user@ip) for remote deployment')
  .option('--tailscale', 'Enable Tailscale Funnel for public HTTPS access (RPi/VPS)')
  .option('--caddy', 'Use Caddy for automatic HTTPS (VPS only)')
  .action(async (options) => {
    const target = options.target;
    const useTailscale = options.tailscale;
    const useCaddy = options.caddy;
    console.log(chalk.blue(`Deploying to ${target}...`));

    try {
        // Resolve Template Directory (Support both Dev and Prod)
        let templateDir = path.resolve(__dirname, '../templates'); // Prod: dist/templates
        if (!fs.existsSync(templateDir)) {
             templateDir = path.resolve(__dirname, '../../templates'); // Dev: src/../../templates
        }

        if (target === 'local') {
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
                if(envContent.includes('key-change-me') || envContent.includes('CYBERMEM_API_KEY=')) {
                    envContent = envContent.replace(/CYBERMEM_API_KEY=.*/, `CYBERMEM_API_KEY=${newKey}`);
                } else if(envContent.includes('OM_API_KEY=')) {
                    envContent = envContent.replace(/OM_API_KEY=.*/, `CYBERMEM_API_KEY=${newKey}`);
                } else {
                    envContent += `\nCYBERMEM_API_KEY=${newKey}\n`;
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
            const match = envContent.match(/CYBERMEM_API_KEY=(sk-[a-f0-9]+)/);
            if (match) {
                    console.log(chalk.yellow(`\n🔑 Master API Key: ${match[1]}`));
            }
        }
        else if (target === 'rpi') {
            const composeFile = path.join(templateDir, 'docker-compose.yml');
            const internalEnvExample = path.join(templateDir, 'envs/rpi.example');

            let sshHost = options.host;
            if (!sshHost) {
                const answers = await inquirer.prompt([
                    {
                        type: 'input',
                        name: 'host',
                        message: 'Enter SSH Host (e.g. pi@raspberrypi.local):',
                        validate: (input) => input.includes('@') ? true : 'Format must be user@host'
                    }
                ]);
                sshHost = answers.host;
            }

            console.log(chalk.blue(`Remote deploying to ${sshHost}...`));

            // 1. Create remote directory
            await execa('ssh', [sshHost, 'mkdir -p ~/.cybermem/data']);

            // 2. Initial Env Setup (if missing)
            // We read remote file check using ssh
            try {
                await execa('ssh', [sshHost, '[ -f ~/.cybermem/.env ]']);
                console.log(chalk.gray('Remote .env exists, skipping generation.'));
            } catch (e) {
                console.log(chalk.yellow('Generating remote .env...'));
                let envContent = fs.readFileSync(internalEnvExample, 'utf-8');
                const newKey = `sk-${crypto.randomBytes(16).toString('hex')}`;

                if(envContent.includes('CYBERMEM_API_KEY=')) {
                    envContent = envContent.replace(/CYBERMEM_API_KEY=.*/, `CYBERMEM_API_KEY=${newKey}`);
                }

                // Write to temp file then scp
                const tempEnv = path.join(os.tmpdir(), 'cybermem-rpi.env');
                fs.writeFileSync(tempEnv, envContent);
                await execa('scp', [tempEnv, `${sshHost}:~/.cybermem/.env`]);
                fs.unlinkSync(tempEnv);
            }

            // 3. Copy Docker Compose
            console.log(chalk.blue('Uploading templates...'));
            await execa('scp', [composeFile, `${sshHost}:~/.cybermem/docker-compose.yml`]);

            // 4. Run Docker Compose Remotely
            console.log(chalk.blue('Starting services on RPi...'));
            // We pass CYBERMEM_ENV_PATH explicitly as ~/.cybermem/.env and DATA_DIR as ~/.cybermem/data
            // The template uses ${CYBERMEM_ENV_PATH} and maps volumes.
            // We need to set these vars in the shell when running docker-compose
            const remoteCmd = `
                export CYBERMEM_ENV_PATH=~/.cybermem/.env
                export DATA_DIR=~/.cybermem/data
                docker-compose -f ~/.cybermem/docker-compose.yml up -d --remove-orphans
            `;

            await execa('ssh', [sshHost, remoteCmd], { stdio: 'inherit' });

            console.log(chalk.green('\n✅ RPi deployment successful!'));
            // Parse host from ssh string for convenience
            const hostIp = sshHost.split('@')[1];
            console.log(chalk.bold('Access Points (LAN):'));
            console.log(`  - Dashboard:   ${chalk.underline(`http://${hostIp}:3000`)} (admin/admin)`);
            console.log(`  - OpenMemory:  ${chalk.underline(`http://${hostIp}:8080`)}`);

            // Tailscale Funnel setup
            if (useTailscale) {
                console.log(chalk.blue('\n🔗 Setting up Tailscale Funnel for public HTTPS access...'));
                try {
                    // Check if Tailscale is installed
                    await execa('ssh', [sshHost, 'which tailscale']);

                    // Setup Funnel for dashboard and MCP
                    await execa('ssh', [sshHost, 'sudo tailscale funnel --bg 3000'], { stdio: 'inherit' });
                    await execa('ssh', [sshHost, 'sudo tailscale funnel --bg --set-path=/mcp 8080'], { stdio: 'inherit' });

                    // Get DNS name
                    const { stdout } = await execa('ssh', [sshHost, 'tailscale status --json | grep -o \'"DNSName":"[^"]*"\' | head -1 | cut -d: -f2 | tr -d \'"\\.\'']);
                    const dnsName = stdout.trim() + '.ts.net';

                    console.log(chalk.green('\n🌐 Public HTTPS Access (via Tailscale Funnel):'));
                    console.log(`  - Dashboard: ${chalk.underline(`https://${dnsName}/`)}`);
                    console.log(`  - MCP API:   ${chalk.underline(`https://${dnsName}/mcp`)}`);
                    console.log(chalk.gray('  (Accessible from anywhere without VPN)'));
                } catch (e) {
                    console.log(chalk.yellow('\n⚠️  Tailscale not installed or not configured.'));
                    console.log(chalk.gray('  Install: curl -fsSL https://tailscale.com/install.sh | sh'));
                    console.log(chalk.gray('  Then run: tailscale up && tailscale funnel --bg 3000'));
                }
            } else {
                console.log(chalk.gray('\n💡 For public HTTPS access, re-run with: cybermem deploy --target rpi --tailscale'));
            }
        }
        else if (target === 'vps') {
            console.log(chalk.yellow('VPS deployment is similar to RPi.'));
            console.log(chalk.blue('\n📋 VPS Deployment Steps:'));
            console.log('1. Run: cybermem deploy --target rpi --host user@your-vps-ip');
            console.log('2. For HTTPS, choose one of:');
            console.log(chalk.gray('   a) Tailscale Funnel: --tailscale flag'));
            console.log(chalk.gray('   b) Caddy (recommended for public VPS):'));
            console.log(chalk.gray('      - Install Caddy: sudo apt install caddy'));
            console.log(chalk.gray('      - Configure /etc/caddy/Caddyfile:'));
            console.log(chalk.cyan(`
        cybermem.yourdomain.com {
            reverse_proxy localhost:3000
        }
        api.cybermem.yourdomain.com {
            reverse_proxy localhost:8080
        }
      `));
            console.log(chalk.gray('      - Restart: sudo systemctl restart caddy'));
            console.log(chalk.green('\n📚 Full docs: https://cybermem.dev/docs#https'));
        }
        else {
            console.error(chalk.red(`Unknown target: ${target}. Use: local, rpi, or vps`));
        }

    } catch (error) {
        console.error(chalk.red('Deployment failed:'), error);
        process.exit(1);
    }
  });
