"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deployCommand = void 0;
const chalk_1 = __importDefault(require("chalk"));
const commander_1 = require("commander");
const crypto_1 = __importDefault(require("crypto"));
const execa_1 = __importDefault(require("execa"));
const fs_1 = __importDefault(require("fs"));
const inquirer_1 = __importDefault(require("inquirer"));
const os_1 = __importDefault(require("os"));
const path_1 = __importDefault(require("path"));
exports.deployCommand = new commander_1.Command('deploy')
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
    console.log(chalk_1.default.blue(`Deploying to ${target}...`));
    try {
        // Resolve Template Directory (Support both Dev and Prod)
        // Resolve Template Directory (Support both Dev and Prod)
        // In Prod: __dirname is dist/commands, so templates is ../templates (dist/templates)
        // In Dev (ts-node): __dirname is src/commands, so templates is ../../templates (root/packages/cli/templates)
        // Try production path first (dist/templates)
        let templateDir = path_1.default.resolve(__dirname, '../templates');
        // If not found, try development path (src/../../templates)
        if (!fs_1.default.existsSync(templateDir)) {
            templateDir = path_1.default.resolve(__dirname, '../../templates');
        }
        // Final sanity check
        if (!fs_1.default.existsSync(templateDir)) {
            // Fallback for when running from root with ts-node directly (unlikely but possible)
            templateDir = path_1.default.resolve(process.cwd(), 'packages/cli/templates');
        }
        if (!fs_1.default.existsSync(templateDir)) {
            throw new Error(`Templates not found at ${templateDir}. Please ensure package is built correctly.`);
        }
        if (target === 'local') {
            const composeFile = path_1.default.join(templateDir, 'docker-compose.yml');
            const internalEnvExample = path_1.default.join(templateDir, 'envs/local.example');
            if (!fs_1.default.existsSync(composeFile)) {
                console.error(chalk_1.default.red(`Internal Error: Template not found at ${composeFile}`));
                process.exit(1);
            }
            // Home Directory Config
            const homeDir = os_1.default.homedir();
            const configDir = path_1.default.join(homeDir, '.cybermem');
            const envFile = path_1.default.join(configDir, '.env');
            const dataDir = path_1.default.join(configDir, 'data');
            // 1. Ensure ~/.cybermem exists
            if (!fs_1.default.existsSync(configDir)) {
                fs_1.default.mkdirSync(configDir, { recursive: true });
                fs_1.default.mkdirSync(dataDir, { recursive: true });
            }
            // 2. Generate .env if missing
            if (!fs_1.default.existsSync(envFile)) {
                console.log(chalk_1.default.yellow(`Initializing configuration in ${configDir}...`));
                let envContent = fs_1.default.readFileSync(internalEnvExample, 'utf-8');
                const newKey = `sk-${crypto_1.default.randomBytes(16).toString('hex')}`;
                // Replace placeholder or key
                if (envContent.includes('key-change-me') || envContent.includes('CYBERMEM_API_KEY=')) {
                    envContent = envContent.replace(/CYBERMEM_API_KEY=.*/, `CYBERMEM_API_KEY=${newKey}`);
                }
                else if (envContent.includes('OM_API_KEY=')) {
                    envContent = envContent.replace(/OM_API_KEY=.*/, `CYBERMEM_API_KEY=${newKey}`);
                }
                else {
                    envContent += `\nCYBERMEM_API_KEY=${newKey}\n`;
                }
                fs_1.default.writeFileSync(envFile, envContent);
                console.log(chalk_1.default.green(`Generated secure .env at ${envFile}`));
            }
            console.log(chalk_1.default.blue('Starting CyberMem services...'));
            // Execute docker-compose with internal file and USER HOME env
            await (0, execa_1.default)('docker-compose', [
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
            console.log(chalk_1.default.green('\n🎉 CyberMem Installed!'));
            console.log('');
            console.log(chalk_1.default.bold('Next Step:'));
            console.log(`  Configure your AI client: ${chalk_1.default.underline('http://localhost:3000')} (password: admin)`);
            console.log('');
            // Check for key
            const envContent = fs_1.default.readFileSync(envFile, 'utf-8');
            const match = envContent.match(/CYBERMEM_API_KEY=(sk-[a-f0-9]+)/);
            if (match) {
                console.log(chalk_1.default.dim(`API Key: ${match[1]}`));
            }
        }
        else if (target === 'rpi') {
            const composeFile = path_1.default.join(templateDir, 'docker-compose.yml');
            const internalEnvExample = path_1.default.join(templateDir, 'envs/rpi.example');
            let sshHost = options.host;
            if (!sshHost) {
                const answers = await inquirer_1.default.prompt([
                    {
                        type: 'input',
                        name: 'host',
                        message: 'Enter SSH Host (e.g. pi@raspberrypi.local):',
                        validate: (input) => input.includes('@') ? true : 'Format must be user@host'
                    }
                ]);
                sshHost = answers.host;
            }
            console.log(chalk_1.default.blue(`Remote deploying to ${sshHost}...`));
            // 1. Create remote directory
            await (0, execa_1.default)('ssh', [sshHost, 'mkdir -p ~/.cybermem/data']);
            // 2. Initial Env Setup (if missing)
            // We read remote file check using ssh
            try {
                await (0, execa_1.default)('ssh', [sshHost, '[ -f ~/.cybermem/.env ]']);
                console.log(chalk_1.default.gray('Remote .env exists, skipping generation.'));
            }
            catch (e) {
                console.log(chalk_1.default.yellow('Generating remote .env...'));
                let envContent = fs_1.default.readFileSync(internalEnvExample, 'utf-8');
                const newKey = `sk-${crypto_1.default.randomBytes(16).toString('hex')}`;
                if (envContent.includes('CYBERMEM_API_KEY=')) {
                    envContent = envContent.replace(/CYBERMEM_API_KEY=.*/, `CYBERMEM_API_KEY=${newKey}`);
                }
                // Write to temp file then scp
                const tempEnv = path_1.default.join(os_1.default.tmpdir(), 'cybermem-rpi.env');
                fs_1.default.writeFileSync(tempEnv, envContent);
                await (0, execa_1.default)('scp', [tempEnv, `${sshHost}:~/.cybermem/.env`]);
                fs_1.default.unlinkSync(tempEnv);
            }
            // 3. Copy Docker Compose
            console.log(chalk_1.default.blue('Uploading templates...'));
            await (0, execa_1.default)('scp', [composeFile, `${sshHost}:~/.cybermem/docker-compose.yml`]);
            // 4. Run Docker Compose Remotely
            console.log(chalk_1.default.blue('Starting services on RPi...'));
            // We pass CYBERMEM_ENV_PATH explicitly as ~/.cybermem/.env and DATA_DIR as ~/.cybermem/data
            // The template uses ${CYBERMEM_ENV_PATH} and maps volumes.
            // We need to set these vars in the shell when running docker-compose
            const remoteCmd = `
                export CYBERMEM_ENV_PATH=~/.cybermem/.env
                export DATA_DIR=~/.cybermem/data
                docker-compose -f ~/.cybermem/docker-compose.yml up -d --remove-orphans
            `;
            await (0, execa_1.default)('ssh', [sshHost, remoteCmd], { stdio: 'inherit' });
            console.log(chalk_1.default.green('\n✅ RPi deployment successful!'));
            // Parse host from ssh string for convenience
            const hostIp = sshHost.split('@')[1];
            console.log(chalk_1.default.bold('Access Points (LAN):'));
            console.log(`  - Dashboard:   ${chalk_1.default.underline(`http://${hostIp}:3000`)} (admin/admin)`);
            console.log(`  - OpenMemory:  ${chalk_1.default.underline(`http://${hostIp}:8080`)}`);
            // Tailscale Funnel setup
            if (useTailscale) {
                console.log(chalk_1.default.blue('\n🔗 Setting up Remote Access (Tailscale Funnel)...'));
                try {
                    // 1. Check/Install Tailscale
                    try {
                        await (0, execa_1.default)('ssh', [sshHost, 'which tailscale']);
                    }
                    catch (e) {
                        console.log(chalk_1.default.yellow('  Tailscale not found. Installing...'));
                        await (0, execa_1.default)('ssh', [sshHost, 'curl -fsSL https://tailscale.com/install.sh | sh'], { stdio: 'inherit' });
                    }
                    // 2. Auth (interactive if needed)
                    console.log(chalk_1.default.blue('  Ensuring Tailscale is up...'));
                    try {
                        // Check status first to avoid re-auth if already up
                        await (0, execa_1.default)('ssh', [sshHost, 'tailscale status']);
                    }
                    catch (e) {
                        // Interactive auth
                        console.log(chalk_1.default.yellow('  ⚠️  Tailscale authentication required. Please follow the prompts:'));
                        await (0, execa_1.default)('ssh', [sshHost, 'sudo tailscale up'], { stdio: 'inherit' });
                    }
                    // 3. Configure Funnel (Verified commands)
                    console.log(chalk_1.default.blue('  Configuring HTTPS Funnel (requires sudo access)...'));
                    console.log(chalk_1.default.gray('  You may be prompted for your RPi password.'));
                    // Route /memory -> 8088
                    // We use -t to force TTY allocation so sudo prompts for password
                    await (0, execa_1.default)('ssh', ['-t', sshHost, 'sudo tailscale serve reset'], { stdio: 'inherit' }).catch(() => { });
                    await (0, execa_1.default)('ssh', ['-t', sshHost, 'sudo tailscale serve --bg --set-path /memory http://127.0.0.1:8088/memory'], { stdio: 'inherit' });
                    await (0, execa_1.default)('ssh', ['-t', sshHost, 'sudo tailscale serve --bg http://127.0.0.1:3000'], { stdio: 'inherit' });
                    await (0, execa_1.default)('ssh', ['-t', sshHost, 'sudo tailscale funnel --bg 443'], { stdio: 'inherit' });
                    // Get DNS name
                    const { stdout } = await (0, execa_1.default)('ssh', [sshHost, 'tailscale status --json | grep -o \'"DNSName":"[^"]*"\' | head -1 | cut -d: -f2 | tr -d \'"\\.\'']);
                    const dnsName = stdout.trim() + '.ts.net';
                    console.log(chalk_1.default.green('\n🌐 Remote Access Active (HTTPS):'));
                    console.log(`  - Dashboard: ${chalk_1.default.underline(`https://${dnsName}/`)}`);
                    console.log(`  - MCP API:   ${chalk_1.default.underline(`https://${dnsName}/memory`)}`);
                }
                catch (e) {
                    console.log(chalk_1.default.red('\n❌ Remote Access setup failed:'));
                    console.error(e);
                    console.log(chalk_1.default.gray('Manual setup: curl -fsSL https://tailscale.com/install.sh | sh && sudo tailscale up'));
                }
            }
            else {
                console.log(chalk_1.default.gray('\n💡 For remote access, re-run with: cybermem deploy --target rpi --remote-access'));
            }
        }
        else if (target === 'vps') {
            console.log(chalk_1.default.yellow('VPS deployment is similar to RPi.'));
            console.log(chalk_1.default.blue('\n📋 VPS Deployment Steps:'));
            console.log('1. Run: cybermem deploy --target rpi --host user@your-vps-ip');
            console.log('2. For HTTPS, choose one of:');
            console.log(chalk_1.default.gray('   a) Tailscale Funnel: --tailscale flag'));
            console.log(chalk_1.default.gray('   b) Caddy (recommended for public VPS):'));
            console.log(chalk_1.default.gray('      - Install Caddy: sudo apt install caddy'));
            console.log(chalk_1.default.gray('      - Configure /etc/caddy/Caddyfile:'));
            console.log(chalk_1.default.cyan(`
        cybermem.yourdomain.com {
            reverse_proxy localhost:3000
        }
        api.cybermem.yourdomain.com {
            reverse_proxy localhost:8080
        }
      `));
            console.log(chalk_1.default.gray('      - Restart: sudo systemctl restart caddy'));
            console.log(chalk_1.default.green('\n📚 Full docs: https://cybermem.dev/docs#https'));
        }
        else {
            console.error(chalk_1.default.red(`Unknown target: ${target}. Use: local, rpi, or vps`));
        }
    }
    catch (error) {
        console.error(chalk_1.default.red('Deployment failed:'), error);
        process.exit(1);
    }
});
