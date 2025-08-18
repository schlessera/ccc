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
  copyFile: jest.fn(),
  writeFile: jest.fn(), // Still needed for system commands
  access: jest.fn(),
  chmod: jest.fn(),
  constants: { X_OK: 1 },
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

const mockLoadSystemCommands = jest.fn();

jest.mock('../../../../src/core/commands/loader', () => ({
  CommandLoader: jest.fn().mockImplementation(() => ({
    loadSystemCommands: mockLoadSystemCommands,
  }))
}));

const mockEnsureUserConfigDir = jest.fn();
const mockGetUserCommandsDir = jest.fn(() => '/home/user/.ccc/commands');

jest.mock('../../../../src/core/config/user-manager', () => ({
  UserConfigManager: {
    getInstance: jest.fn(() => ({
      ensureUserConfigDir: mockEnsureUserConfigDir,
      getUserCommandsDir: mockGetUserCommandsDir,
    }))
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
    (fs.copyFile as unknown as jest.Mock).mockResolvedValue(undefined);
    (fs.writeFile as unknown as jest.Mock).mockResolvedValue(undefined);
    (fs.access as unknown as jest.Mock).mockResolvedValue(undefined);
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
      expect(fs.copyFile).toHaveBeenCalledWith(
        '/path/to/ccc',
        '/home/user/.local/bin/ccc'
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
      expect(fs.copyFile).toHaveBeenCalledWith(
        '/path/to/ccc',
        '/usr/local/bin/ccc'
      );
    });

    it('should copy executable file instead of creating wrapper script', async () => {
      (PathUtils.exists as jest.Mock).mockResolvedValue(false);
      const mockSpinner = {
        start: jest.fn(),
        stop: jest.fn(),
      };
      (p.spinner as jest.Mock).mockReturnValue(mockSpinner);

      await installCommand({});

      // Should copy the file, not write a script
      expect(fs.copyFile).toHaveBeenCalledWith('/path/to/ccc', '/home/user/.local/bin/ccc');
      expect(fs.access).toHaveBeenCalledWith('/path/to/ccc', 1); // Check execute permission
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

      expect(fs.copyFile).toHaveBeenCalled();
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
        expect.stringContaining('Copied from: [GRAY]/path/to/ccc[/GRAY]'),
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
      (fs.copyFile as unknown as jest.Mock).mockRejectedValue(new Error('Disk full'));

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
      (fs.copyFile as unknown as jest.Mock).mockResolvedValue(undefined);
    (fs.writeFile as unknown as jest.Mock).mockResolvedValue(undefined);
    (fs.access as unknown as jest.Mock).mockResolvedValue(undefined);
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
      expect(fs.copyFile).toHaveBeenCalledWith(
        '/path/to/ccc',
        '/home/user/.local/bin/ccc'
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
      expect(fs.copyFile).toHaveBeenCalledWith(
        '/path/to/ccc',
        '/usr/local/bin/ccc'
      );
    });
  });

  describe('System commands installation', () => {
    it('should install system commands when available', async () => {
      (PathUtils.exists as jest.Mock).mockResolvedValue(false);
      
      const mockSystemCommands = [
        { name: 'global-gitignore', description: 'Configure global gitignore', content: 'test content', allowedTools: 'Bash, Read, Write' },
        { name: 'test-command', description: 'Test command', content: 'test content 2' }
      ];
      
      mockLoadSystemCommands.mockResolvedValue(mockSystemCommands);
      mockEnsureUserConfigDir.mockResolvedValue(undefined);
      
      const mockSpinner = {
        start: jest.fn(),
        stop: jest.fn(),
      };
      (p.spinner as jest.Mock).mockReturnValue(mockSpinner);

      await installCommand({});

      // First ensureDir call is for /home/user/.local/bin (install path)
      // Second ensureDir call is for /home/user/.ccc/commands/ccc (system commands)
      expect(fs.ensureDir).toHaveBeenCalledWith('/home/user/.local/bin');
      expect(fs.ensureDir).toHaveBeenCalledWith('/home/user/.ccc/commands/ccc');
      
      // First writeFile call is for the main ccc executable
      // Subsequent calls are for system commands
      expect(fs.writeFile).toHaveBeenCalledWith(
        '/home/user/.ccc/commands/ccc/global-gitignore.md',
        expect.stringContaining('description: Configure global gitignore'),
        'utf-8'
      );
      expect(fs.writeFile).toHaveBeenCalledWith(
        '/home/user/.ccc/commands/ccc/test-command.md',
        expect.stringContaining('description: Test command'),
        'utf-8'
      );
      
      expect(p.note).toHaveBeenCalledWith(
        expect.stringContaining('System commands installed:'),
        '[GREEN]✅ Installation Complete[/GREEN]'
      );
    });

    it('should handle no system commands available', async () => {
      (PathUtils.exists as jest.Mock).mockResolvedValue(false);
      
      mockLoadSystemCommands.mockResolvedValue([]);
      mockEnsureUserConfigDir.mockResolvedValue(undefined);
      
      const mockSpinner = {
        start: jest.fn(),
        stop: jest.fn(),
      };
      (p.spinner as jest.Mock).mockReturnValue(mockSpinner);

      await installCommand({});

      expect(p.note).toHaveBeenCalledWith(
        expect.stringContaining('• No system commands found'),
        '[GREEN]✅ Installation Complete[/GREEN]'
      );
    });

    it('should handle system commands installation error gracefully', async () => {
      (PathUtils.exists as jest.Mock).mockResolvedValue(false);
      
      mockLoadSystemCommands.mockRejectedValue(new Error('Test error'));
      mockEnsureUserConfigDir.mockResolvedValue(undefined);
      
      // Mock console.warn to prevent test output pollution
      const originalWarn = console.warn;
      console.warn = jest.fn();
      
      const mockSpinner = {
        start: jest.fn(),
        stop: jest.fn(),
      };
      (p.spinner as jest.Mock).mockReturnValue(mockSpinner);

      await installCommand({});

      expect(console.warn).toHaveBeenCalledWith('Warning: Failed to install system commands:', expect.any(Error));
      
      // Restore console.warn
      console.warn = originalWarn;
      
      expect(p.note).toHaveBeenCalledWith(
        expect.stringContaining('• No system commands found'),
        '[GREEN]✅ Installation Complete[/GREEN]'
      );
    });

    it('should create command files with proper frontmatter formatting', async () => {
      (PathUtils.exists as jest.Mock).mockResolvedValue(false);
      
      const mockSystemCommands = [
        { 
          name: 'test-cmd', 
          description: 'Test description',
          allowedTools: 'Bash, Read',
          argumentHint: 'test hint',
          content: 'command content here'
        }
      ];
      
      mockLoadSystemCommands.mockResolvedValue(mockSystemCommands);
      mockEnsureUserConfigDir.mockResolvedValue(undefined);
      
      const mockSpinner = {
        start: jest.fn(),
        stop: jest.fn(),
      };
      (p.spinner as jest.Mock).mockReturnValue(mockSpinner);

      await installCommand({});

      const expectedContent = `---
description: Test description
allowed-tools: Bash, Read
argument-hint: test hint
---

command content here`;

      expect(fs.writeFile).toHaveBeenCalledWith(
        '/home/user/.ccc/commands/ccc/test-cmd.md',
        expectedContent,
        'utf-8'
      );
    });
  });
});