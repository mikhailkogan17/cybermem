import chalk from 'chalk';
import execa from 'execa';
import fs from 'fs';
import path from 'path';

export async function backup(options: any) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `cybermem-backup-${timestamp}.tar.gz`;
    const outputPath = path.resolve(process.cwd(), filename);

    console.log(chalk.blue(`📦 Creating backup: ${filename}...`));

    try {
        // Check if container exists
        try {
            await execa('docker', ['inspect', 'cybermem-openmemory']);
        } catch (e) {
            console.error(chalk.red('Error: cybermem-openmemory container not found. Is CyberMem installed?'));
            process.exit(1);
        }

        // Use a transient alpine container to tar the /data volume
        // We mount the current working directory to /backup in the container
        // And we use --volumes-from to access the data volume of the running service
        const cmd = [
            'run', '--rm',
            '--volumes-from', 'cybermem-openmemory',
            '-v', `${process.cwd()}:/backup`,
            'alpine',
            'tar', 'czf', `/backup/${filename}`, '-C', '/', 'data'
        ];

        console.log(chalk.gray(`Running: docker ${cmd.join(' ')}`));
        await execa('docker', cmd, { stdio: 'inherit' });

        if (fs.existsSync(outputPath)) {
            const stats = fs.statSync(outputPath);
            const sizeMb = (stats.size / 1024 / 1024).toFixed(2);
            console.log(chalk.green(`\n✅ Backup created successfully!`));
            console.log(`File: ${chalk.bold(outputPath)}`);
            console.log(`Size: ${sizeMb} MB`);
        } else {
            throw new Error('Backup file not found after generation.');
        }

    } catch (error) {
        console.error(chalk.red('Backup failed:'), error);
        process.exit(1);
    }
}
