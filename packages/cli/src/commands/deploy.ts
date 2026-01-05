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
  .option('--remote-access', 'Enable remote access via Tailscale Funnel (HTTPS)', false)
  .option('--tailscale', 'Alias for --remote-access (deprecated)', false)
  .option('--caddy', 'Use Caddy for automatic HTTPS (VPS only)')
  .action(async (options) => {
    const target = options.target;
    const useTailscale = options.remoteAccess || options.tailscale;
    const useCaddy = options.caddy;
    console.log(chalk.blue(`Deploying to ${target}...`));

    try {
        // Resolve Template Directory (Support both Dev and Prod)
        // Resolve Template Directory (Support both Dev and Prod)
        // In Prod: __dirname is dist/commands, so templates is ../templates (dist/templates)
        // In Dev (ts-node): __dirname is src/commands, so templates is ../../templates (root/packages/cli/templates)

        // Try production path first (dist/templates)
        let templateDir = path.resolve(__dirname, '../templates');

        // If not found, try development path (src/../../templates)
        if (!fs.existsSync(templateDir)) {
             templateDir = path.resolve(__dirname, '../../templates');
        }

        // Final sanity check
        if (!fs.existsSync(templateDir)) {
             // Fallback for when running from root with ts-node directly (unlikely but possible)
             templateDir = path.resolve(process.cwd(), 'packages/cli/templates');
        }

        if (!fs.existsSync(templateDir)) {
            throw new Error(`Templates not found at ${templateDir}. Please ensure package is built correctly.`);
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

            // 2. Local Mode: Simplified setup without mandatory API key
            if (!fs.existsSync(envFile)) {
                console.log(chalk.yellow(`Initializing local configuration in ${configDir}...`));
                const envContent = fs.readFileSync(internalEnvExample, 'utf-8');
                fs.writeFileSync(envFile, envContent);
                console.log(chalk.green(`Created .env at ${envFile}`));
            }

            console.log(chalk.blue('Starting CyberMem services in Local Mode...'));

            // Execute docker-compose with internal file and USER HOME env
            // Note: We pass CYBERMEM_API_KEY="" explicitly for local mode to trigger keyless bypass
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
                    CYBERMEM_ENV_PATH: envFile,
                    CYBERMEM_API_KEY: ''
                }
            });

            console.log(chalk.green('\n🎉 CyberMem Installed!'));
            console.log('');
            console.log(chalk.bold('Next Steps:'));
            console.log(`  1. Open ${chalk.underline('http://localhost:3000/client-connect')} to connect your MCP clients`);
            console.log(`  2. Default password: ${chalk.bold('admin')} (you'll be prompted to change it)`);
            console.log('');
            console.log(chalk.dim('Local mode is active: No API key required for connections from this laptop.'));
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
                console.log(chalk.blue('\n🔗 Setting up Remote Access (Tailscale Funnel)...'));

                try {
                    // 1. Check/Install Tailscale
                    try {
                        await execa('ssh', [sshHost, 'which tailscale']);
                    } catch (e) {
                        console.log(chalk.yellow('  Tailscale not found. Installing...'));
                        await execa('ssh', [sshHost, 'curl -fsSL https://tailscale.com/install.sh | sh'], { stdio: 'inherit' });
                    }

                    // 2. Auth (interactive if needed)
                    console.log(chalk.blue('  Ensuring Tailscale is up...'));
                    try {
                        // Check status first to avoid re-auth if already up
                        await execa('ssh', [sshHost, 'tailscale status']);
                    } catch (e) {
                         // Interactive auth
                         console.log(chalk.yellow('  ⚠️  Tailscale authentication required. Please follow the prompts:'));
                         await execa('ssh', [sshHost, 'sudo tailscale up'], { stdio: 'inherit' });
                    }

                    // 3. Configure Funnel (Verified commands)
                    console.log(chalk.blue('  Configuring HTTPS Funnel (requires sudo access)...'));
                    console.log(chalk.gray('  You may be prompted for your RPi password.'));

                    // Routes:
                    // - / -> Dashboard (3000)
                    // - /cybermem/mcp -> MCP API (8626/mcp)
                    await execa('ssh', ['-t', sshHost, 'sudo tailscale serve reset'], { stdio: 'inherit' }).catch(() => {});
                    await execa('ssh', ['-t', sshHost, 'sudo tailscale serve --bg --set-path /cybermem http://127.0.0.1:8626'], { stdio: 'inherit' });
                    await execa('ssh', ['-t', sshHost, 'sudo tailscale serve --bg http://127.0.0.1:3000'], { stdio: 'inherit' });
                    await execa('ssh', ['-t', sshHost, 'sudo tailscale funnel --bg 443'], { stdio: 'inherit' });

                    // Get DNS name
                    const { stdout } = await execa('ssh', [sshHost, "tailscale status --json | jq -r '.Self.DNSName' | sed 's/\\.$//'"], { shell: true });
                    const dnsName = stdout.trim();

                    console.log(chalk.green('\n🌐 Remote Access Active (HTTPS):'));
                    console.log(`  - Dashboard: ${chalk.underline(`https://${dnsName}/`)}`);
                    console.log(`  - MCP API:   ${chalk.underline(`https://${dnsName}/cybermem/mcp`)}`);
                } catch (e) {
                    console.log(chalk.red('\n❌ Remote Access setup failed:'));
                    console.error(e);
                    console.log(chalk.gray('Manual setup: curl -fsSL https://tailscale.com/install.sh | sh && sudo tailscale up'));
                }
            } else {
                console.log(chalk.gray('\n💡 For remote access, re-run with: cybermem deploy --target rpi --remote-access'));
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
