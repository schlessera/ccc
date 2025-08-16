import { interactiveMode } from '../../../src/cli/interactive';

// Mock all dependencies
jest.mock('@clack/prompts', () => ({
  log: {
    message: jest.fn(),
    info: jest.fn(),
  },
  select: jest.fn(),
  isCancel: jest.fn(),
  outro: jest.fn(),
}));

jest.mock('chalk', () => {
  const mockChalk = {
    gray: jest.fn((text) => `[GRAY]${text}[/GRAY]`),
    green: jest.fn((text) => `[GREEN]${text}[/GREEN]`),
    yellow: jest.fn((text) => `[YELLOW]${text}[/YELLOW]`),
    red: jest.fn((text) => `[RED]${text}[/RED]`),
  };
  return {
    __esModule: true,
    default: mockChalk
  };
});

jest.mock('../../../src/cli/commands/setup', () => ({
  setupCommand: jest.fn(),
}));

jest.mock('../../../src/cli/commands/list', () => ({
  listCommand: jest.fn(),
}));

jest.mock('../../../src/cli/commands/update', () => ({
  updateCommand: jest.fn(),
}));

jest.mock('../../../src/cli/commands/unlink', () => ({
  unlinkCommand: jest.fn(),
}));

jest.mock('../../../src/cli/commands/add-agent', () => ({
  addAgentCommand: jest.fn(),
}));

jest.mock('../../../src/cli/commands/add-command', () => ({
  addCommandCommand: jest.fn(),
}));

jest.mock('../../../src/cli/commands/add-hook', () => ({
  addHookCommand: jest.fn(),
}));

jest.mock('../../../src/cli/commands/install', () => ({
  installCommand: jest.fn(),
}));

jest.mock('../../../src/cli/commands/cleanup', () => ({
  cleanupCommand: jest.fn(),
}));

jest.mock('../../../src/cli/commands/validate', () => ({
  validateCommand: jest.fn(),
}));

jest.mock('../../../src/cli/commands/status', () => ({
  statusCommand: jest.fn(),
}));

jest.mock('../../../src/utils/paths', () => ({
  PathUtils: {
    isProjectManaged: jest.fn(),
  }
}));

jest.mock('../../../src/cli/index', () => ({
  setMainMenuContext: jest.fn(),
  createESCCancellablePromise: jest.fn((promise) => promise),
}));

import * as p from '@clack/prompts';
import { PathUtils } from '../../../src/utils/paths';
import { setMainMenuContext, createESCCancellablePromise } from '../../../src/cli/index';
import { setupCommand } from '../../../src/cli/commands/setup';
import { listCommand } from '../../../src/cli/commands/list';
import { updateCommand } from '../../../src/cli/commands/update';
import { unlinkCommand } from '../../../src/cli/commands/unlink';
import { addAgentCommand } from '../../../src/cli/commands/add-agent';
import { addCommandCommand } from '../../../src/cli/commands/add-command';
import { addHookCommand } from '../../../src/cli/commands/add-hook';
import { installCommand } from '../../../src/cli/commands/install';
import { cleanupCommand } from '../../../src/cli/commands/cleanup';
import { validateCommand } from '../../../src/cli/commands/validate';
import { statusCommand } from '../../../src/cli/commands/status';

describe('interactiveMode', () => {
  let mockProcess: any;

  beforeEach(() => {
    // Mock process.cwd and process.exit
    mockProcess = {
      cwd: jest.fn(() => '/test/project'),
      exit: jest.fn(),
      env: {
        CCC_TEST_MODE: 'true',
        NODE_ENV: 'test',
      },
    };
    Object.defineProperty(global, 'process', {
      value: mockProcess,
      writable: true,
    });

    // Reset all mocks
    jest.clearAllMocks();
    
    // Mock console.error to prevent output in tests
    jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Menu display and context', () => {
    it('should show key hints on startup', async () => {
      (PathUtils.isProjectManaged as jest.Mock).mockResolvedValue(false);
      (p.select as jest.Mock).mockResolvedValueOnce('setup').mockResolvedValueOnce(Symbol('cancel'));
      (p.isCancel as unknown as jest.Mock).mockReturnValueOnce(false).mockReturnValueOnce(true);

      await interactiveMode();

      expect(p.log.message).toHaveBeenCalledWith(
        '[GRAY]Press Ctrl+C or ESC to exit • ESC returns to main menu from operations[/GRAY]'
      );
    });

    it('should show managed project context and options', async () => {
      (PathUtils.isProjectManaged as jest.Mock).mockResolvedValue(true);
      (p.select as jest.Mock).mockResolvedValue(Symbol('cancel'));
      (p.isCancel as unknown as jest.Mock).mockReturnValue(true);

      await interactiveMode();

      expect(p.log.info).toHaveBeenCalledWith(
        '[GREEN]📁 project is CCC-managed[/GREEN]'
      );
      expect(p.select).toHaveBeenCalledWith({
        message: 'What would you like to do?',
        options: expect.arrayContaining([
          { value: 'status', label: '📊 Show status' },
          { value: 'update', label: '🔄 Update configuration' },
          { value: 'add-command', label: '➕ Add command' },
          { value: 'add-agent', label: '🤖 Add agent' },
          { value: 'add-hook', label: '🎣 Add hook' },
          { value: 'unlink', label: '🔗 Unlink project' }
        ])
      });
    });

    it('should show unmanaged project context and options', async () => {
      (PathUtils.isProjectManaged as jest.Mock).mockResolvedValue(false);
      (p.select as jest.Mock).mockResolvedValue(Symbol('cancel'));
      (p.isCancel as unknown as jest.Mock).mockReturnValue(true);

      await interactiveMode();

      expect(p.log.info).toHaveBeenCalledWith(
        '[YELLOW]📁 project is not CCC-managed[/YELLOW]'
      );
      expect(p.select).toHaveBeenCalledWith({
        message: 'What would you like to do?',
        options: expect.arrayContaining([
          { value: 'setup', label: '🚀 Setup current project' },
          { value: 'list', label: '📋 List managed projects' },
          { value: 'validate', label: '✅ Validate setup' },
          { value: 'install', label: '📦 Install global commands' },
          { value: 'cleanup', label: '🧹 Cleanup old backups' }
        ])
      });
    });

    it('should set main menu context correctly', async () => {
      (PathUtils.isProjectManaged as jest.Mock).mockResolvedValue(false);
      (p.select as jest.Mock).mockResolvedValueOnce('setup').mockResolvedValueOnce(Symbol('cancel'));
      (p.isCancel as unknown as jest.Mock).mockReturnValueOnce(false).mockReturnValueOnce(true);

      await interactiveMode();

      expect(setMainMenuContext).toHaveBeenCalledWith(true);
      expect(setMainMenuContext).toHaveBeenCalledWith(false);
    });

    it('should handle current directory name extraction', async () => {
      mockProcess.cwd.mockReturnValue('/path/to/my-awesome-project');
      (PathUtils.isProjectManaged as jest.Mock).mockResolvedValue(true);
      (p.select as jest.Mock).mockResolvedValue(Symbol('cancel'));
      (p.isCancel as unknown as jest.Mock).mockReturnValue(true);

      await interactiveMode();

      expect(p.log.info).toHaveBeenCalledWith(
        '[GREEN]📁 my-awesome-project is CCC-managed[/GREEN]'
      );
    });

    it('should handle empty directory name', async () => {
      mockProcess.cwd.mockReturnValue('/');
      (PathUtils.isProjectManaged as jest.Mock).mockResolvedValue(false);
      (p.select as jest.Mock).mockResolvedValue(Symbol('cancel'));
      (p.isCancel as unknown as jest.Mock).mockReturnValue(true);

      await interactiveMode();

      expect(p.log.info).toHaveBeenCalledWith(
        '[YELLOW]📁 current directory is not CCC-managed[/YELLOW]'
      );
    });
  });

  describe('Menu navigation and cancellation', () => {
    it('should exit gracefully when cancelled', async () => {
      (PathUtils.isProjectManaged as jest.Mock).mockResolvedValue(false);
      (p.select as jest.Mock).mockResolvedValue(Symbol('cancel'));
      (p.isCancel as unknown as jest.Mock).mockReturnValue(true);

      await interactiveMode();

      expect(p.outro).toHaveBeenCalledWith('[GRAY]Goodbye! 👋[/GRAY]');
      expect(mockProcess.exit).toHaveBeenCalledWith(0);
    });

    it('should continue loop after completing action', async () => {
      (PathUtils.isProjectManaged as jest.Mock).mockResolvedValue(false);
      (p.select as jest.Mock)
        .mockResolvedValueOnce('setup')
        .mockResolvedValueOnce(Symbol('cancel'));
      (p.isCancel as unknown as jest.Mock)
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(true);
      (setupCommand as jest.Mock).mockResolvedValue(undefined);

      await interactiveMode(2);

      expect(setupCommand).toHaveBeenCalledWith({});
      expect(p.select).toHaveBeenCalledTimes(2); // Should loop back to menu
    });
  });

  describe('Command execution for managed projects', () => {
    beforeEach(() => {
      (PathUtils.isProjectManaged as jest.Mock).mockResolvedValue(true);
      (p.isCancel as unknown as jest.Mock).mockReturnValue(false);
    });

    it('should execute status command', async () => {
      (p.select as jest.Mock).mockResolvedValueOnce('status').mockResolvedValueOnce(Symbol('cancel'));
      (p.isCancel as unknown as jest.Mock).mockReturnValueOnce(false).mockReturnValueOnce(true);

      await interactiveMode(2);

      expect(createESCCancellablePromise).toHaveBeenCalled();
      expect(statusCommand).toHaveBeenCalledWith({});
    });

    it('should execute update command', async () => {
      (p.select as jest.Mock).mockResolvedValueOnce('update').mockResolvedValueOnce(Symbol('cancel'));
      (p.isCancel as unknown as jest.Mock).mockReturnValueOnce(false).mockReturnValueOnce(true);

      await interactiveMode(2);

      expect(updateCommand).toHaveBeenCalledWith({});
    });

    it('should execute add-command command', async () => {
      (p.select as jest.Mock).mockResolvedValueOnce('add-command').mockResolvedValueOnce(Symbol('cancel'));
      (p.isCancel as unknown as jest.Mock).mockReturnValueOnce(false).mockReturnValueOnce(true);

      await interactiveMode(2);

      expect(addCommandCommand).toHaveBeenCalledWith({});
    });

    it('should execute add-agent command', async () => {
      (p.select as jest.Mock).mockResolvedValueOnce('add-agent').mockResolvedValueOnce(Symbol('cancel'));
      (p.isCancel as unknown as jest.Mock).mockReturnValueOnce(false).mockReturnValueOnce(true);

      await interactiveMode(2);

      expect(addAgentCommand).toHaveBeenCalledWith({});
    });

    it('should execute add-hook command', async () => {
      (p.select as jest.Mock).mockResolvedValueOnce('add-hook').mockResolvedValueOnce(Symbol('cancel'));
      (p.isCancel as unknown as jest.Mock).mockReturnValueOnce(false).mockReturnValueOnce(true);

      await interactiveMode(2);

      expect(addHookCommand).toHaveBeenCalledWith({});
    });

    it('should execute unlink command', async () => {
      (p.select as jest.Mock).mockResolvedValueOnce('unlink').mockResolvedValueOnce(Symbol('cancel'));
      (p.isCancel as unknown as jest.Mock).mockReturnValueOnce(false).mockReturnValueOnce(true);

      await interactiveMode(2);

      expect(unlinkCommand).toHaveBeenCalledWith({});
    });
  });

  describe('Command execution for unmanaged projects', () => {
    beforeEach(() => {
      (PathUtils.isProjectManaged as jest.Mock).mockResolvedValue(false);
      (p.isCancel as unknown as jest.Mock).mockReturnValue(false);
    });

    it('should execute setup command', async () => {
      (p.select as jest.Mock).mockResolvedValueOnce('setup').mockResolvedValueOnce(Symbol('cancel'));
      (p.isCancel as unknown as jest.Mock).mockReturnValueOnce(false).mockReturnValueOnce(true);

      await interactiveMode(2);

      expect(setupCommand).toHaveBeenCalledWith({});
    });

    it('should execute list command', async () => {
      (p.select as jest.Mock).mockResolvedValueOnce('list').mockResolvedValueOnce(Symbol('cancel'));
      (p.isCancel as unknown as jest.Mock).mockReturnValueOnce(false).mockReturnValueOnce(true);

      await interactiveMode(2);

      expect(listCommand).toHaveBeenCalledWith({ verbose: false });
    });

    it('should execute validate command', async () => {
      (p.select as jest.Mock).mockResolvedValueOnce('validate').mockResolvedValueOnce(Symbol('cancel'));
      (p.isCancel as unknown as jest.Mock).mockReturnValueOnce(false).mockReturnValueOnce(true);

      await interactiveMode(2);

      expect(validateCommand).toHaveBeenCalledWith({});
    });

    it('should execute install command', async () => {
      (p.select as jest.Mock).mockResolvedValueOnce('install').mockResolvedValueOnce(Symbol('cancel'));
      (p.isCancel as unknown as jest.Mock).mockReturnValueOnce(false).mockReturnValueOnce(true);

      await interactiveMode(2);

      expect(installCommand).toHaveBeenCalledWith({});
    });

    it('should execute cleanup command with default days', async () => {
      (p.select as jest.Mock).mockResolvedValueOnce('cleanup').mockResolvedValueOnce(Symbol('cancel'));
      (p.isCancel as unknown as jest.Mock).mockReturnValueOnce(false).mockReturnValueOnce(true);

      await interactiveMode(2);

      expect(cleanupCommand).toHaveBeenCalledWith({ days: '30' });
    });
  });

  describe('Error handling', () => {
    it('should handle ESC cancellation', async () => {
      (PathUtils.isProjectManaged as jest.Mock).mockResolvedValue(false);
      (p.select as jest.Mock).mockResolvedValueOnce('setup').mockResolvedValueOnce(Symbol('cancel'));
      (p.isCancel as unknown as jest.Mock).mockReturnValueOnce(false).mockReturnValueOnce(true);
      (setupCommand as jest.Mock).mockRejectedValue(new Error('ESC_CANCELLED'));

      await interactiveMode(2);

      expect(p.log.info).toHaveBeenCalledWith(
        '[YELLOW]Operation cancelled, returning to main menu[/YELLOW]'
      );
    });

    it('should handle other errors gracefully', async () => {
      (PathUtils.isProjectManaged as jest.Mock).mockResolvedValue(false);
      (p.select as jest.Mock).mockResolvedValueOnce('setup').mockResolvedValueOnce(Symbol('cancel'));
      (p.isCancel as unknown as jest.Mock).mockReturnValueOnce(false).mockReturnValueOnce(true);
      (setupCommand as jest.Mock).mockRejectedValue(new Error('Some other error'));

      await interactiveMode(2);

      expect(console.error).toHaveBeenCalledWith(
        '[RED]\nError: Some other error[/RED]'
      );
    });

    it('should continue loop after error', async () => {
      (PathUtils.isProjectManaged as jest.Mock).mockResolvedValue(false);
      (p.select as jest.Mock)
        .mockResolvedValueOnce('setup')
        .mockResolvedValueOnce(Symbol('cancel'));
      (p.isCancel as unknown as jest.Mock)
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(true);
      (setupCommand as jest.Mock).mockRejectedValue(new Error('Test error'));

      await interactiveMode(2);

      expect(p.select).toHaveBeenCalledTimes(2); // Should loop back after error
    });
  });

  describe('Context awareness', () => {
    it('should change menu options when project status changes', async () => {
      // First call: unmanaged project
      (PathUtils.isProjectManaged as jest.Mock)
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(true); // Second call: managed project
      
      (p.select as jest.Mock)
        .mockResolvedValueOnce('setup')
        .mockResolvedValueOnce(Symbol('cancel'));
      (p.isCancel as unknown as jest.Mock)
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(true);
      (setupCommand as jest.Mock).mockResolvedValue(undefined);

      await interactiveMode(2);

      // Should check project status twice
      expect(PathUtils.isProjectManaged).toHaveBeenCalledTimes(2);
      
      // First call should show unmanaged options
      expect(p.select).toHaveBeenNthCalledWith(1, {
        message: 'What would you like to do?',
        options: expect.arrayContaining([
          { value: 'setup', label: '🚀 Setup current project' }
        ])
      });
      
      // Second call should show managed options
      expect(p.select).toHaveBeenNthCalledWith(2, {
        message: 'What would you like to do?',
        options: expect.arrayContaining([
          { value: 'status', label: '📊 Show status' }
        ])
      });
    });

    it('should wrap command execution with ESC cancellable promise', async () => {
      (PathUtils.isProjectManaged as jest.Mock).mockResolvedValue(false);
      (p.select as jest.Mock).mockResolvedValueOnce('setup').mockResolvedValueOnce(Symbol('cancel'));
      (p.isCancel as unknown as jest.Mock).mockReturnValueOnce(false).mockReturnValueOnce(true);

      await interactiveMode(2);

      expect(createESCCancellablePromise).toHaveBeenCalledWith(
        expect.any(Promise)
      );
    });
  });

  describe('Menu option validation', () => {
    it('should not show managed options for unmanaged projects', async () => {
      (PathUtils.isProjectManaged as jest.Mock).mockResolvedValue(false);
      (p.select as jest.Mock).mockResolvedValue(Symbol('cancel'));
      (p.isCancel as unknown as jest.Mock).mockReturnValue(true);

      await interactiveMode();

      expect(p.select).toHaveBeenCalledWith({
        message: 'What would you like to do?',
        options: expect.not.arrayContaining([
          expect.objectContaining({ value: 'status' }),
          expect.objectContaining({ value: 'update' }),
          expect.objectContaining({ value: 'unlink' })
        ])
      });
    });

    it('should not show unmanaged options for managed projects', async () => {
      (PathUtils.isProjectManaged as jest.Mock).mockResolvedValue(true);
      (p.select as jest.Mock).mockResolvedValue(Symbol('cancel'));
      (p.isCancel as unknown as jest.Mock).mockReturnValue(true);

      await interactiveMode();

      expect(p.select).toHaveBeenCalledWith({
        message: 'What would you like to do?',
        options: expect.not.arrayContaining([
          expect.objectContaining({ value: 'setup' }),
          expect.objectContaining({ value: 'list' }),
          expect.objectContaining({ value: 'install' })
        ])
      });
    });
  });

  describe('Loop behavior', () => {
    it('should continue infinite loop until cancelled', async () => {
      (PathUtils.isProjectManaged as jest.Mock).mockResolvedValue(false);
      (p.select as jest.Mock)
        .mockResolvedValueOnce('setup')
        .mockResolvedValueOnce('validate')
        .mockResolvedValueOnce(Symbol('cancel'));
      (p.isCancel as unknown as jest.Mock)
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(true);
      (setupCommand as jest.Mock).mockResolvedValue(undefined);
      (validateCommand as jest.Mock).mockResolvedValue(undefined);

      await interactiveMode(3);

      expect(setupCommand).toHaveBeenCalled();
      expect(validateCommand).toHaveBeenCalled();
      expect(p.select).toHaveBeenCalledTimes(3);
    });

    it('should re-check project status on each loop iteration', async () => {
      (PathUtils.isProjectManaged as jest.Mock).mockResolvedValue(false);
      (p.select as jest.Mock)
        .mockResolvedValueOnce('setup')
        .mockResolvedValueOnce(Symbol('cancel'));
      (p.isCancel as unknown as jest.Mock)
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(true);
      (setupCommand as jest.Mock).mockResolvedValue(undefined);

      await interactiveMode(2);

      expect(PathUtils.isProjectManaged).toHaveBeenCalledTimes(2);
    });
  });
});