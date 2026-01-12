import chalk from 'chalk';
import execa from 'execa';
import fs from 'fs';
import path from 'path';

export async function restore(file: string, options: any) {
    if (!file) {
        console.error(chalk.red('Error: Please specify the backup file to restore.'));
        console.log(`Usage: npx @cybermem/mcp restore <file>`);
        process.exit(1);
    }

    const backupPath = path.resolve(process.cwd(), file);
    if (!fs.existsSync(backupPath)) {
        console.error(chalk.red(`Error: File not found at ${backupPath}`));
        process.exit(1);
    }

    console.log(chalk.blue(`♻️  Restoring from: ${path.basename(backupPath)}...`));
    console.log(chalk.yellow('⚠️  This will overwrite current data!'));

    try {
        // 1. Stop the OpenMemory service to safely write to DB
        console.log(chalk.blue('Stopping OpenMemory service...'));
        try {
            await execa('docker', ['stop', 'cybermem-openmemory']);
        } catch (e) {
            console.log(chalk.gray('Container not running (or not found), proceeding...'));
        }

        // 2. Restore data using transient alpine container
        console.log(chalk.blue('Extracting data to volume...'));
        // We handle both absolute paths (by mounting dir) or relative
        const dir = path.dirname(backupPath);
        const filename = path.basename(backupPath);

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

        await execa('docker', cmd, { stdio: 'inherit' });

        // 3. Restart the service
        console.log(chalk.blue('Restarting OpenMemory service...'));
        await execa('docker', ['start', 'cybermem-openmemory']);

        console.log(chalk.green(`\n✅ Restore completed successfully!`));
        console.log('Your memory has been recovered.');

    } catch (error) {
        console.error(chalk.red('Restore failed:'), error);
        console.log(chalk.yellow('Suggestion: Check if Docker is running and "cybermem-openmemory" container exists.'));
        process.exit(1);
    }
}
