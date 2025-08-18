import { addHookCommand } from '../../../../src/cli/commands/add-hook';
import { PathUtils } from '../../../../src/utils/paths';
import { HookLoader } from '../../../../src/core/hooks/loader';
import * as p from '@clack/prompts';
import * as fs from 'fs-extra';

// Mock dependencies
jest.mock('../../../../src/utils/paths');
jest.mock('../../../../src/core/hooks/loader');
jest.mock('@clack/prompts');
jest.mock('fs-extra');

const mockPathUtils = PathUtils as jest.Mocked<typeof PathUtils>;
const mockHookLoader = HookLoader as jest.MockedClass<typeof HookLoader>;
const mockPrompts = p as jest.Mocked<typeof p>;
const mockFs = fs as jest.Mocked<typeof fs>;

describe('Add Hook Branch Coverage Boost', () => {
  let mockLoader: jest.Mocked<HookLoader>;
  let mockExit: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock process.exit globally for all tests
    mockExit = jest.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    
    mockLoader = {
      loadHooks: jest.fn(),
      getHook: jest.fn(),
    } as any;
    
    mockHookLoader.mockImplementation(() => mockLoader);
    mockPathUtils.isProjectManaged.mockResolvedValue(true);
    mockPathUtils.exists.mockResolvedValue(false);
    (mockFs.ensureDir as any).mockResolvedValue(undefined);
    (mockFs.writeFile as any).mockResolvedValue(undefined);
    (mockFs.readFile as any).mockResolvedValue('existing content');
    (mockFs.readJSON as any).mockResolvedValue({});
    (mockFs.writeJSON as any).mockResolvedValue(undefined);
    (mockFs.chmod as any).mockResolvedValue(undefined);
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
    it('should hit hook selection cancellation (lines 98-99)', async () => {
      mockLoader.loadHooks.mockResolvedValue([
        { name: 'test-hook', description: 'Test', eventType: 'PreToolUse', command: 'echo test' }
      ]);
      mockPrompts.select.mockResolvedValue(Symbol.for('clack:cancel'));
      mockPrompts.isCancel.mockReturnValue(true);

      await addHookCommand({});

      expect(mockPrompts.outro).toHaveBeenCalledWith('Hook installation cancelled');
    });

    it('should hit name cancellation (lines 119-120)', async () => {
      mockLoader.loadHooks.mockResolvedValue([]);
      mockPrompts.select.mockResolvedValue('custom');
      mockPrompts.text.mockResolvedValue(Symbol.for('clack:cancel'));
      mockPrompts.isCancel
        .mockReturnValueOnce(false) // for select
        .mockReturnValueOnce(true); // for name input

      await addHookCommand({});

      expect(mockPrompts.outro).toHaveBeenCalledWith('Hook creation cancelled');
    });

    it('should hit description cancellation (lines 129-130)', async () => {
      mockLoader.loadHooks.mockResolvedValue([]);
      mockPrompts.select.mockResolvedValue('custom');
      
      mockPrompts.text
        .mockResolvedValueOnce('test-hook') // name
        .mockResolvedValueOnce(Symbol.for('clack:cancel')); // description
      
      mockPrompts.isCancel
        .mockReturnValueOnce(false) // for select
        .mockReturnValueOnce(false) // for name
        .mockReturnValueOnce(true); // for description

      await addHookCommand({});

      expect(mockPrompts.outro).toHaveBeenCalledWith('Hook creation cancelled');
    });

    it('should hit eventType cancellation (lines 148-149)', async () => {
      mockLoader.loadHooks.mockResolvedValue([]);
      mockPrompts.select
        .mockResolvedValueOnce('custom') // hook selection
        .mockResolvedValueOnce(Symbol.for('clack:cancel')); // event type
      
      mockPrompts.text
        .mockResolvedValueOnce('test-hook') // name
        .mockResolvedValueOnce('desc'); // description
      
      mockPrompts.isCancel
        .mockReturnValueOnce(false) // for select
        .mockReturnValueOnce(false) // for name
        .mockReturnValueOnce(false) // for description
        .mockReturnValueOnce(true); // for eventType

      await addHookCommand({});

      expect(mockPrompts.outro).toHaveBeenCalledWith('Hook creation cancelled');
    });

    it('should hit matcher cancellation (lines 159-160)', async () => {
      mockLoader.loadHooks.mockResolvedValue([]);
      mockPrompts.select
        .mockResolvedValueOnce('custom') // hook selection
        .mockResolvedValueOnce('PreToolUse'); // event type
      
      mockPrompts.text
        .mockResolvedValueOnce('test-hook') // name
        .mockResolvedValueOnce('desc') // description
        .mockResolvedValueOnce(Symbol.for('clack:cancel')); // matcher
      
      mockPrompts.isCancel
        .mockReturnValueOnce(false) // for select
        .mockReturnValueOnce(false) // for name
        .mockReturnValueOnce(false) // for description
        .mockReturnValueOnce(false) // for eventType
        .mockReturnValueOnce(true); // for matcher

      await addHookCommand({});

      expect(mockPrompts.outro).toHaveBeenCalledWith('Hook creation cancelled');
    });

    it('should hit command cancellation (lines 173-174)', async () => {
      mockLoader.loadHooks.mockResolvedValue([]);
      mockPrompts.select
        .mockResolvedValueOnce('custom') // hook selection
        .mockResolvedValueOnce('PreToolUse'); // event type
      
      mockPrompts.text
        .mockResolvedValueOnce('test-hook') // name
        .mockResolvedValueOnce('desc') // description
        .mockResolvedValueOnce('Bash') // matcher
        .mockResolvedValueOnce(Symbol.for('clack:cancel')); // command
      
      mockPrompts.isCancel
        .mockReturnValueOnce(false) // for select
        .mockReturnValueOnce(false) // for name
        .mockReturnValueOnce(false) // for description
        .mockReturnValueOnce(false) // for eventType
        .mockReturnValueOnce(false) // for matcher
        .mockReturnValueOnce(true); // for command

      await addHookCommand({});

      expect(mockPrompts.outro).toHaveBeenCalledWith('Hook creation cancelled');
    });
  });

  describe('Branch Coverage: Validation paths', () => {
    it('should hit validation error branches (lines 110-114, 167-168)', async () => {
      mockLoader.loadHooks.mockResolvedValue([]);
      mockPrompts.select
        .mockResolvedValueOnce('custom')
        .mockResolvedValueOnce('PreToolUse');
      mockPrompts.isCancel.mockReturnValue(false);
      
      mockPrompts.text
        .mockResolvedValueOnce('valid-name')
        .mockResolvedValueOnce('desc')
        .mockResolvedValueOnce('Bash')
        .mockResolvedValueOnce('echo test');

      await addHookCommand({});

      const nameValidator = mockPrompts.text.mock.calls[0][0].validate;
      expect(nameValidator!('')).toBe('Hook name is required');
      expect(nameValidator!('INVALID_NAME')).toBe('Use lowercase letters, numbers, and hyphens only');
      expect(nameValidator!('valid-name')).toBeUndefined();

      const commandValidator = mockPrompts.text.mock.calls[3][0].validate;
      expect(commandValidator!('')).toBe('Command is required');
      expect(commandValidator!('valid command')).toBeUndefined();
    });
  });

  describe('Branch Coverage: File handling paths', () => {
    it('should hit existing script with different content - no overwrite branch', async () => {
      const hook = {
        name: 'test-hook',
        description: 'Test hook',
        eventType: 'PreToolUse' as const,
        command: 'echo test'
      };
      
      mockLoader.getHook.mockResolvedValue(hook);
      mockPathUtils.exists
        .mockResolvedValueOnce(true) // script exists
        .mockResolvedValueOnce(false); // settings file doesn't exist
      (mockFs.readFile as any).mockResolvedValue('different content');
      mockPrompts.confirm.mockResolvedValue(false);
      mockPrompts.isCancel.mockReturnValue(false);

      await addHookCommand({ hook: 'test-hook' });

      expect(mockPrompts.confirm).toHaveBeenCalledWith({
        message: expect.stringContaining('already exists with different content'),
        initialValue: false
      });
      expect(mockPrompts.note).toHaveBeenCalledWith(
        expect.stringContaining('Using existing script file'),
        expect.any(String)
      );
    });

    it('should hit existing script with different content - overwrite cancellation', async () => {
      const hook = {
        name: 'test-hook',
        description: 'Test hook',
        eventType: 'PreToolUse' as const,
        command: 'echo test'
      };
      
      mockLoader.getHook.mockResolvedValue(hook);
      mockPathUtils.exists
        .mockResolvedValueOnce(true) // script exists
        .mockResolvedValueOnce(false); // settings file doesn't exist
      (mockFs.readFile as any).mockResolvedValue('different content');
      mockPrompts.confirm.mockResolvedValue(Symbol.for('clack:cancel'));
      mockPrompts.isCancel.mockReturnValue(true);

      await addHookCommand({ hook: 'test-hook' });

      expect(mockPrompts.note).toHaveBeenCalledWith(
        expect.stringContaining('Using existing script file'),
        expect.any(String)
      );
    });
  });

  describe('Branch Coverage: Configuration handling', () => {
    it('should hit existing settings file branch (line 259)', async () => {
      const hook = {
        name: 'test-hook',
        description: 'Test hook',
        eventType: 'PreToolUse' as const,
        command: 'echo test'
      };
      
      mockLoader.getHook.mockResolvedValue(hook);
      mockPathUtils.exists
        .mockResolvedValueOnce(false) // script doesn't exist
        .mockResolvedValueOnce(true); // settings file exists
      (mockFs.readJSON as any).mockResolvedValue({ existing: 'config' });

      await addHookCommand({ hook: 'test-hook' });

      expect(mockFs.readJSON).toHaveBeenCalled();
    });

    it('should hit array format hook detection branch (lines 272-278)', async () => {
      const hook = {
        name: 'test-hook',
        description: 'Test hook',
        eventType: 'PreToolUse' as const,
        matcher: 'Bash',
        command: 'echo test'
      };
      
      mockLoader.getHook.mockResolvedValue(hook);
      mockPathUtils.exists
        .mockResolvedValueOnce(false) // script doesn't exist
        .mockResolvedValueOnce(true);  // settings file exists
      (mockFs.readJSON as any).mockResolvedValue({
        hooks: {
          PreToolUse: [
            {
              matcher: 'Bash',
              hooks: [
                { command: '$CLAUDE_PROJECT_DIR/.claude/hooks/test-hook.sh' }
              ]
            }
          ]
        }
      });

      await addHookCommand({ hook: 'test-hook' });

      // This test exercises the array format detection logic
      expect(mockFs.readJSON).toHaveBeenCalled();
    });

    it('should hit object format hook detection branch (line 278)', async () => {
      const hook = {
        name: 'test-hook',
        description: 'Test hook',
        eventType: 'PreToolUse' as const,
        matcher: 'Bash',
        command: 'echo test'
      };
      
      mockLoader.getHook.mockResolvedValue(hook);
      mockPathUtils.exists
        .mockResolvedValueOnce(false) // script doesn't exist
        .mockResolvedValueOnce(true);  // settings file exists
      (mockFs.readJSON as any).mockResolvedValue({
        hooks: {
          PreToolUse: {
            'Bash': '$CLAUDE_PROJECT_DIR/.claude/hooks/test-hook.sh'
          }
        }
      });

      await addHookCommand({ hook: 'test-hook' });

      // This test exercises the object format detection logic
      expect(mockFs.readJSON).toHaveBeenCalled();
    });

    it('should hit no actions taken branch (line 331)', async () => {
      const hook = {
        name: 'test-hook',
        description: 'Test hook',
        eventType: 'PreToolUse' as const,
        command: 'echo test'
      };
      
      mockLoader.getHook.mockResolvedValue(hook);
      mockPathUtils.exists.mockResolvedValue(true);
      const expectedContent = `#!/bin/bash\n# Test hook\necho test`;
      (mockFs.readFile as any).mockResolvedValue(expectedContent);
      (mockFs.readJSON as any).mockResolvedValue({
        hooks: {
          PreToolUse: {
            '*': '$CLAUDE_PROJECT_DIR/.claude/hooks/test-hook.sh'
          }
        }
      });

      await addHookCommand({ hook: 'test-hook' });

      // Check that the completion note contains verification message
      const noteCalls = mockPrompts.note.mock.calls;
      const completionCall = noteCalls.find(call => 
        call[1] && call[1].includes('Hook Installation Complete')
      );
      expect(completionCall).toBeDefined();
      // Since no new actions are taken, the file should show config update only
      expect(completionCall![0]).toContain('Updated configuration');
    });

    it('should hit warnings display branch (line 336)', async () => {
      const hook = {
        name: 'test-hook',
        description: 'Test hook',
        eventType: 'PreToolUse' as const,
        command: 'echo test'
      };
      
      mockLoader.getHook.mockResolvedValue(hook);
      mockPathUtils.exists.mockResolvedValue(true);
      const expectedContent = `#!/bin/bash\n# Test hook\necho test`;
      (mockFs.readFile as any).mockResolvedValue(expectedContent);

      await addHookCommand({ hook: 'test-hook' });

      expect(mockPrompts.note).toHaveBeenCalledWith(
        expect.stringContaining('already exists with correct content'),
        expect.stringContaining('Warnings')
      );
    });
  });

  describe('Branch Coverage: Hook creation variations', () => {
    it('should handle hook with matcher - array format creation', async () => {
      const hook = {
        name: 'test-hook',
        description: 'Test hook',
        eventType: 'PreToolUse' as const,
        matcher: 'Bash',
        command: 'echo test'
      };
      
      mockLoader.getHook.mockResolvedValue(hook);
      mockPathUtils.exists.mockResolvedValue(false);
      (mockFs.readJSON as any).mockResolvedValue({});

      await addHookCommand({ hook: 'test-hook' });

      expect(mockFs.writeJSON).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          hooks: expect.objectContaining({
            PreToolUse: expect.arrayContaining([
              expect.objectContaining({
                matcher: 'Bash',
                hooks: expect.arrayContaining([
                  expect.objectContaining({
                    type: 'command',
                    command: '$CLAUDE_PROJECT_DIR/.claude/hooks/test-hook.sh',
                    description: 'Test hook'
                  })
                ])
              })
            ])
          })
        }),
        { spaces: 2 }
      );
    });

    it('should handle hook without matcher - simple object format', async () => {
      const hook = {
        name: 'test-hook',
        description: 'Test hook',
        eventType: 'PreToolUse' as const,
        command: 'echo test'
      };
      
      mockLoader.getHook.mockResolvedValue(hook);
      mockPathUtils.exists.mockResolvedValue(false);
      (mockFs.readJSON as any).mockResolvedValue({});

      await addHookCommand({ hook: 'test-hook' });

      expect(mockFs.writeJSON).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          hooks: expect.objectContaining({
            PreToolUse: expect.objectContaining({
              '*': '$CLAUDE_PROJECT_DIR/.claude/hooks/test-hook.sh'
            })
          })
        }),
        { spaces: 2 }
      );
    });

    it('should handle hook with timeout property', async () => {
      const hook = {
        name: 'test-hook',
        description: 'Test hook',
        eventType: 'PreToolUse' as const,
        matcher: 'Bash',
        command: 'echo test',
        timeout: 5000
      };
      
      mockLoader.getHook.mockResolvedValue(hook);
      mockPathUtils.exists.mockResolvedValue(false);
      (mockFs.readJSON as any).mockResolvedValue({});

      await addHookCommand({ hook: 'test-hook' });

      expect(mockFs.writeJSON).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          hooks: expect.objectContaining({
            PreToolUse: expect.arrayContaining([
              expect.objectContaining({
                matcher: 'Bash',
                hooks: expect.arrayContaining([
                  expect.objectContaining({
                    timeout: 5000
                  })
                ])
              })
            ])
          })
        }),
        { spaces: 2 }
      );
    });

    it('should handle existing array format with same matcher', async () => {
      const hook = {
        name: 'new-hook',
        description: 'New hook',
        eventType: 'PreToolUse' as const,
        matcher: 'Bash',
        command: 'echo new'
      };
      
      mockLoader.getHook.mockResolvedValue(hook);
      mockPathUtils.exists.mockResolvedValue(false);
      (mockFs.readJSON as any).mockResolvedValue({
        hooks: {
          PreToolUse: [
            {
              matcher: 'Bash',
              hooks: [
                { command: 'existing-command' }
              ]
            }
          ]
        }
      });

      await addHookCommand({ hook: 'new-hook' });

      // Verify that a new hook entry was added to existing group
      expect(mockFs.writeJSON).toHaveBeenCalled();
      const writeCall = mockFs.writeJSON.mock.calls[0];
      const config = writeCall[1];
      expect(config.hooks.PreToolUse).toHaveLength(1);
      expect(config.hooks.PreToolUse[0].matcher).toBe('Bash');
      expect(config.hooks.PreToolUse[0].hooks).toHaveLength(1);
      expect(config.hooks.PreToolUse[0].hooks[0].command).toBe('$CLAUDE_PROJECT_DIR/.claude/hooks/new-hook.sh');
    });

    it('should handle custom hook creation with empty inputs', async () => {
      mockLoader.loadHooks.mockResolvedValue([]);
      mockPrompts.select
        .mockResolvedValueOnce('custom')
        .mockResolvedValueOnce('PreToolUse');
      mockPrompts.isCancel.mockReturnValue(false);
      
      mockPrompts.text
        .mockResolvedValueOnce('test-hook') // name
        .mockResolvedValueOnce('') // description (empty)
        .mockResolvedValueOnce('') // matcher (empty)
        .mockResolvedValueOnce('echo test'); // command

      await addHookCommand({});

      expect(mockFs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('test-hook.sh'),
        expect.stringContaining('Custom hook'),
        'utf-8'
      );
    });

    it('should handle chmod error gracefully', async () => {
      const hook = {
        name: 'test-hook',
        description: 'Test hook',
        eventType: 'PreToolUse' as const,
        command: 'echo test'
      };
      
      mockLoader.getHook.mockResolvedValue(hook);
      mockPathUtils.exists.mockResolvedValue(false);
      (mockFs.chmod as any).mockRejectedValue(new Error('Chmod failed'));

      await expect(addHookCommand({ hook: 'test-hook' })).resolves.not.toThrow();
    });
  });
});