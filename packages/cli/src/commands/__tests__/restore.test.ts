import execa from 'execa';
import fs from 'fs';
import { restore } from '../restore';

jest.mock('execa');
jest.mock('fs');
jest.mock('path', () => ({
    ...jest.requireActual('path'),
    resolve: jest.fn((...args) => args.join('/')),
    basename: jest.fn((p) => p.split('/').pop() || ''),
    dirname: jest.fn((p) => p.split('/').slice(0, -1).join('/') || '/'),
}));

const originalConsoleLog = console.log;
const originalConsoleError = console.error;

describe('restore command', () => {
    beforeAll(() => {
        console.log = jest.fn();
        console.error = jest.fn();
    });

    afterAll(() => {
        console.log = originalConsoleLog;
        console.error = originalConsoleError;
    });

    beforeEach(() => {
        jest.clearAllMocks();
        jest.spyOn(process, 'cwd').mockReturnValue('/mock/cwd');
    });

    it('should restore successfully', async () => {
        // Mock file exists
        (fs.existsSync as jest.Mock).mockReturnValue(true);

        // Mock docker stop (success)
        (execa as any).mockResolvedValueOnce({ exitCode: 0 });
        // Mock docker run tar (success)
        (execa as any).mockResolvedValueOnce({ exitCode: 0 });
        // Mock docker start (success)
        (execa as any).mockResolvedValueOnce({ exitCode: 0 });

        await restore('backup.tar.gz', {});

        // Check docker stop
        expect(execa).toHaveBeenCalledWith('docker', ['stop', 'cybermem-openmemory']);

        // Check docker run tar
        const tarCall = (execa as any).mock.calls[1];
        expect(tarCall[0]).toBe('docker');
        expect(tarCall[1]).toContain('run');
        expect(tarCall[1]).toContain('tar xzf /backup/backup.tar.gz -C / && chown -R 1001:1001 /data');

        // Check docker start
        expect(execa).toHaveBeenCalledWith('docker', ['start', 'cybermem-openmemory']);
    });

    it('should ignore docker stop error (if container not running)', async () => {
        (fs.existsSync as jest.Mock).mockReturnValue(true);

        // Mock docker stop FAIL
        (execa as any).mockRejectedValueOnce(new Error('No such container'));
        // Mock succeeding calls
        (execa as any).mockResolvedValue({ exitCode: 0 });

        await restore('backup.tar.gz', {});

        // Should still proceed to restore
        expect(execa).toHaveBeenCalledWith('docker', expect.arrayContaining(['run']));
        expect(execa).toHaveBeenCalledWith('docker', ['start', 'cybermem-openmemory']);
    });

    it('should fail if backup file missing', async () => {
        (fs.existsSync as jest.Mock).mockReturnValue(false);
        const exitSpy = jest.spyOn(process, 'exit').mockImplementation((() => {}) as any);

        await restore('mia.tar.gz', {});

        expect(console.error).toHaveBeenCalledWith(expect.stringContaining('not found'));
        expect(exitSpy).toHaveBeenCalledWith(1);
    });
});
