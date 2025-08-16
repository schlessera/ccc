import { installCommand } from '../../../../src/cli/commands/install';

// Mock all dependencies
jest.mock('@clack/prompts', () => ({
  cancel: jest.fn(),
  note: jest.fn(),
  confirm: jest.fn(),
  spinner: jest.fn(() => ({
    start: jest.fn(),
    stop: jest.fn(),
  })),
  isCancel: jest.fn(),
  intro: jest.fn(),
  outro: jest.fn(),
}));

jest.mock('chalk', () => {
  const mockChalk = {
    red: jest.fn((text) => `[RED]${text}[/RED]`),
    green: jest.fn((text) => `[GREEN]${text}[/GREEN]`),
    yellow: jest.fn((text) => `[YELLOW]${text}[/YELLOW]`),
    cyan: jest.fn((text) => `[CYAN]${text}[/CYAN]`),
    gray: jest.fn((text) => `[GRAY]${text}[/GRAY]`),
  };
  return {
    __esModule: true,
    default: mockChalk
  };
});

jest.mock('fs-extra', () => ({
  ensureDir: jest.fn(),
  writeFile: jest.fn(),
  chmod: jest.fn(),
}));

jest.mock('path', () => ({
  join: jest.fn((...args) => args.join('/')),
  delimiter: ':',
}));

jest.mock('os', () => ({
  homedir: jest.fn(() => '/home/user'),
}));

jest.mock('../../../../src/utils/paths', () => ({
  PathUtils: {
    exists: jest.fn(),
  }
}));

import * as p from '@clack/prompts';
import * as fs from 'fs-extra';
import { PathUtils } from '../../../../src/utils/paths';

describe('installCommand', () => {
  let mockProcess: any;

  beforeEach(() => {
    // Mock process.argv and process.env
    mockProcess = {
      argv: ['node', '/path/to/ccc', 'install'],
      env: {
        PATH: '/usr/bin:/bin:/usr/local/bin'
      },
      exit: jest.fn(),
    };
    Object.defineProperty(global, 'process', {
      value: mockProcess,
      writable: true,
    });

    // Reset all mocks
    jest.clearAllMocks();

    // Re-setup fs mocks since they get cleared
    (fs.ensureDir as unknown as jest.Mock).mockResolvedValue(undefined);
    (fs.writeFile as unknown as jest.Mock).mockResolvedValue(undefined);
    (fs.chmod as unknown as jest.Mock).mockResolvedValue(undefined);
    
    // Setup default p.isCancel behavior
    (p.isCancel as unknown as jest.Mock).mockReturnValue(false);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Basic functionality', () => {
    it('should install CCC to default location when not already installed', async () => {
      (PathUtils.exists as jest.Mock).mockResolvedValue(false);

      const mockSpinner = {
        start: jest.fn(),
        stop: jest.fn(),
      };
      (p.spinner as jest.Mock).mockReturnValue(mockSpinner);

      await installCommand({});

      expect(p.intro).toHaveBeenCalledWith('[CYAN]📦 Install Global Commands[/CYAN]');
      expect(fs.ensureDir).toHaveBeenCalledWith('/home/user/.local/bin');
      expect(fs.writeFile).toHaveBeenCalledWith(
        '/home/user/.local/bin/ccc',
        expect.stringContaining('#!/usr/bin/env bash')
      );
      expect(fs.chmod).toHaveBeenCalledWith('/home/user/.local/bin/ccc', 0o755);
      expect(mockSpinner.start).toHaveBeenCalledWith('Installing global CCC command');
      expect(mockSpinner.stop).toHaveBeenCalledWith('Installation completed');
    });

    it('should use custom prefix when provided', async () => {
      (PathUtils.exists as jest.Mock).mockResolvedValue(false);

      const mockSpinner = {
        start: jest.fn(),
        stop: jest.fn(),
      };
      (p.spinner as jest.Mock).mockReturnValue(mockSpinner);

      await installCommand({ prefix: '/usr/local/bin' });

      expect(fs.ensureDir).toHaveBeenCalledWith('/usr/local/bin');
      expect(fs.writeFile).toHaveBeenCalledWith(
        '/usr/local/bin/ccc',
        expect.any(String)
      );
    });

    it('should create wrapper script with correct source path', async () => {
      (PathUtils.exists as jest.Mock).mockResolvedValue(false);
      const mockSpinner = {
        start: jest.fn(),
        stop: jest.fn(),
      };
      (p.spinner as jest.Mock).mockReturnValue(mockSpinner);

      await installCommand({});

      const writeCall = (fs.writeFile as unknown as jest.Mock).mock.calls[0];
      const scriptContent = writeCall[1];
      
      expect(scriptContent).toContain('#!/usr/bin/env bash');
      expect(scriptContent).toContain('CCC_SOURCE="/path/to/ccc"');
      expect(scriptContent).toContain('exec "$CCC_SOURCE" "$@"');
    });
  });

  describe('Reinstallation handling', () => {
    it('should ask for confirmation when CCC is already installed', async () => {
      (PathUtils.exists as jest.Mock).mockResolvedValue(true);
      (p.confirm as jest.Mock).mockResolvedValue(true);
      const mockSpinner = {
        start: jest.fn(),
        stop: jest.fn(),
      };
      (p.spinner as jest.Mock).mockReturnValue(mockSpinner);

      await installCommand({});

      expect(p.confirm).toHaveBeenCalledWith({
        message: 'CCC is already installed at /home/user/.local/bin/ccc. Reinstall?',
        initialValue: false
      });
    });

    it('should cancel installation when user declines reinstall', async () => {
      (PathUtils.exists as jest.Mock).mockResolvedValue(true);
      (p.confirm as jest.Mock).mockResolvedValue(false);

      await installCommand({});

      expect(p.outro).toHaveBeenCalledWith('Installation cancelled');
      expect(fs.writeFile).not.toHaveBeenCalled();
    });

    it('should handle cancelled reinstall confirmation', async () => {
      (PathUtils.exists as jest.Mock).mockResolvedValue(true);
      (p.confirm as jest.Mock).mockResolvedValue(Symbol('cancel'));
      (p.isCancel as unknown as jest.Mock).mockReturnValue(true);

      await installCommand({});

      expect(p.outro).toHaveBeenCalledWith('Installation cancelled');
      expect(fs.writeFile).not.toHaveBeenCalled();
    });

    it('should proceed with installation when user confirms reinstall', async () => {
      (PathUtils.exists as jest.Mock).mockResolvedValue(true);
      (p.confirm as jest.Mock).mockResolvedValue(true);
      (p.isCancel as unknown as jest.Mock).mockReturnValue(false); // Explicitly not cancelled
      const mockSpinner = {
        start: jest.fn(),
        stop: jest.fn(),
      };
      (p.spinner as jest.Mock).mockReturnValue(mockSpinner);

      await installCommand({});

      expect(fs.writeFile).toHaveBeenCalled();
      expect(fs.chmod).toHaveBeenCalled();
    });
  });

  describe('PATH detection and warnings', () => {
    it('should detect when install path is in PATH', async () => {
      mockProcess.env.PATH = '/usr/bin:/bin:/home/user/.local/bin:/usr/local/bin';
      
      (PathUtils.exists as jest.Mock).mockResolvedValue(false);
      const mockSpinner = {
        start: jest.fn(),
        stop: jest.fn(),
      };
      (p.spinner as jest.Mock).mockReturnValue(mockSpinner);

      await installCommand({});

      expect(p.note).toHaveBeenCalledWith(
        expect.stringContaining('You can now run "ccc" from anywhere'),
        '💡 Next Steps'
      );
    });

    it('should warn when install path is not in PATH', async () => {
      mockProcess.env.PATH = '/usr/bin:/bin:/usr/local/bin';
      
      (PathUtils.exists as jest.Mock).mockResolvedValue(false);
      const mockSpinner = {
        start: jest.fn(),
        stop: jest.fn(),
      };
      (p.spinner as jest.Mock).mockReturnValue(mockSpinner);

      await installCommand({});

      expect(p.note).toHaveBeenCalledWith(
        expect.stringContaining('[YELLOW]⚠️  Path not in $PATH[/YELLOW]'),
        '[GREEN]✅ Installation Complete[/GREEN]'
      );
      expect(p.note).toHaveBeenCalledWith(
        expect.stringContaining('Restart your terminal or source your shell profile'),
        '💡 Next Steps'
      );
    });

    it('should handle missing PATH environment variable', async () => {
      delete mockProcess.env.PATH;
      
      (PathUtils.exists as jest.Mock).mockResolvedValue(false);
      const mockSpinner = {
        start: jest.fn(),
        stop: jest.fn(),
      };
      (p.spinner as jest.Mock).mockReturnValue(mockSpinner);

      await installCommand({});

      expect(p.note).toHaveBeenCalledWith(
        expect.stringContaining('[YELLOW]⚠️  Path not in $PATH[/YELLOW]'),
        '[GREEN]✅ Installation Complete[/GREEN]'
      );
    });
  });

  describe('Installation notes and next steps', () => {
    it('should show installation details', async () => {
      (PathUtils.exists as jest.Mock).mockResolvedValue(false);
      const mockSpinner = {
        start: jest.fn(),
        stop: jest.fn(),
      };
      (p.spinner as jest.Mock).mockReturnValue(mockSpinner);

      await installCommand({});

      expect(p.note).toHaveBeenCalledWith(
        expect.stringContaining('Installed: [GREEN]/home/user/.local/bin/ccc[/GREEN]'),
        '[GREEN]✅ Installation Complete[/GREEN]'
      );
      expect(p.note).toHaveBeenCalledWith(
        expect.stringContaining('Source: [GRAY]/path/to/ccc[/GRAY]'),
        '[GREEN]✅ Installation Complete[/GREEN]'
      );
    });

    it('should show next steps for PATH issues', async () => {
      mockProcess.env.PATH = '/usr/bin:/bin';
      
      (PathUtils.exists as jest.Mock).mockResolvedValue(false);
      const mockSpinner = {
        start: jest.fn(),
        stop: jest.fn(),
      };
      (p.spinner as jest.Mock).mockReturnValue(mockSpinner);

      await installCommand({});

      expect(p.note).toHaveBeenCalledWith(
        expect.stringContaining('Add to your shell profile:'),
        '[GREEN]✅ Installation Complete[/GREEN]'
      );
      expect(p.note).toHaveBeenCalledWith(
        expect.stringContaining('[GRAY]export PATH="/home/user/.local/bin:$PATH"[/GRAY]'),
        '[GREEN]✅ Installation Complete[/GREEN]'
      );
    });

    it('should show verification and usage steps', async () => {
      (PathUtils.exists as jest.Mock).mockResolvedValue(false);
      const mockSpinner = {
        start: jest.fn(),
        stop: jest.fn(),
      };
      (p.spinner as jest.Mock).mockReturnValue(mockSpinner);

      await installCommand({});

      expect(p.note).toHaveBeenCalledWith(
        expect.stringContaining('Try running "ccc --help" to verify installation'),
        '💡 Next Steps'
      );
      expect(p.note).toHaveBeenCalledWith(
        expect.stringContaining('Use "ccc setup" to manage your first project'),
        '💡 Next Steps'
      );
    });
  });

  describe('Error handling', () => {
    it('should handle directory creation errors', async () => {
      (PathUtils.exists as jest.Mock).mockResolvedValue(false);
      (fs.ensureDir as unknown as jest.Mock).mockRejectedValue(new Error('Permission denied'));

      const mockSpinner = {
        start: jest.fn(),
        stop: jest.fn(),
      };
      (p.spinner as jest.Mock).mockReturnValue(mockSpinner);

      await installCommand({});

      // fs.ensureDir error occurs before spinner is created, so just check for outer error handling
      expect(p.cancel).toHaveBeenCalledWith('[RED]Permission denied[/RED]');
      expect(mockProcess.exit).toHaveBeenCalledWith(1);
    });

    it('should handle file write errors', async () => {
      (PathUtils.exists as jest.Mock).mockResolvedValue(false);
      (fs.ensureDir as unknown as jest.Mock).mockResolvedValue(undefined);
      (fs.writeFile as unknown as jest.Mock).mockRejectedValue(new Error('Disk full'));

      const mockSpinner = {
        start: jest.fn(),
        stop: jest.fn(),
      };
      (p.spinner as jest.Mock).mockReturnValue(mockSpinner);

      await installCommand({});

      expect(mockSpinner.stop).toHaveBeenCalledWith('Installation failed');
      expect(p.cancel).toHaveBeenCalledWith('[RED]Disk full[/RED]');
      expect(mockProcess.exit).toHaveBeenCalledWith(1);
    });

    it('should handle chmod errors', async () => {
      (PathUtils.exists as jest.Mock).mockResolvedValue(false);
      (fs.ensureDir as unknown as jest.Mock).mockResolvedValue(undefined);
      (fs.writeFile as unknown as jest.Mock).mockResolvedValue(undefined);
      (fs.chmod as unknown as jest.Mock).mockRejectedValue(new Error('Permission error'));

      const mockSpinner = {
        start: jest.fn(),
        stop: jest.fn(),
      };
      (p.spinner as jest.Mock).mockReturnValue(mockSpinner);

      await installCommand({});

      expect(mockSpinner.stop).toHaveBeenCalledWith('Installation failed');
      expect(p.cancel).toHaveBeenCalledWith('[RED]Permission error[/RED]');
    });

    it('should handle PathUtils.exists errors', async () => {
      (PathUtils.exists as jest.Mock).mockRejectedValue(new Error('Filesystem error'));

      await installCommand({});

      expect(p.cancel).toHaveBeenCalledWith('[RED]Filesystem error[/RED]');
      expect(mockProcess.exit).toHaveBeenCalledWith(1);
    });
  });

  describe('Wrapper script generation', () => {
    it('should generate correct wrapper script content', async () => {
      (PathUtils.exists as jest.Mock).mockResolvedValue(false);
      const mockSpinner = {
        start: jest.fn(),
        stop: jest.fn(),
      };
      (p.spinner as jest.Mock).mockReturnValue(mockSpinner);

      await installCommand({});

      const writeCall = (fs.writeFile as unknown as jest.Mock).mock.calls[0];
      const scriptContent = writeCall[1];
      
      expect(scriptContent).toContain('#!/usr/bin/env bash');
      expect(scriptContent).toContain('CCC Global Wrapper Script');
      expect(scriptContent).toContain('Generated by CCC install command');
      expect(scriptContent).toContain('SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"');
      expect(scriptContent).toContain('CCC_SOURCE="/path/to/ccc"');
      expect(scriptContent).toContain('if [ ! -f "$CCC_SOURCE" ]; then');
      expect(scriptContent).toContain('echo "❌ CCC source not found: $CCC_SOURCE"');
      expect(scriptContent).toContain('echo "Please reinstall CCC or run \'ccc install\' again"');
      expect(scriptContent).toContain('exit 1');
      expect(scriptContent).toContain('exec "$CCC_SOURCE" "$@"');
    });

    it('should use process.argv[1] as source path', async () => {
      mockProcess.argv[1] = '/custom/path/to/ccc';
      
      (PathUtils.exists as jest.Mock).mockResolvedValue(false);
      const mockSpinner = {
        start: jest.fn(),
        stop: jest.fn(),
      };
      (p.spinner as jest.Mock).mockReturnValue(mockSpinner);

      await installCommand({});

      const writeCall = (fs.writeFile as unknown as jest.Mock).mock.calls[0];
      const scriptContent = writeCall[1];
      
      expect(scriptContent).toContain('CCC_SOURCE="/custom/path/to/ccc"');
    });
  });

  describe('Integration scenarios', () => {
    it('should handle complete installation flow with PATH warning', async () => {
      mockProcess.env.PATH = '/usr/bin:/bin';
      
      (PathUtils.exists as jest.Mock).mockResolvedValue(false);
      const mockSpinner = {
        start: jest.fn(),
        stop: jest.fn(),
      };
      (p.spinner as jest.Mock).mockReturnValue(mockSpinner);

      await installCommand({});

      // Should show intro
      expect(p.intro).toHaveBeenCalledWith('[CYAN]📦 Install Global Commands[/CYAN]');
      
      // Should create directory and install file
      expect(fs.ensureDir).toHaveBeenCalledWith('/home/user/.local/bin');
      expect(fs.writeFile).toHaveBeenCalledWith(
        '/home/user/.local/bin/ccc',
        expect.stringContaining('#!/usr/bin/env bash')
      );
      expect(fs.chmod).toHaveBeenCalledWith('/home/user/.local/bin/ccc', 0o755);
      
      // Should show progress
      expect(mockSpinner.start).toHaveBeenCalledWith('Installing global CCC command');
      expect(mockSpinner.stop).toHaveBeenCalledWith('Installation completed');
      
      // Should show warning about PATH
      expect(p.note).toHaveBeenCalledWith(
        expect.stringContaining('[YELLOW]⚠️  Path not in $PATH[/YELLOW]'),
        '[GREEN]✅ Installation Complete[/GREEN]'
      );
      
      // Should show next steps
      expect(p.note).toHaveBeenCalledWith(
        expect.stringContaining('Restart your terminal or source your shell profile'),
        '💡 Next Steps'
      );
    });

    it('should handle complete reinstallation flow', async () => {
      (PathUtils.exists as jest.Mock).mockResolvedValue(true);
      (p.confirm as jest.Mock).mockResolvedValue(true);
      (p.isCancel as unknown as jest.Mock).mockReturnValue(false); // Explicitly not cancelled
      const mockSpinner = {
        start: jest.fn(),
        stop: jest.fn(),
      };
      (p.spinner as jest.Mock).mockReturnValue(mockSpinner);

      await installCommand({ prefix: '/usr/local/bin' });

      // Should ask for confirmation
      expect(p.confirm).toHaveBeenCalledWith({
        message: 'CCC is already installed at /usr/local/bin/ccc. Reinstall?',
        initialValue: false
      });
      
      // Should proceed with installation
      expect(fs.writeFile).toHaveBeenCalledWith(
        '/usr/local/bin/ccc',
        expect.any(String)
      );
    });
  });
});