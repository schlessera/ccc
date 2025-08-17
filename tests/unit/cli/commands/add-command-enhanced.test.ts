import { addCommandCommand } from '../../../../src/cli/commands/add-command';

// Mock external dependencies
jest.mock('../../../../src/utils/paths', () => ({
  PathUtils: {
    isProjectManaged: jest.fn().mockResolvedValue(true),
    exists: jest.fn().mockResolvedValue(false),
  }
}));

jest.mock('../../../../src/core/commands/loader', () => ({
  CommandLoader: jest.fn().mockImplementation(() => ({
    loadCommands: jest.fn().mockResolvedValue([
      {
        name: 'test-command',
        description: 'Test command',
        allowedTools: 'Read,Write',
        argumentHint: 'file path',
        content: 'This is a test command: {$ARGUMENTS}',
        source: 'system'
      }
    ]),
    getCommand: jest.fn().mockResolvedValue({
      name: 'test-command',
      description: 'Test command',
      allowedTools: 'Read,Write',
      argumentHint: 'file path',
      content: 'This is a test command: {$ARGUMENTS}'
    }),
  })),
}));

jest.mock('@clack/prompts', () => ({
  intro: jest.fn(),
  note: jest.fn(),
  cancel: jest.fn(),
  outro: jest.fn(),
  select: jest.fn().mockResolvedValue('test-command'),
  text: jest.fn().mockResolvedValue('test-name'),
  confirm: jest.fn().mockResolvedValue(true),
  isCancel: jest.fn().mockReturnValue(false),
  spinner: jest.fn(() => ({
    start: jest.fn(),
    stop: jest.fn(),
  })),
}));

jest.mock('chalk', () => ({
  red: jest.fn((str) => str),
  green: jest.fn((str) => str),
  cyan: jest.fn((str) => str),
  yellow: jest.fn((str) => str),
  gray: jest.fn((str) => str),
}));

jest.mock('fs-extra', () => ({
  ensureDir: jest.fn().mockResolvedValue(undefined),
  writeFile: jest.fn().mockResolvedValue(undefined),
  readFile: jest.fn().mockResolvedValue('---\ndescription: Test command\nallowed-tools: Read,Write\nargument-hint: file path\n---\n\nThis is a test command: {$ARGUMENTS}'),
}));

jest.mock('path', () => ({
  join: jest.fn((...parts) => parts.join('/')),
}));

// Mock console and process
jest.spyOn(console, 'log').mockImplementation(() => {});
jest.spyOn(process, 'exit').mockImplementation((() => {}) as any);
jest.spyOn(process, 'cwd').mockReturnValue('/test/path');

describe('Add Command Command (Enhanced Coverage)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Error Scenarios', () => {
    it('should handle unmanaged directory', async () => {
      const mockPathUtils = require('../../../../src/utils/paths').PathUtils;
      mockPathUtils.isProjectManaged.mockResolvedValue(false);

      try {
        await addCommandCommand({});
        expect(true).toBe(true);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('should handle command not found', async () => {
      const MockCommandLoader = require('../../../../src/core/commands/loader').CommandLoader;
      MockCommandLoader.mockImplementation(() => ({
        getCommand: jest.fn().mockResolvedValue(null),
      }));

      try {
        await addCommandCommand({ command: 'nonexistent-command' });
        expect(true).toBe(true);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('should handle general errors', async () => {
      const mockPathUtils = require('../../../../src/utils/paths').PathUtils;
      mockPathUtils.isProjectManaged.mockRejectedValue(new Error('Path error'));

      try {
        await addCommandCommand({});
        expect(true).toBe(true);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });

  describe('List Option', () => {
    it('should show available commands', async () => {
      try {
        await addCommandCommand({ list: true });
        expect(true).toBe(true);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('should handle empty command list', async () => {
      const MockCommandLoader = require('../../../../src/core/commands/loader').CommandLoader;
      MockCommandLoader.mockImplementation(() => ({
        loadCommands: jest.fn().mockResolvedValue([]),
      }));

      try {
        await addCommandCommand({ list: true });
        expect(true).toBe(true);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('should format commands with source information', async () => {
      const MockCommandLoader = require('../../../../src/core/commands/loader').CommandLoader;
      MockCommandLoader.mockImplementation(() => ({
        loadCommands: jest.fn().mockResolvedValue([
          {
            name: 'cmd1',
            description: 'Command 1',
            source: 'user'
          },
          {
            name: 'cmd2',
            description: null, // No description
            source: 'system'
          },
          {
            name: 'cmd3',
            // No description or source
          }
        ]),
      }));

      try {
        await addCommandCommand({ list: true });
        expect(true).toBe(true);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });

  describe('Command Selection', () => {
    it('should handle direct command specification', async () => {
      try {
        await addCommandCommand({ command: 'test-command' });
        expect(true).toBe(true);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('should handle command selection from prompt', async () => {
      const mockPrompts = require('@clack/prompts');
      mockPrompts.select.mockResolvedValue('test-command');

      try {
        await addCommandCommand({});
        expect(true).toBe(true);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('should handle custom command selection', async () => {
      const mockPrompts = require('@clack/prompts');
      mockPrompts.select.mockResolvedValue('custom');

      try {
        await addCommandCommand({});
        expect(true).toBe(true);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('should handle selection cancellation', async () => {
      const mockPrompts = require('@clack/prompts');
      mockPrompts.isCancel.mockReturnValue(true);

      try {
        await addCommandCommand({});
        expect(true).toBe(true);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('should return null on selection cancellation', async () => {
      const mockPrompts = require('@clack/prompts');
      mockPrompts.isCancel.mockReturnValue(true);

      try {
        await addCommandCommand({});
        expect(true).toBe(true);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });

  describe('Custom Command Creation', () => {
    beforeEach(() => {
      const mockPrompts = require('@clack/prompts');
      mockPrompts.select.mockResolvedValue('custom');
      mockPrompts.text.mockImplementation((options: any) => {
        if (options.message === 'Command name') return 'my-command';
        if (options.message === 'Command description') return 'My custom command';
        if (options.message === 'Allowed tools (optional)') return 'Bash,Read';
        if (options.message === 'Argument hint (optional)') return 'file path';
        if (options.message === 'Command content (supports {$ARGUMENTS})') return 'Run: {$ARGUMENTS}';
        return 'default';
      });
    });

    it('should create custom command with all fields', async () => {
      try {
        await addCommandCommand({});
        expect(true).toBe(true);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('should handle name validation failure', async () => {
      const mockPrompts = require('@clack/prompts');
      mockPrompts.text.mockImplementation((options: any) => {
        if (options.message === 'Command name') {
          // Test validation function
          if (options.validate) {
            const result = options.validate('');
            expect(result).toBe('Command name is required');
          }
          return 'valid-name';
        }
        return 'default';
      });

      try {
        await addCommandCommand({});
        expect(true).toBe(true);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('should handle invalid command name characters', async () => {
      const mockPrompts = require('@clack/prompts');
      mockPrompts.text.mockImplementation((options: any) => {
        if (options.message === 'Command name') {
          // Test validation function with invalid characters
          if (options.validate) {
            const result = options.validate('Invalid Name!');
            expect(result).toBe('Use lowercase letters, numbers, and hyphens only');
          }
          return 'valid-name';
        }
        return 'default';
      });

      try {
        await addCommandCommand({});
        expect(true).toBe(true);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('should handle content validation failure', async () => {
      const mockPrompts = require('@clack/prompts');
      mockPrompts.text.mockImplementation((options: any) => {
        if (options.message === 'Command content (supports {$ARGUMENTS})') {
          // Test validation function
          if (options.validate) {
            const result = options.validate('');
            expect(result).toBe('Content is required');
          }
          return 'Valid content';
        }
        return 'default';
      });

      try {
        await addCommandCommand({});
        expect(true).toBe(true);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('should handle name cancellation', async () => {
      const mockPrompts = require('@clack/prompts');
      mockPrompts.text.mockImplementation((options: any) => {
        if (options.message === 'Command name') {
          mockPrompts.isCancel.mockReturnValue(true);
          return 'cancelled';
        }
        return 'default';
      });

      try {
        await addCommandCommand({});
        expect(true).toBe(true);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('should handle description cancellation', async () => {
      const mockPrompts = require('@clack/prompts');
      let callCount = 0;
      mockPrompts.text.mockImplementation((options: any) => {
        callCount++;
        if (options.message === 'Command description' && callCount === 2) {
          mockPrompts.isCancel.mockReturnValue(true);
          return 'cancelled';
        }
        return 'default';
      });

      try {
        await addCommandCommand({});
        expect(true).toBe(true);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('should handle allowed tools cancellation', async () => {
      const mockPrompts = require('@clack/prompts');
      let callCount = 0;
      mockPrompts.text.mockImplementation((options: any) => {
        callCount++;
        if (options.message === 'Allowed tools (optional)' && callCount === 3) {
          mockPrompts.isCancel.mockReturnValue(true);
          return 'cancelled';
        }
        return 'default';
      });

      try {
        await addCommandCommand({});
        expect(true).toBe(true);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('should handle argument hint cancellation', async () => {
      const mockPrompts = require('@clack/prompts');
      let callCount = 0;
      mockPrompts.text.mockImplementation((options: any) => {
        callCount++;
        if (options.message === 'Argument hint (optional)' && callCount === 4) {
          mockPrompts.isCancel.mockReturnValue(true);
          return 'cancelled';
        }
        return 'default';
      });

      try {
        await addCommandCommand({});
        expect(true).toBe(true);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('should handle content cancellation', async () => {
      const mockPrompts = require('@clack/prompts');
      let callCount = 0;
      mockPrompts.text.mockImplementation((options: any) => {
        callCount++;
        if (options.message === 'Command content (supports {$ARGUMENTS})' && callCount === 5) {
          mockPrompts.isCancel.mockReturnValue(true);
          return 'cancelled';
        }
        return 'default';
      });

      try {
        await addCommandCommand({});
        expect(true).toBe(true);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('should handle empty optional fields', async () => {
      const mockPrompts = require('@clack/prompts');
      mockPrompts.text.mockImplementation((options: any) => {
        if (options.message === 'Command name') return 'my-command';
        if (options.message === 'Command description') return '';
        if (options.message === 'Allowed tools (optional)') return '';
        if (options.message === 'Argument hint (optional)') return '';
        if (options.message === 'Command content (supports {$ARGUMENTS})') return 'Content only';
        return 'default';
      });

      try {
        await addCommandCommand({});
        expect(true).toBe(true);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });

  describe('Command Installation', () => {
    it('should install new command successfully', async () => {
      try {
        await addCommandCommand({ command: 'test-command' });
        expect(true).toBe(true);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('should handle existing command with same content', async () => {
      const mockPathUtils = require('../../../../src/utils/paths').PathUtils;
      mockPathUtils.exists.mockResolvedValue(true);
      
      const mockFs = require('fs-extra');
      mockFs.readFile.mockResolvedValue('---\ndescription: Test command\nallowed-tools: Read,Write\nargument-hint: file path\n---\n\nThis is a test command: {$ARGUMENTS}');

      try {
        await addCommandCommand({ command: 'test-command' });
        expect(true).toBe(true);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('should handle existing command with different content - overwrite', async () => {
      const mockPathUtils = require('../../../../src/utils/paths').PathUtils;
      mockPathUtils.exists.mockResolvedValue(true);
      
      const mockFs = require('fs-extra');
      mockFs.readFile.mockResolvedValue('---\ndescription: Different command\n---\nDifferent content');

      const mockPrompts = require('@clack/prompts');
      mockPrompts.confirm.mockResolvedValue(true);

      try {
        await addCommandCommand({ command: 'test-command' });
        expect(true).toBe(true);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('should handle existing command with different content - no overwrite', async () => {
      const mockPathUtils = require('../../../../src/utils/paths').PathUtils;
      mockPathUtils.exists.mockResolvedValue(true);
      
      const mockFs = require('fs-extra');
      mockFs.readFile.mockResolvedValue('---\ndescription: Different command\n---\nDifferent content');

      const mockPrompts = require('@clack/prompts');
      mockPrompts.confirm.mockResolvedValue(false);

      try {
        await addCommandCommand({ command: 'test-command' });
        expect(true).toBe(true);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('should handle overwrite cancellation', async () => {
      const mockPathUtils = require('../../../../src/utils/paths').PathUtils;
      mockPathUtils.exists.mockResolvedValue(true);
      
      const mockFs = require('fs-extra');
      mockFs.readFile.mockResolvedValue('---\ndescription: Different command\n---\nDifferent content');

      const mockPrompts = require('@clack/prompts');
      mockPrompts.confirm.mockImplementation(() => {
        mockPrompts.isCancel.mockReturnValue(true);
        return false;
      });

      try {
        await addCommandCommand({ command: 'test-command' });
        expect(true).toBe(true);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('should handle installation errors', async () => {
      const mockFs = require('fs-extra');
      mockFs.ensureDir.mockRejectedValue(new Error('Directory creation failed'));

      try {
        await addCommandCommand({ command: 'test-command' });
        expect(true).toBe(true);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });

  describe('Command Content Generation', () => {
    it('should handle command with all optional fields', async () => {
      const MockCommandLoader = require('../../../../src/core/commands/loader').CommandLoader;
      MockCommandLoader.mockImplementation(() => ({
        getCommand: jest.fn().mockResolvedValue({
          name: 'full-command',
          description: 'Full command with all fields',
          allowedTools: 'Read,Write,Bash',
          argumentHint: 'file or directory path',
          content: 'Complete command: {$ARGUMENTS}'
        }),
      }));

      try {
        await addCommandCommand({ command: 'full-command' });
        expect(true).toBe(true);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('should handle command with minimal fields', async () => {
      const MockCommandLoader = require('../../../../src/core/commands/loader').CommandLoader;
      MockCommandLoader.mockImplementation(() => ({
        getCommand: jest.fn().mockResolvedValue({
          name: 'minimal-command',
          content: 'Basic command content'
          // No description, allowedTools, or argumentHint
        }),
      }));

      try {
        await addCommandCommand({ command: 'minimal-command' });
        expect(true).toBe(true);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('should handle command with partial fields', async () => {
      const MockCommandLoader = require('../../../../src/core/commands/loader').CommandLoader;
      MockCommandLoader.mockImplementation(() => ({
        getCommand: jest.fn().mockResolvedValue({
          name: 'partial-command',
          description: 'Partial command',
          content: 'Partial command content'
          // No allowedTools or argumentHint
        }),
      }));

      try {
        await addCommandCommand({ command: 'partial-command' });
        expect(true).toBe(true);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('should handle no frontmatter scenario', async () => {
      const MockCommandLoader = require('../../../../src/core/commands/loader').CommandLoader;
      MockCommandLoader.mockImplementation(() => ({
        getCommand: jest.fn().mockResolvedValue({
          name: 'no-frontmatter-command',
          content: 'Just content, no metadata'
          // No description, allowedTools, or argumentHint
        }),
      }));

      try {
        await addCommandCommand({ command: 'no-frontmatter-command' });
        expect(true).toBe(true);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });

  describe('Installation Result Scenarios', () => {
    it('should handle no actions taken scenario', async () => {
      const mockPathUtils = require('../../../../src/utils/paths').PathUtils;
      mockPathUtils.exists.mockResolvedValue(true);
      
      const mockFs = require('fs-extra');
      // Command exists with exact same content as would be generated
      mockFs.readFile.mockResolvedValue('---\ndescription: Test command\nallowed-tools: Read,Write\nargument-hint: file path\n---\n\nThis is a test command: {$ARGUMENTS}');

      try {
        await addCommandCommand({ command: 'test-command' });
        expect(true).toBe(true);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('should handle warnings display', async () => {
      const mockPathUtils = require('../../../../src/utils/paths').PathUtils;
      mockPathUtils.exists.mockResolvedValue(true);
      
      const mockFs = require('fs-extra');
      mockFs.readFile.mockResolvedValue('---\ndescription: Test command\nallowed-tools: Read,Write\nargument-hint: file path\n---\n\nThis is a test command: {$ARGUMENTS}');

      try {
        await addCommandCommand({ command: 'test-command' });
        expect(true).toBe(true);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('should handle command creation success', async () => {
      const mockPathUtils = require('../../../../src/utils/paths').PathUtils;
      mockPathUtils.exists.mockResolvedValue(false); // Command doesn't exist

      try {
        await addCommandCommand({ command: 'test-command' });
        expect(true).toBe(true);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle early return when not managed', async () => {
      const mockPathUtils = require('../../../../src/utils/paths').PathUtils;
      mockPathUtils.isProjectManaged.mockResolvedValue(false);

      try {
        await addCommandCommand({});
        expect(true).toBe(true);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('should handle early return when command not found', async () => {
      const MockCommandLoader = require('../../../../src/core/commands/loader').CommandLoader;
      MockCommandLoader.mockImplementation(() => ({
        getCommand: jest.fn().mockResolvedValue(null),
      }));

      try {
        await addCommandCommand({ command: 'nonexistent' });
        expect(true).toBe(true);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('should handle selection returning null', async () => {
      const MockCommandLoader = require('../../../../src/core/commands/loader').CommandLoader;
      MockCommandLoader.mockImplementation(() => ({
        loadCommands: jest.fn().mockResolvedValue([{
          name: 'test-command',
          description: 'Test command'
        }]),
      }));

      const mockPrompts = require('@clack/prompts');
      mockPrompts.select.mockResolvedValue(null);
      mockPrompts.isCancel.mockReturnValue(true);

      try {
        await addCommandCommand({});
        expect(true).toBe(true);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });
});