import { installCommand } from '../../../../src/cli/commands/install';
import { PathUtils } from '../../../../src/utils/paths';
import * as p from '@clack/prompts';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';

// Mock dependencies
jest.mock('../../../../src/utils/paths');
jest.mock('@clack/prompts');
jest.mock('fs-extra');
jest.mock('path');
jest.mock('os');

const mockPathUtils = PathUtils as jest.Mocked<typeof PathUtils>;
const mockPrompts = p as jest.Mocked<typeof p>;
const mockFs = fs as jest.Mocked<typeof fs>;
const mockPath = path as jest.Mocked<typeof path>;
const mockOs = os as jest.Mocked<typeof os>;

describe('Install Command Coverage Boost', () => {
  const originalArgv = process.argv;
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Set up defaults
    process.argv = ['/usr/bin/node', '/path/to/ccc'];
    process.env = { ...originalEnv, PATH: '/usr/bin:/bin' };
    
    mockPrompts.spinner.mockReturnValue({
      start: jest.fn(),
      stop: jest.fn(),
    } as any);
    mockPrompts.intro.mockImplementation(() => {});
    mockPrompts.note.mockImplementation(() => {});
    mockPrompts.outro.mockImplementation(() => {});
    
    mockOs.homedir.mockReturnValue('/home/user');
    mockPath.join.mockImplementation((...args) => args.join('/'));
    (mockFs.ensureDir as any).mockResolvedValue(undefined);
    (mockFs.writeFile as any).mockResolvedValue(undefined);
    (mockFs.access as any).mockResolvedValue(undefined);
    (mockFs.chmod as any).mockResolvedValue(undefined);
    mockPathUtils.exists.mockResolvedValue(false);
  });

  afterEach(() => {
    process.argv = originalArgv;
    process.env = originalEnv;
  });

  describe('Installation options', () => {
    it('should use custom prefix when provided', async () => {
      const customPrefix = '/custom/bin';
      await installCommand({ prefix: customPrefix });

      expect(mockFs.ensureDir).toHaveBeenCalledWith(customPrefix);
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        '/custom/bin/ccc',
        expect.stringContaining('#!/usr/bin/env bash')
      );
    });

    it('should use default prefix when not provided', async () => {
      await installCommand({});

      expect(mockFs.ensureDir).toHaveBeenCalledWith('/home/user/.local/bin');
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        '/home/user/.local/bin/ccc',
        expect.stringContaining('#!/usr/bin/env bash')
      );
    });
  });

  describe('Already installed scenarios', () => {
    it('should handle already installed - reinstall confirmed', async () => {
      mockPathUtils.exists.mockResolvedValue(true);
      mockPrompts.confirm.mockResolvedValue(true);
      mockPrompts.isCancel.mockReturnValue(false);

      await installCommand({});

      expect(mockPrompts.confirm).toHaveBeenCalledWith({
        message: expect.stringContaining('already installed'),
        initialValue: false
      });
      expect(mockFs.writeFile).toHaveBeenCalled();
    });

    it('should handle already installed - reinstall declined', async () => {
      mockPathUtils.exists.mockResolvedValue(true);
      mockPrompts.confirm.mockResolvedValue(false);
      mockPrompts.isCancel.mockReturnValue(false);

      await installCommand({});

      expect(mockPrompts.outro).toHaveBeenCalledWith('Installation cancelled');
      expect(mockFs.writeFile).not.toHaveBeenCalled();
    });

    it('should handle already installed - confirmation cancelled', async () => {
      mockPathUtils.exists.mockResolvedValue(true);
      mockPrompts.confirm.mockResolvedValue(Symbol.for('clack:cancel'));
      mockPrompts.isCancel.mockReturnValue(true);

      await installCommand({});

      expect(mockPrompts.outro).toHaveBeenCalledWith('Installation cancelled');
      expect(mockFs.writeFile).not.toHaveBeenCalled();
    });
  });

  describe('PATH checking', () => {
    it('should show warning when install path not in PATH', async () => {
      process.env.PATH = '/usr/bin:/bin';
      
      await installCommand({});

      expect(mockPrompts.note).toHaveBeenCalledWith(
        expect.stringContaining('Path not in $PATH'),
        expect.any(String)
      );
    });

    it('should not show warning when install path is in PATH', async () => {
      process.env.PATH = '/usr/bin:/bin:/home/user/.local/bin';
      
      await installCommand({});

      expect(mockPrompts.note).toHaveBeenCalledWith(
        expect.not.stringContaining('Path not in $PATH'),
        expect.any(String)
      );
    });

    it('should handle empty PATH environment variable', async () => {
      process.env.PATH = '';
      
      await installCommand({});

      expect(mockPrompts.note).toHaveBeenCalledWith(
        expect.stringContaining('Path not in $PATH'),
        expect.any(String)
      );
    });

    it('should handle missing PATH environment variable', async () => {
      delete process.env.PATH;
      
      await installCommand({});

      expect(mockPrompts.note).toHaveBeenCalledWith(
        expect.stringContaining('Path not in $PATH'),
        expect.any(String)
      );
    });
  });

  describe('Error handling', () => {
    it('should handle file system errors during installation', async () => {
      (mockFs.writeFile as any).mockRejectedValue(new Error('Permission denied'));
      const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => undefined as never);

      await installCommand({});

      expect(mockPrompts.cancel).toHaveBeenCalledWith(
        expect.stringContaining('Permission denied')
      );
      expect(mockExit).toHaveBeenCalledWith(1);
      
      mockExit.mockRestore();
    });

    it('should handle chmod errors', async () => {
      (mockFs.chmod as any).mockRejectedValue(new Error('Chmod failed'));
      const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => undefined as never);

      await installCommand({});

      expect(mockExit).toHaveBeenCalledWith(1);
      mockExit.mockRestore();
    });

    it('should handle general errors', async () => {
      (mockFs.ensureDir as any).mockRejectedValue(new Error('General error'));
      const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => undefined as never);

      await installCommand({});

      expect(mockPrompts.cancel).toHaveBeenCalledWith(
        expect.stringContaining('General error')
      );
      expect(mockExit).toHaveBeenCalledWith(1);
      
      mockExit.mockRestore();
    });
  });

  describe('Launcher script creation', () => {
    it('should create smart launcher script', async () => {
      await installCommand({});

      expect(mockFs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('ccc'),
        expect.stringContaining('#!/usr/bin/env bash')
      );
    });

    it('should include source path in launcher', async () => {
      await installCommand({});

      expect(mockFs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('ccc'),
        expect.stringContaining('/path/to/ccc')
      );
    });

    it('should include fallback methods in launcher', async () => {
      await installCommand({});

      expect(mockFs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('ccc'),
        expect.stringContaining('npx claude-code-central')
      );
    });

    it('should set correct permissions on launcher script', async () => {
      await installCommand({});

      expect(mockFs.chmod).toHaveBeenCalledWith(
        expect.stringContaining('ccc'),
        0o755
      );
    });
  });

  describe('Installation completion', () => {
    it('should show completion message with next steps when PATH is correct', async () => {
      process.env.PATH = '/usr/bin:/bin:/home/user/.local/bin';
      
      await installCommand({});

      expect(mockPrompts.note).toHaveBeenCalledWith(
        expect.stringContaining('You can now run "ccc" from anywhere'),
        '💡 Next Steps'
      );
    });

    it('should show completion message with shell restart when PATH is incorrect', async () => {
      process.env.PATH = '/usr/bin:/bin';
      
      await installCommand({});

      expect(mockPrompts.note).toHaveBeenCalledWith(
        expect.stringContaining('Restart your terminal'),
        '💡 Next Steps'
      );
    });

    it('should show source path in completion note', async () => {
      const sourcePath = '/custom/path/to/ccc';
      process.argv[1] = sourcePath;
      
      await installCommand({});

      expect(mockPrompts.note).toHaveBeenCalledWith(
        expect.stringContaining(sourcePath),
        expect.stringContaining('Installation Complete')
      );
    });
  });
});