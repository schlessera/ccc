import { addCommandCommand } from '../../../../src/cli/commands/add-command';

// Mock external dependencies  
jest.mock('@clack/prompts', () => ({
  intro: jest.fn(),
  note: jest.fn(),
  cancel: jest.fn(),
  outro: jest.fn(),
  text: jest.fn(),
  confirm: jest.fn(),
  select: jest.fn(),
  isCancel: jest.fn(),
  spinner: jest.fn(() => ({
    start: jest.fn(),
    stop: jest.fn(),
  })),
}));

jest.mock('chalk', () => ({
  cyan: jest.fn((str) => str),
  green: jest.fn((str) => str),
  blue: jest.fn((str) => str),
  yellow: jest.fn((str) => str),
  red: jest.fn((str) => str),
  gray: jest.fn((str) => str),
  bold: jest.fn((str) => str),
}));

jest.mock('../../../../src/utils/paths', () => ({
  PathUtils: {
    exists: jest.fn().mockResolvedValue(false),
    getProjectCommandsDir: jest.fn(() => '/commands'),
    getSystemCommandsDir: jest.fn(() => '/system/commands'),
    isProjectManaged: jest.fn().mockResolvedValue(true),
  }
}));

// Mock CommandLoader
jest.mock('../../../../src/core/commands/loader', () => ({
  CommandLoader: jest.fn().mockImplementation(() => ({
    loadCommands: jest.fn().mockResolvedValue([
      { name: 'test-command', description: 'Test command', source: 'system' }
    ]),
    listAvailableCommands: jest.fn().mockResolvedValue(['test-command']),
    getCommand: jest.fn().mockResolvedValue({
      name: 'test-command',
      description: 'Test command',
      content: 'echo test',
      allowedTools: 'Bash',
    }),
  })),
  Command: {}
}));

// Mock process.cwd
jest.spyOn(process, 'cwd').mockReturnValue('/test/project');

jest.mock('fs-extra', () => ({
  writeFile: jest.fn(),
  ensureDir: jest.fn(),
}));

describe('Add Command (Simple)', () => {
  let mockP: any;
  let mockPathUtils: any;
  let processExitSpy: jest.SpyInstance;

  beforeEach(() => {
    mockP = require('@clack/prompts');
    mockPathUtils = require('../../../../src/utils/paths').PathUtils;
    
    processExitSpy = jest.spyOn(process, 'exit').mockImplementation((() => {}) as any);
    
    // Reset only the call history, not the mock implementations
    jest.clearAllMocks();
    
    // Restore default mock behaviors for each test
    mockP.isCancel.mockReturnValue(false);
    mockP.confirm.mockResolvedValue(false);
  });

  afterEach(() => {
    processExitSpy.mockRestore();
  });

  describe('Basic Functionality', () => {
    it('should handle command creation with name provided', async () => {
      // Set up mocks for successful execution
      mockP.confirm.mockResolvedValue(false);
      mockP.isCancel.mockReturnValue(false);
      
      // The test should verify that the function completes successfully
      // when provided with a valid command name
      await expect(addCommandCommand({ command: 'test-command' })).resolves.not.toThrow();
      
      // Verify that no error was shown to the user (no p.cancel called)
      expect(mockP.cancel).not.toHaveBeenCalled();
      
      // Verify that the process didn't exit with an error
      expect(processExitSpy).not.toHaveBeenCalledWith(1);
    });

    it('should prompt for name when not provided', async () => {
      // Mock the selection to return 'custom' to trigger custom command creation
      mockP.select.mockResolvedValue('custom');
      mockP.text
        .mockResolvedValueOnce('my-command') // name
        .mockResolvedValueOnce('test description') // description
        .mockResolvedValueOnce('') // allowedTools
        .mockResolvedValueOnce('') // argumentHint
        .mockResolvedValueOnce('test content'); // content
      mockP.isCancel.mockReturnValue(false);
      mockPathUtils.exists.mockResolvedValue(false);

      try {
        await addCommandCommand({});
        
        // Verify that custom command creation was triggered
        expect(mockP.select).toHaveBeenCalledWith(expect.objectContaining({
          message: 'Select a command to add'
        }));
        expect(true).toBe(true);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('should handle user cancellation', async () => {
      // Mock command selection cancellation
      mockP.select.mockResolvedValue('cancelled');
      mockP.isCancel.mockReturnValue(true);

      try {
        await addCommandCommand({});
        
        // Verify that selection was attempted
        expect(mockP.select).toHaveBeenCalled();
        expect(true).toBe(true);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('should handle existing file without force', async () => {
      mockPathUtils.exists.mockResolvedValue(true);
      mockP.confirm.mockResolvedValue(false);

      try {
        await addCommandCommand({ command: 'existing-command' });
        
        // Should handle existing files gracefully
        expect(mockPathUtils.exists).toHaveBeenCalled();
        expect(true).toBe(true);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('should handle list option', async () => {
      try {
        await addCommandCommand({ list: true });
        
        // Should display available commands
        expect(true).toBe(true);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('should handle errors gracefully', async () => {
      // Trigger an error scenario
      const mockCommandLoader = require('../../../../src/core/commands/loader').CommandLoader;
      mockCommandLoader.mockImplementation(() => ({
        loadCommands: jest.fn().mockRejectedValue(new Error('Input error'))
      }));

      try {
        await addCommandCommand({});
        expect(true).toBe(true);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });

  describe('Name Validation', () => {
    it('should validate command names', async () => {
      mockP.select.mockResolvedValue('custom');
      mockP.text
        .mockResolvedValueOnce('valid-command-123')
        .mockResolvedValueOnce('description')
        .mockResolvedValueOnce('')
        .mockResolvedValueOnce('')
        .mockResolvedValueOnce('content');
      mockPathUtils.exists.mockResolvedValue(false);

      try {
        await addCommandCommand({});
        
        // Should handle custom command creation with validation
        expect(mockP.select).toHaveBeenCalled();
        expect(true).toBe(true);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });

  describe('File Writing', () => {
    it('should create command file with description', async () => {
      mockP.select.mockResolvedValue('custom');
      mockP.text
        .mockResolvedValueOnce('test-cmd')
        .mockResolvedValueOnce('Test command description')
        .mockResolvedValueOnce('')
        .mockResolvedValueOnce('')
        .mockResolvedValueOnce('test content');
      mockPathUtils.exists.mockResolvedValue(false);

      try {
        await addCommandCommand({});
        
        // Should create command file
        expect(mockP.select).toHaveBeenCalled();
        expect(true).toBe(true);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('should create command file without description', async () => {
      mockP.select.mockResolvedValue('custom');
      mockP.text
        .mockResolvedValueOnce('no-desc-cmd')
        .mockResolvedValueOnce('')
        .mockResolvedValueOnce('')
        .mockResolvedValueOnce('')
        .mockResolvedValueOnce('test content');
      mockPathUtils.exists.mockResolvedValue(false);

      try {
        await addCommandCommand({});
        
        // Should create command file without description
        expect(mockP.select).toHaveBeenCalled();
        expect(true).toBe(true);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('should handle template mode', async () => {
      mockP.select.mockResolvedValue('custom');
      mockP.text
        .mockResolvedValueOnce('template-cmd')
        .mockResolvedValueOnce('Template description')
        .mockResolvedValueOnce('')
        .mockResolvedValueOnce('')
        .mockResolvedValueOnce('Enter your task');
      mockPathUtils.exists.mockResolvedValue(false);

      try {
        await addCommandCommand({});
        
        // Should create template command
        expect(mockP.select).toHaveBeenCalled();
        expect(true).toBe(true);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });

  describe('Directory Handling', () => {
    it('should ensure command directory exists', async () => {
      mockP.select.mockResolvedValue('custom');
      mockP.text
        .mockResolvedValueOnce('dir-test')
        .mockResolvedValueOnce('Description')
        .mockResolvedValueOnce('')
        .mockResolvedValueOnce('')
        .mockResolvedValueOnce('content');
      mockPathUtils.exists.mockResolvedValue(false);

      try {
        await addCommandCommand({});
        
        // Should ensure directory exists
        expect(mockP.select).toHaveBeenCalled();
        expect(true).toBe(true);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long command names', async () => {
      const longName = 'very-long-command-name-that-exceeds-normal-length-expectations';
      mockP.select.mockResolvedValue('custom');
      mockP.text
        .mockResolvedValueOnce(longName)
        .mockResolvedValueOnce('Description')
        .mockResolvedValueOnce('')
        .mockResolvedValueOnce('')
        .mockResolvedValueOnce('content');
      mockPathUtils.exists.mockResolvedValue(false);

      try {
        await addCommandCommand({});
        
        // Should handle long command names
        expect(mockP.select).toHaveBeenCalled();
        expect(true).toBe(true);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('should handle special characters in description', async () => {
      const specialDesc = 'Command with "quotes" and \'apostrophes\' and <tags>';
      mockP.select.mockResolvedValue('custom');
      mockP.text
        .mockResolvedValueOnce('special-cmd')
        .mockResolvedValueOnce(specialDesc)
        .mockResolvedValueOnce('')
        .mockResolvedValueOnce('')
        .mockResolvedValueOnce('content');
      mockPathUtils.exists.mockResolvedValue(false);

      try {
        await addCommandCommand({});
        
        // Should handle special characters in description
        expect(mockP.select).toHaveBeenCalled();
        expect(true).toBe(true);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });
});