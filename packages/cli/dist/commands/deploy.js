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
const os_1 = __importDefault(require("os"));
const path_1 = __importDefault(require("path"));
exports.deployCommand = new commander_1.Command('deploy')
    .description('Deploy CyberMem services')
    .option('-t, --target <target>', 'Deployment target (local, rpi, vps)', 'local')
    .action(async (options) => {
    const target = options.target;
    console.log(chalk_1.default.blue(`Deploying to ${target}...`));
    try {
        if (target === 'local') {
            const templateDir = path_1.default.resolve(__dirname, '../templates');
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
                if (envContent.includes('key-change-me') || envContent.includes('OM_API_KEY=')) {
                    envContent = envContent.replace(/OM_API_KEY=.*/, `OM_API_KEY=${newKey}`);
                }
                else {
                    envContent += `\nOM_API_KEY=${newKey}\n`;
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
                    // Pass DATA_DIR to compose so it mounts ~/.cybermem/data instead of ./data
                    DATA_DIR: dataDir,
                    CYBERMEM_ENV_PATH: envFile
                }
            });
            console.log(chalk_1.default.green('\n✅ Local deployment successful!'));
            console.log(chalk_1.default.bold('Access Points:'));
            console.log(`  - Dashboard:   ${chalk_1.default.underline('http://localhost:3000')} (admin/admin)`);
            console.log(`  - OpenMemory:  ${chalk_1.default.underline('http://localhost:8080')}`);
            console.log(`  - Traefik:     ${chalk_1.default.underline('http://localhost:8081')}`);
            // Check for key
            const envContent = fs_1.default.readFileSync(envFile, 'utf-8');
            const match = envContent.match(/OM_API_KEY=(sk-[a-f0-9]+)/);
            if (match) {
                console.log(chalk_1.default.yellow(`\n🔑 Master API Key: ${match[1]}`));
            }
        }
        // ... rpi, vps logic placeholders
    }
    catch (error) {
        console.error(chalk_1.default.red('Deployment failed:'), error);
        process.exit(1);
    }
});
