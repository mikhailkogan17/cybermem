import chalk from 'chalk';
import crypto from 'crypto';
import execa from 'execa';
import fs from 'fs';
import inquirer from 'inquirer';
import os from 'os';
import path from 'path';

export async function deploy(options: any) {
    // Determine target from flags
    let target = 'local';
    if (options.rpi) target = 'rpi';
    if (options.vps) target = 'vps';

    const useTailscale = options.remoteAccess;
    console.log(chalk.blue(`Deploying CyberMem (${target})...`));

    try {
        // Resolve Template Directory (Support both Dev and Prod)
        let templateDir = path.resolve(__dirname, '../../templates');
        if (!fs.existsSync(templateDir)) {
             templateDir = path.resolve(__dirname, '../../../templates');
        }
        if (!fs.existsSync(templateDir)) {
             templateDir = path.resolve(process.cwd(), 'packages/cli/templates');
        }
        if (!fs.existsSync(templateDir)) {
            // Fallback for different build structures
            templateDir = path.resolve(__dirname, '../templates');
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
                    OM_API_KEY: ''
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

            const answers = await inquirer.prompt([
                {
                    type: 'input',
                    name: 'host',
                    message: 'Enter SSH Host (e.g. pi@raspberrypi.local):',
                    validate: (input) => input.includes('@') ? true : 'Format must be user@host'
                }
            ]);
            const sshHost = answers.host;

            console.log(chalk.blue(`Remote deploying to ${sshHost}...`));

            // 1. Create remote directory
            await execa('ssh', [sshHost, 'mkdir -p ~/.cybermem/data']);

            // 1.5 Check and fix Docker architecture (64-bit kernel with 32-bit Docker)
            console.log(chalk.blue('Checking Docker architecture...'));
            try {
                const { stdout: kernelArch } = await execa('ssh', [sshHost, 'uname -m']);
                const { stdout: dockerArch } = await execa('ssh', [sshHost, 'docker version --format "{{.Server.Arch}}" 2>/dev/null || echo "unknown"']);

                if (kernelArch.trim() === 'aarch64' && dockerArch.trim() !== 'arm64') {
                    console.log(chalk.yellow(`⚠️  Docker is ${dockerArch.trim()}, kernel is aarch64. Installing arm64 Docker...`));

                    const installCmd = `
                        sudo systemctl stop docker docker.socket 2>/dev/null || true
                        curl -fsSL https://download.docker.com/linux/static/stable/aarch64/docker-27.5.1.tgz -o /tmp/docker.tgz
                        sudo tar -xzf /tmp/docker.tgz -C /usr/local/bin --strip-components=1
                        sudo /usr/local/bin/dockerd &
                        sleep 5
                        docker version --format "{{.Server.Arch}}"
                    `;

                    const { stdout } = await execa('ssh', [sshHost, installCmd], { shell: true });
                    if (stdout.includes('arm64')) {
                        console.log(chalk.green('✅ Docker arm64 installed successfully'));
                    } else {
                        console.log(chalk.yellow('⚠️  Docker arm64 install may need manual verification'));
                    }
                } else if (dockerArch.trim() === 'arm64') {
                    console.log(chalk.green(`✅ Docker is already arm64`));
                } else {
                    console.log(chalk.gray(`Docker arch: ${dockerArch.trim()}, kernel: ${kernelArch.trim()}`));
                }
            } catch (e: any) {
                console.log(chalk.yellow(`⚠️  Docker arch check skipped: ${e.message}`));
            }

            // 2. Initial Env Setup (if missing)
            try {
                await execa('ssh', [sshHost, '[ -f ~/.cybermem/.env ]']);
                console.log(chalk.gray('Remote .env exists, skipping generation.'));
            } catch (e) {
                console.log(chalk.yellow('Generating remote .env...'));
                let envContent = fs.readFileSync(internalEnvExample, 'utf-8');
                const newKey = `sk-${crypto.randomBytes(16).toString('hex')}`;

                // Replace OM_API_KEY with generated key
                if(envContent.includes('OM_API_KEY=')) {
                    envContent = envContent.replace(/OM_API_KEY=.*/, `OM_API_KEY=${newKey}`);
                } else {
                    envContent += `\nOM_API_KEY=${newKey}\n`;
                }

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
            // DOCKER_DEFAULT_PLATFORM=linux/arm64 forces arm64 images on RPi with 64-bit kernel but 32-bit Docker
            const remoteCmd = `
                export CYBERMEM_ENV_PATH=~/.cybermem/.env
                export DATA_DIR=~/.cybermem/data
                export DOCKER_DEFAULT_PLATFORM=linux/arm64
                docker-compose -f ~/.cybermem/docker-compose.yml up -d --remove-orphans
            `;

            await execa('ssh', [sshHost, remoteCmd], { stdio: 'inherit' });

            console.log(chalk.green('\n✅ RPi deployment successful!'));
            const hostIp = sshHost.split('@')[1];
            console.log(chalk.bold('Access Points (LAN):'));
            console.log(`  - Dashboard:   ${chalk.underline(`http://${hostIp}:3000`)} (admin/admin)`);
            console.log(`  - OpenMemory:  ${chalk.underline(`http://${hostIp}:8080`)}`);

            // Tailscale Funnel setup
            if (useTailscale) {
                console.log(chalk.blue('\n🔗 Setting up Remote Access (Tailscale Funnel)...'));

                try {
                    try {
                        await execa('ssh', [sshHost, 'which tailscale']);
                    } catch (e) {
                        console.log(chalk.yellow('  Tailscale not found. Installing...'));
                        await execa('ssh', [sshHost, 'curl -fsSL https://tailscale.com/install.sh | sh'], { stdio: 'inherit' });
                    }

                    console.log(chalk.blue('  Ensuring Tailscale is up...'));
                    try {
                        await execa('ssh', [sshHost, 'tailscale status']);
                    } catch (e) {
                         console.log(chalk.yellow('  ⚠️  Tailscale authentication required. Please follow the prompts:'));
                         await execa('ssh', [sshHost, 'sudo tailscale up'], { stdio: 'inherit' });
                    }

                    console.log(chalk.blue('  Configuring HTTPS Funnel (requires sudo access)...'));
                    console.log(chalk.gray('  You may be prompted for your RPi password.'));

                    await execa('ssh', ['-t', sshHost, 'sudo tailscale serve reset'], { stdio: 'inherit' }).catch(() => {});
                    await execa('ssh', ['-t', sshHost, 'sudo tailscale serve --bg --set-path /cybermem http://127.0.0.1:8626'], { stdio: 'inherit' });
                    await execa('ssh', ['-t', sshHost, 'sudo tailscale serve --bg http://127.0.0.1:3000'], { stdio: 'inherit' });
                    await execa('ssh', ['-t', sshHost, 'sudo tailscale funnel --bg 443'], { stdio: 'inherit' });

                    const { stdout } = await execa('ssh', [sshHost, "tailscale status --json | jq -r '.Self.DNSName' | sed 's/\\.$//'"]);
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
                console.log(chalk.gray('\n💡 For remote access, re-run with: npx @cybermem/cli --rpi --remote-access'));
            }
        }
        else if (target === 'vps') {
            console.log(chalk.yellow('VPS deployment is similar to RPi.'));
            console.log(chalk.blue('\n📋 VPS Deployment Steps:'));
            console.log('1. Run: npx @cybermem/cli --rpi pi@your-vps-ip');
            console.log('2. For HTTPS, choose one of:');
            console.log(chalk.gray('   a) Tailscale Funnel: --remote-access flag'));
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

    } catch (error) {
        console.error(chalk.red('Deployment failed:'), error);
        process.exit(1);
    }
}
