"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initCommand = void 0;
const chalk_1 = __importDefault(require("chalk"));
const commander_1 = require("commander");
const fs_1 = __importDefault(require("fs"));
const inquirer_1 = __importDefault(require("inquirer"));
const path_1 = __importDefault(require("path"));
exports.initCommand = new commander_1.Command('init')
    .description('Initialize CyberMem configuration')
    .action(async () => {
    console.log(chalk_1.default.bold.blue('🤖 CyberMem Setup Wizard'));
    const { target } = await inquirer_1.default.prompt([
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
    console.log(chalk_1.default.green(`Selected target: ${target}`));
    if (target === 'local') {
        const { confirm } = await inquirer_1.default.prompt([
            {
                type: 'confirm',
                name: 'confirm',
                message: 'This will create docker-compose.yml and .env in current directory. Continue?',
                default: true
            }
        ]);
        if (confirm) {
            const templateDir = path_1.default.resolve(__dirname, '../../templates');
            const envSrc = path_1.default.join(templateDir, 'envs/local.example');
            if (!fs_1.default.existsSync(envSrc)) {
                console.error(chalk_1.default.red(`Template not found at ${envSrc}.`));
                return;
            }
            // Generate .env
            let envContent = fs_1.default.readFileSync(envSrc, 'utf-8');
            const crypto = require('crypto');
            const newKey = `sk-${crypto.randomBytes(16).toString('hex')}`;
            // Replace placeholder or key
            if (envContent.includes('key-change-me') || envContent.includes('OM_API_KEY=')) {
                envContent = envContent.replace(/OM_API_KEY=.*/, `OM_API_KEY=${newKey}`);
            }
            else {
                envContent += `\nOM_API_KEY=${newKey}\n`;
            }
            fs_1.default.writeFileSync('.env', envContent);
            console.log(chalk_1.default.gray('Created .env with generated API Key'));
            console.log(chalk_1.default.gray('(Docker Compose configuration is managed internally by the CLI)'));
            console.log(chalk_1.default.green('\nInitialization complete! Run "cybermem deploy" to start.'));
        }
    }
    else {
        console.log(chalk_1.default.yellow('Target init not fully implemented in CLI yet.'));
    }
});
