"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.restore = restore;
const chalk_1 = __importDefault(require("chalk"));
const execa_1 = __importDefault(require("execa"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
async function restore(file, options) {
    if (!file) {
        console.error(chalk_1.default.red('Error: Please specify the backup file to restore.'));
        console.log(`Usage: npx @cybermem/mcp restore <file>`);
        process.exit(1);
    }
    const backupPath = path_1.default.resolve(process.cwd(), file);
    if (!fs_1.default.existsSync(backupPath)) {
        console.error(chalk_1.default.red(`Error: File not found at ${backupPath}`));
        process.exit(1);
    }
    console.log(chalk_1.default.blue(`♻️  Restoring from: ${path_1.default.basename(backupPath)}...`));
    console.log(chalk_1.default.yellow('⚠️  This will overwrite current data!'));
    try {
        // 1. Stop the OpenMemory service to safely write to DB
        console.log(chalk_1.default.blue('Stopping OpenMemory service...'));
        try {
            await (0, execa_1.default)('docker', ['stop', 'cybermem-openmemory']);
        }
        catch (e) {
            console.log(chalk_1.default.gray('Container not running (or not found), proceeding...'));
        }
        // 2. Restore data using transient alpine container
        console.log(chalk_1.default.blue('Extracting data to volume...'));
        // We handle both absolute paths (by mounting dir) or relative
        const dir = path_1.default.dirname(backupPath);
        const filename = path_1.default.basename(backupPath);
        const cmd = [
            'run', '--rm',
            '--volumes-from', 'cybermem-openmemory', // Access the volume even if container is stopped
            '-v', `${dir}:/backup`,
            'alpine',
            'sh', '-c',
            // Extract to root / (since backup was relative to /data we need to be careful how it was packed)
            // In backup we did: tar czf ... -C / data
            // So it contains "data/..."
            // Extracting to / will put it in /data
            `tar xzf /backup/${filename} -C / && chown -R 1001:1001 /data`
        ];
        await (0, execa_1.default)('docker', cmd, { stdio: 'inherit' });
        // 3. Restart the service
        console.log(chalk_1.default.blue('Restarting OpenMemory service...'));
        await (0, execa_1.default)('docker', ['start', 'cybermem-openmemory']);
        console.log(chalk_1.default.green(`\n✅ Restore completed successfully!`));
        console.log('Your memory has been recovered.');
    }
    catch (error) {
        console.error(chalk_1.default.red('Restore failed:'), error);
        console.log(chalk_1.default.yellow('Suggestion: Check if Docker is running and "cybermem-openmemory" container exists.'));
        process.exit(1);
    }
}
