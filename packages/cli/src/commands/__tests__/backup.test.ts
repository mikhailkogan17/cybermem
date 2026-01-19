import execa from 'execa';
import fs from 'fs';
import { backup } from '../backup';

// Mock dependencies
jest.mock('execa');
jest.mock('fs');
jest.mock('path', () => ({
    ...jest.requireActual('path'),
    resolve: jest.fn((...args) => args.join('/')),
    basename: jest.fn((p) => p.split('/').pop() || ''),
    dirname: jest.fn((p) => p.split('/').slice(0, -1).join('/') || '/'),
}));

// Mock console to keep output clean
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

describe('backup command', () => {
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
        // Default process.cwd
        jest.spyOn(process, 'cwd').mockReturnValue('/mock/cwd');
    });

    it('should create a backup successfully when openmemory container exists', async () => {
        // Mock docker inspect success
        (execa as any).mockResolvedValueOnce({ exitCode: 0 });
        // Mock docker run success
        (execa as any).mockResolvedValueOnce({ exitCode: 0 });

        // Mock fs.existsSync to true (file created)
        (fs.existsSync as jest.Mock).mockReturnValue(true);
        // Mock fs.statSync
        (fs.statSync as jest.Mock).mockReturnValue({ size: 5 * 1024 * 1024 }); // 5MB

        await backup({});

        // Expect docker inspect check
        expect(execa).toHaveBeenCalledWith('docker', ['inspect', 'cybermem-mcp']);

        // Expect docker run tar
        const tarCall = (execa as any).mock.calls[1];
        expect(tarCall[0]).toBe('docker');
        expect(tarCall[1]).toContain('run');
        expect(tarCall[1]).toContain('tar');
        expect(tarCall[1]).toContain('czf');
        // Check volumes from
        expect(tarCall[1]).toContain('--volumes-from');
        expect(tarCall[1]).toContain('cybermem-mcp');
    });

    it('should fail if openmemory container does not exist', async () => {
        // Mock inspect failure
        (execa as any).mockRejectedValueOnce(new Error('No such container'));

        const exitSpy = jest.spyOn(process, 'exit').mockImplementation((() => {}) as any);

        await backup({});

        expect(console.error).toHaveBeenCalledWith(expect.stringContaining('not found'));
        expect(exitSpy).toHaveBeenCalledWith(1);
    });

    it('should error if backup file is not created', async () => {
        (execa as any).mockResolvedValue({ exitCode: 0 }); // inspect OK
        (execa as any).mockResolvedValue({ exitCode: 0 }); // run OK

        // Mock file check false
        (fs.existsSync as jest.Mock).mockReturnValue(false);

        const exitSpy = jest.spyOn(process, 'exit').mockImplementation((() => {}) as any);

        await backup({});

        expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Backup failed'));
        expect(exitSpy).toHaveBeenCalledWith(1);
    });
});
