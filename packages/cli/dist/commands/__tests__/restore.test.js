"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const execa_1 = __importDefault(require("execa"));
const fs_1 = __importDefault(require("fs"));
const restore_1 = require("../restore");
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
        fs_1.default.existsSync.mockReturnValue(true);
        // Mock docker stop (success)
        execa_1.default.mockResolvedValueOnce({ exitCode: 0 });
        // Mock docker run tar (success)
        execa_1.default.mockResolvedValueOnce({ exitCode: 0 });
        // Mock docker start (success)
        execa_1.default.mockResolvedValueOnce({ exitCode: 0 });
        await (0, restore_1.restore)('backup.tar.gz', {});
        // Check docker stop
        expect(execa_1.default).toHaveBeenCalledWith('docker', ['stop', 'cybermem-openmemory']);
        // Check docker run tar
        const tarCall = execa_1.default.mock.calls[1];
        expect(tarCall[0]).toBe('docker');
        expect(tarCall[1]).toContain('run');
        expect(tarCall[1]).toContain('tar xzf /backup/backup.tar.gz -C / && chown -R 1001:1001 /data');
        // Check docker start
        expect(execa_1.default).toHaveBeenCalledWith('docker', ['start', 'cybermem-openmemory']);
    });
    it('should ignore docker stop error (if container not running)', async () => {
        fs_1.default.existsSync.mockReturnValue(true);
        // Mock docker stop FAIL
        execa_1.default.mockRejectedValueOnce(new Error('No such container'));
        // Mock succeeding calls
        execa_1.default.mockResolvedValue({ exitCode: 0 });
        await (0, restore_1.restore)('backup.tar.gz', {});
        // Should still proceed to restore
        expect(execa_1.default).toHaveBeenCalledWith('docker', expect.arrayContaining(['run']));
        expect(execa_1.default).toHaveBeenCalledWith('docker', ['start', 'cybermem-openmemory']);
    });
    it('should fail if backup file missing', async () => {
        fs_1.default.existsSync.mockReturnValue(false);
        const exitSpy = jest.spyOn(process, 'exit').mockImplementation((() => { }));
        await (0, restore_1.restore)('mia.tar.gz', {});
        expect(console.error).toHaveBeenCalledWith(expect.stringContaining('not found'));
        expect(exitSpy).toHaveBeenCalledWith(1);
    });
});
