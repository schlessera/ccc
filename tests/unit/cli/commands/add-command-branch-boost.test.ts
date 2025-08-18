import { addCommandCommand } from '../../../../src/cli/commands/add-command';
import { PathUtils } from '../../../../src/utils/paths';
import { CommandLoader } from '../../../../src/core/commands/loader';
import * as p from '@clack/prompts';
import * as fs from 'fs-extra';

// Mock dependencies
jest.mock('../../../../src/utils/paths');
jest.mock('../../../../src/core/commands/loader');
jest.mock('@clack/prompts');
jest.mock('fs-extra');

const mockPathUtils = PathUtils as jest.Mocked<typeof PathUtils>;
const mockCommandLoader = CommandLoader as jest.MockedClass<typeof CommandLoader>;
const mockPrompts = p as jest.Mocked<typeof p>;
const mockFs = fs as jest.Mocked<typeof fs>;

describe('Add Command Branch Coverage Boost', () => {
  let mockLoader: jest.Mocked<CommandLoader>;
  let mockExit: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock process.exit globally for all tests
    mockExit = jest.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    
    mockLoader = {
      loadCommands: jest.fn(),
      getCommand: jest.fn(),
    } as any;
    
    mockCommandLoader.mockImplementation(() => mockLoader);
    mockPathUtils.isProjectManaged.mockResolvedValue(true);
    mockPathUtils.exists.mockResolvedValue(false);
    (mockFs.ensureDir as any).mockResolvedValue(undefined);
    (mockFs.writeFile as any).mockResolvedValue(undefined);
    (mockFs.readFile as any).mockResolvedValue('existing content');
    mockPrompts.spinner.mockReturnValue({
      start: jest.fn(),
      stop: jest.fn(),
    } as any);
    mockPrompts.note.mockImplementation(() => {});
    mockPrompts.outro.mockImplementation(() => {});
  });

  afterEach(() => {
    mockExit.mockRestore();
  });

  describe('Branch Coverage: Cancellation paths', () => {
    it('should hit command selection cancellation (lines 97-98)', async () => {
      mockLoader.loadCommands.mockResolvedValue([
        { name: 'test-cmd', description: 'Test', content: 'test' }
      ]);
      mockPrompts.select.mockResolvedValue(Symbol.for('clack:cancel'));
      mockPrompts.isCancel.mockReturnValue(true);

      await addCommandCommand({});

      expect(mockPrompts.outro).toHaveBeenCalledWith('Command installation cancelled');
    });

    it('should hit name cancellation (lines 118-119)', async () => {
      mockLoader.loadCommands.mockResolvedValue([]);
      mockPrompts.select.mockResolvedValue('custom');
      mockPrompts.text.mockResolvedValue(Symbol.for('clack:cancel'));
      mockPrompts.isCancel
        .mockReturnValueOnce(false) // for select
        .mockReturnValueOnce(true); // for name input

      await addCommandCommand({});

      expect(mockPrompts.outro).toHaveBeenCalledWith('Command creation cancelled');
    });

    it('should hit description cancellation (lines 128-129)', async () => {
      mockLoader.loadCommands.mockResolvedValue([]);
      mockPrompts.select.mockResolvedValue('custom');
      
      mockPrompts.text
        .mockResolvedValueOnce('test-command') // name
        .mockResolvedValueOnce(Symbol.for('clack:cancel')); // description
      
      mockPrompts.isCancel
        .mockReturnValueOnce(false) // for select
        .mockReturnValueOnce(false) // for name
        .mockReturnValueOnce(true); // for description

      await addCommandCommand({});

      expect(mockPrompts.outro).toHaveBeenCalledWith('Command creation cancelled');
    });

    it('should hit allowedTools cancellation (lines 139-140)', async () => {
      mockLoader.loadCommands.mockResolvedValue([]);
      mockPrompts.select.mockResolvedValue('custom');
      
      mockPrompts.text
        .mockResolvedValueOnce('test-command') // name
        .mockResolvedValueOnce('desc') // description
        .mockResolvedValueOnce(Symbol.for('clack:cancel')); // allowedTools
      
      mockPrompts.isCancel
        .mockReturnValueOnce(false) // for select
        .mockReturnValueOnce(false) // for name
        .mockReturnValueOnce(false) // for description
        .mockReturnValueOnce(true); // for allowedTools

      await addCommandCommand({});

      expect(mockPrompts.outro).toHaveBeenCalledWith('Command creation cancelled');
    });

    it('should hit argumentHint cancellation (lines 150-151)', async () => {
      mockLoader.loadCommands.mockResolvedValue([]);
      mockPrompts.select.mockResolvedValue('custom');
      
      mockPrompts.text
        .mockResolvedValueOnce('test-command') // name
        .mockResolvedValueOnce('desc') // description
        .mockResolvedValueOnce('tools') // allowedTools
        .mockResolvedValueOnce(Symbol.for('clack:cancel')); // argumentHint
      
      mockPrompts.isCancel
        .mockReturnValueOnce(false) // for select
        .mockReturnValueOnce(false) // for name
        .mockReturnValueOnce(false) // for description
        .mockReturnValueOnce(false) // for allowedTools
        .mockReturnValueOnce(true); // for argumentHint

      await addCommandCommand({});

      expect(mockPrompts.outro).toHaveBeenCalledWith('Command creation cancelled');
    });

    it('should hit content cancellation (lines 164-165)', async () => {
      mockLoader.loadCommands.mockResolvedValue([]);
      mockPrompts.select.mockResolvedValue('custom');
      
      mockPrompts.text
        .mockResolvedValueOnce('test-command') // name
        .mockResolvedValueOnce('desc') // description
        .mockResolvedValueOnce('tools') // allowedTools
        .mockResolvedValueOnce('hint') // argumentHint
        .mockResolvedValueOnce(Symbol.for('clack:cancel')); // content
      
      mockPrompts.isCancel
        .mockReturnValueOnce(false) // for select
        .mockReturnValueOnce(false) // for name
        .mockReturnValueOnce(false) // for description
        .mockReturnValueOnce(false) // for allowedTools
        .mockReturnValueOnce(false) // for argumentHint
        .mockReturnValueOnce(true); // for content

      await addCommandCommand({});

      expect(mockPrompts.outro).toHaveBeenCalledWith('Command creation cancelled');
    });
  });

  describe('Branch Coverage: Validation paths', () => {
    it('should hit validation error branches (lines 109-113, 158-159)', async () => {
      mockLoader.loadCommands.mockResolvedValue([]);
      mockPrompts.select.mockResolvedValue('custom');
      mockPrompts.isCancel.mockReturnValue(false);
      
      mockPrompts.text
        .mockResolvedValueOnce('valid-name')
        .mockResolvedValueOnce('desc')
        .mockResolvedValueOnce('tools')
        .mockResolvedValueOnce('hint')
        .mockResolvedValueOnce('content');

      await addCommandCommand({});

      const nameValidator = mockPrompts.text.mock.calls[0][0].validate;
      expect(nameValidator!('')).toBe('Command name is required');
      expect(nameValidator!('INVALID_NAME')).toBe('Use lowercase letters, numbers, and hyphens only');
      expect(nameValidator!('valid-name')).toBeUndefined();

      const contentValidator = mockPrompts.text.mock.calls[4][0].validate;
      expect(contentValidator!('')).toBe('Content is required');
      expect(contentValidator!('valid content')).toBeUndefined();
    });
  });

  describe('Branch Coverage: File handling paths', () => {
    it('should hit existing file with different content - no overwrite branch', async () => {
      const command = {
        name: 'test-command',
        description: 'Test command',
        content: 'test content'
      };
      
      mockLoader.getCommand.mockResolvedValue(command);
      mockPathUtils.exists.mockResolvedValue(true);
      (mockFs.readFile as any).mockResolvedValue('different content');
      mockPrompts.confirm.mockResolvedValue(false);
      mockPrompts.isCancel.mockReturnValue(false);

      await addCommandCommand({ command: 'test-command' });

      expect(mockPrompts.confirm).toHaveBeenCalledWith({
        message: expect.stringContaining('already exists with different content'),
        initialValue: false
      });
      expect(mockPrompts.note).toHaveBeenCalledWith(
        expect.stringContaining('Using existing command file'),
        expect.any(String)
      );
    });

    it('should hit existing file with different content - overwrite cancellation', async () => {
      const command = {
        name: 'test-command',
        description: 'Test command',
        content: 'test content'
      };
      
      mockLoader.getCommand.mockResolvedValue(command);
      mockPathUtils.exists.mockResolvedValue(true);
      (mockFs.readFile as any).mockResolvedValue('different content');
      mockPrompts.confirm.mockResolvedValue(Symbol.for('clack:cancel'));
      mockPrompts.isCancel.mockReturnValue(true);

      await addCommandCommand({ command: 'test-command' });

      expect(mockPrompts.note).toHaveBeenCalledWith(
        expect.stringContaining('Using existing command file'),
        expect.any(String)
      );
    });

    it('should hit no actions taken branch (line 251)', async () => {
      const command = {
        name: 'test-command',
        description: 'Test command',
        content: 'test content'
      };
      
      mockLoader.getCommand.mockResolvedValue(command);
      mockPathUtils.exists.mockResolvedValue(true);
      const expectedContent = `---\ndescription: Test command\n---\n\ntest content`;
      (mockFs.readFile as any).mockResolvedValue(expectedContent);

      await addCommandCommand({ command: 'test-command' });

      expect(mockPrompts.note).toHaveBeenCalledWith(
        expect.stringContaining('Verified existing installation'),
        expect.any(String)
      );
    });

    it('should hit warnings display branch (line 256)', async () => {
      const command = {
        name: 'test-command',
        description: 'Test command',
        content: 'test content'
      };
      
      mockLoader.getCommand.mockResolvedValue(command);
      mockPathUtils.exists.mockResolvedValue(true);
      const expectedContent = `---\ndescription: Test command\n---\n\ntest content`;
      (mockFs.readFile as any).mockResolvedValue(expectedContent);

      await addCommandCommand({ command: 'test-command' });

      expect(mockPrompts.note).toHaveBeenCalledWith(
        expect.stringContaining('already exists with correct content'),
        expect.stringContaining('Warnings')
      );
    });
  });

  describe('Branch Coverage: Command properties', () => {
    it('should handle command with all optional properties', async () => {
      mockLoader.loadCommands.mockResolvedValue([]);
      mockPrompts.select.mockResolvedValue('custom');
      mockPrompts.isCancel.mockReturnValue(false);
      
      mockPrompts.text
        .mockResolvedValueOnce('test-command')
        .mockResolvedValueOnce('Test description')
        .mockResolvedValueOnce('Bash,Read,Write')
        .mockResolvedValueOnce('file path')
        .mockResolvedValueOnce('echo {$ARGUMENTS}');

      await addCommandCommand({});

      expect(mockFs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('test-command.md'),
        expect.stringContaining('description: Test description'),
        'utf-8'
      );
    });

    it('should handle command with minimal properties (no frontmatter)', async () => {
      const command = {
        name: 'minimal-command',
        content: 'echo "hello"'
      };
      
      mockLoader.getCommand.mockResolvedValue(command);
      
      await addCommandCommand({ command: 'minimal-command' });

      expect(mockFs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('minimal-command.md'),
        'echo "hello"',
        'utf-8'
      );
    });
  });

  describe('Branch Coverage: Edge cases', () => {
    it('should handle empty commands list for selection', async () => {
      mockLoader.loadCommands.mockResolvedValue([]);
      mockPrompts.select.mockResolvedValue('custom');
      mockPrompts.isCancel.mockReturnValue(false);
      
      mockPrompts.text
        .mockResolvedValueOnce('test-command')
        .mockResolvedValueOnce('desc')
        .mockResolvedValueOnce('tools')
        .mockResolvedValueOnce('hint')
        .mockResolvedValueOnce('content');

      await addCommandCommand({});

      expect(mockPrompts.select).toHaveBeenCalledWith({
        message: 'Select a command to add',
        options: [
          {
            value: 'custom',
            label: '✨ Create custom command',
            hint: 'Define your own command'
          }
        ]
      });
    });

    it('should handle command with empty string properties', async () => {
      mockLoader.loadCommands.mockResolvedValue([]);
      mockPrompts.select.mockResolvedValue('custom');
      mockPrompts.isCancel.mockReturnValue(false);
      
      mockPrompts.text
        .mockResolvedValueOnce('test-command')
        .mockResolvedValueOnce('') // description (empty)
        .mockResolvedValueOnce('') // allowedTools (empty)
        .mockResolvedValueOnce('') // argumentHint (empty)
        .mockResolvedValueOnce('echo test');

      await addCommandCommand({});

      expect(mockFs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('test-command.md'),
        'echo test', // No frontmatter due to empty fields
        'utf-8'
      );
    });
  });
});