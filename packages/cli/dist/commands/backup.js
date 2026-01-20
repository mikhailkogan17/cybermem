"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.backup = backup;
const chalk_1 = __importDefault(require("chalk"));
const execa_1 = __importDefault(require("execa"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
async function backup(options) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `cybermem-backup-${timestamp}.tar.gz`;
    const outputPath = path_1.default.resolve(process.cwd(), filename);
    console.log(chalk_1.default.blue(`📦 Creating backup: ${filename}...`));
    try {
        // Check if container exists
        try {
            await (0, execa_1.default)('docker', ['inspect', 'cybermem-mcp']);
        }
        catch (e) {
            console.error(chalk_1.default.red('Error: cybermem-mcp container not found. Is CyberMem installed?'));
            process.exit(1);
        }
        // Use a transient alpine container to tar the /data volume
        // We mount the current working directory to /backup in the container
        // And we use --volumes-from to access the data volume of the running service
        const cmd = [
            'run', '--rm',
            '--volumes-from', 'cybermem-mcp',
            '-v', `${process.cwd()}:/backup`,
            'alpine',
            'tar', 'czf', `/backup/${filename}`, '-C', '/', 'data'
        ];
        console.log(chalk_1.default.gray(`Running: docker ${cmd.join(' ')}`));
        await (0, execa_1.default)('docker', cmd, { stdio: 'inherit' });
        if (fs_1.default.existsSync(outputPath)) {
            const stats = fs_1.default.statSync(outputPath);
            const sizeMb = (stats.size / 1024 / 1024).toFixed(2);
            console.log(chalk_1.default.green(`\n✅ Backup created successfully!`));
            console.log(`File: ${chalk_1.default.bold(outputPath)}`);
            console.log(`Size: ${sizeMb} MB`);
        }
        else {
            throw new Error('Backup file not found after generation.');
        }
    }
    catch (error) {
        console.error(chalk_1.default.red('Backup failed:'), error);
        process.exit(1);
    }
}
