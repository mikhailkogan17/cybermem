"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const execa_1 = __importDefault(require("execa"));
const fs_1 = __importDefault(require("fs"));
const backup_1 = require("../backup");
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
        execa_1.default.mockResolvedValueOnce({ exitCode: 0 });
        // Mock docker run success
        execa_1.default.mockResolvedValueOnce({ exitCode: 0 });
        // Mock fs.existsSync to true (file created)
        fs_1.default.existsSync.mockReturnValue(true);
        // Mock fs.statSync
        fs_1.default.statSync.mockReturnValue({ size: 5 * 1024 * 1024 }); // 5MB
        await (0, backup_1.backup)({});
        // Expect docker inspect check
        expect(execa_1.default).toHaveBeenCalledWith('docker', ['inspect', 'cybermem-openmemory']);
        // Expect docker run tar
        const tarCall = execa_1.default.mock.calls[1];
        expect(tarCall[0]).toBe('docker');
        expect(tarCall[1]).toContain('run');
        expect(tarCall[1]).toContain('tar');
        expect(tarCall[1]).toContain('czf');
        // Check volumes from
        expect(tarCall[1]).toContain('--volumes-from');
        expect(tarCall[1]).toContain('cybermem-openmemory');
    });
    it('should fail if openmemory container does not exist', async () => {
        // Mock inspect failure
        execa_1.default.mockRejectedValueOnce(new Error('No such container'));
        const exitSpy = jest.spyOn(process, 'exit').mockImplementation((() => { }));
        await (0, backup_1.backup)({});
        expect(console.error).toHaveBeenCalledWith(expect.stringContaining('not found'));
        expect(exitSpy).toHaveBeenCalledWith(1);
    });
    it('should error if backup file is not created', async () => {
        execa_1.default.mockResolvedValue({ exitCode: 0 }); // inspect OK
        execa_1.default.mockResolvedValue({ exitCode: 0 }); // run OK
        // Mock file check false
        fs_1.default.existsSync.mockReturnValue(false);
        const exitSpy = jest.spyOn(process, 'exit').mockImplementation((() => { }));
        await (0, backup_1.backup)({});
        expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Backup failed'));
        expect(exitSpy).toHaveBeenCalledWith(1);
    });
});
