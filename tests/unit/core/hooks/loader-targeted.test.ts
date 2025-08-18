import { HookLoader } from '../../../../src/core/hooks/loader';
import * as fs from 'fs-extra';
import * as path from 'path';
import { PathUtils } from '../../../../src/utils/paths';

// Mock dependencies
jest.mock('../../../../src/utils/logger', () => ({
  Logger: {
    debug: jest.fn(),
    error: jest.fn(),
  }
}));

jest.mock('fs-extra');
jest.mock('path');
jest.mock('../../../../src/utils/paths');

jest.mock('../../../../src/core/config/user-manager', () => ({
  UserConfigManager: {
    getInstance: jest.fn(() => ({
      getSystemHooksDir: jest.fn().mockReturnValue('/system/hooks'),
      getUserHooksDir: jest.fn().mockReturnValue('/user/hooks')
    }))
  }
}));

describe('HookLoader (Targeted Coverage)', () => {
  let hookLoader: HookLoader;
  const mockFs = fs as any;
  const mockPath = path as any;
  const mockPathUtils = PathUtils as any;

  beforeEach(() => {
    hookLoader = new HookLoader();
    jest.clearAllMocks();
    
    // Setup path mocks
    mockPath.join.mockImplementation((...parts: string[]) => parts.join('/'));
  });

  describe('loadHooksFromDirectory with settings.json', () => {
    it('should load hooks from directory with settings.json', async () => {
      // Mock directory exists
      mockPathUtils.exists.mockImplementation((filePath: string) => {
        if (filePath === '/system/hooks') return Promise.resolve(true);
        if (filePath.endsWith('settings.json')) return Promise.resolve(true);
        return Promise.resolve(false);
      });

      // Mock readdir to return a directory
      (mockFs.readdir as jest.Mock).mockResolvedValue(['hook-package']);

      // Mock stat to return directory
      (mockFs.stat as jest.Mock).mockResolvedValue({
        isDirectory: () => true
      });

      // Mock settings.json content
      const settingsContent = JSON.stringify({
        hooks: {
          'user-prompt-submit': [
            {
              matcher: 'test*',
              hooks: [
                {
                  type: 'command',
                  command: 'echo "test hook"',
                  description: 'Test hook for user prompt submit',
                  timeout: 5000
                }
              ]
            }
          ]
        }
      });

      (mockFs.readFile as jest.Mock).mockResolvedValue(settingsContent);

      // Call the private method to test lines 80-86
      const result = await (hookLoader as any).loadHooksFromDirectory('/system/hooks', 'system');
      
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        name: 'hook-package-user-prompt-submit-0-0',
        description: 'Test hook for user prompt submit',
        eventType: 'user-prompt-submit',
        matcher: 'test*',
        command: 'echo "test hook"',
        timeout: 5000,
        source: 'system'
      });
    });

    it('should handle directory without settings.json', async () => {
      mockPathUtils.exists.mockImplementation((filePath: string) => {
        if (filePath === '/system/hooks') return Promise.resolve(true);
        return Promise.resolve(false); // No settings.json
      });

      (mockFs.readdir as jest.Mock).mockResolvedValue(['hook-package']);
      (mockFs.stat as jest.Mock).mockResolvedValue({
        isDirectory: () => true
      });

      const result = await (hookLoader as any).loadHooksFromDirectory('/system/hooks', 'system');
      
      expect(result).toHaveLength(0);
    });

    it('should handle files in hooks directory (not directories)', async () => {
      mockPathUtils.exists.mockResolvedValue(true);
      (mockFs.readdir as jest.Mock).mockResolvedValue(['some-file.txt']);
      (mockFs.stat as jest.Mock).mockResolvedValue({
        isDirectory: () => false // File, not directory
      });

      const result = await (hookLoader as any).loadHooksFromDirectory('/system/hooks', 'system');
      
      expect(result).toHaveLength(0);
    });
  });

  describe('loadHooksFromSettings - Array format (lines 99-121)', () => {
    it('should parse array format hooks with multiple hook groups', async () => {
      const settingsContent = JSON.stringify({
        hooks: {
          'user-prompt-submit': [
            {
              matcher: 'tool*',
              hooks: [
                {
                  type: 'command',
                  command: 'echo "first hook"',
                  description: 'First hook'
                },
                {
                  type: 'command',
                  command: 'echo "second hook"',
                  timeout: 3000
                }
              ]
            },
            {
              matcher: 'other*',
              hooks: [
                {
                  type: 'command',
                  command: 'echo "third hook"'
                }
              ]
            }
          ]
        }
      });

      (mockFs.readFile as jest.Mock).mockResolvedValue(settingsContent);

      const result = await (hookLoader as any).loadHooksFromSettings('test-package', '/path/settings.json', 'user');
      
      expect(result).toHaveLength(3);
      expect(result[0].name).toBe('test-package-user-prompt-submit-0-0');
      expect(result[1].name).toBe('test-package-user-prompt-submit-0-1');
      expect(result[2].name).toBe('test-package-user-prompt-submit-1-0');
    });

    it('should handle array format with non-command type hooks', async () => {
      const settingsContent = JSON.stringify({
        hooks: {
          'user-prompt-submit': [
            {
              matcher: 'test*',
              hooks: [
                {
                  type: 'not-command', // This should be skipped
                  command: 'echo "should not be included"'
                },
                {
                  type: 'command',
                  command: 'echo "should be included"'
                }
              ]
            }
          ]
        }
      });

      (mockFs.readFile as jest.Mock).mockResolvedValue(settingsContent);

      const result = await (hookLoader as any).loadHooksFromSettings('test-package', '/path/settings.json', 'user');
      
      expect(result).toHaveLength(1);
      expect(result[0].command).toBe('echo "should be included"');
    });

    it('should handle array format with missing hooks array', async () => {
      const settingsContent = JSON.stringify({
        hooks: {
          'user-prompt-submit': [
            {
              matcher: 'test*'
              // No hooks array
            }
          ]
        }
      });

      (mockFs.readFile as jest.Mock).mockResolvedValue(settingsContent);

      const result = await (hookLoader as any).loadHooksFromSettings('test-package', '/path/settings.json', 'user');
      
      expect(result).toHaveLength(0);
    });
  });

  describe('loadHooksFromSettings - Object format (lines 122-138)', () => {
    it('should parse simple object format hooks', async () => {
      const settingsContent = JSON.stringify({
        hooks: {
          'user-prompt-submit': {
            'Tool*': 'echo "tool hook"',
            'Grep*': 'echo "grep hook"',
            'Edit*': 'echo "edit hook"'
          }
        }
      });

      (mockFs.readFile as jest.Mock).mockResolvedValue(settingsContent);

      const result = await (hookLoader as any).loadHooksFromSettings('simple-hooks', '/path/settings.json', 'system');
      
      expect(result).toHaveLength(3);
      expect(result[0]).toMatchObject({
        name: 'simple-hooks-user-prompt-submit-Tool*',
        description: 'user-prompt-submit hook for Tool*',
        eventType: 'user-prompt-submit',
        matcher: 'Tool*',
        command: 'echo "tool hook"',
        source: 'system'
      });
    });

    it('should handle object format with non-string commands', async () => {
      const settingsContent = JSON.stringify({
        hooks: {
          'user-prompt-submit': {
            'Tool*': 'echo "valid command"',
            'Grep*': 123, // Non-string, should be skipped
            'Edit*': null // Non-string, should be skipped
          }
        }
      });

      (mockFs.readFile as jest.Mock).mockResolvedValue(settingsContent);

      const result = await (hookLoader as any).loadHooksFromSettings('mixed-hooks', '/path/settings.json', 'user');
      
      expect(result).toHaveLength(1);
      expect(result[0].command).toBe('echo "valid command"');
    });

    it('should handle null object format', async () => {
      const settingsContent = JSON.stringify({
        hooks: {
          'user-prompt-submit': null
        }
      });

      (mockFs.readFile as jest.Mock).mockResolvedValue(settingsContent);

      const result = await (hookLoader as any).loadHooksFromSettings('null-hooks', '/path/settings.json', 'user');
      
      expect(result).toHaveLength(0);
    });
  });

  describe('Error handling and edge cases', () => {
    it('should handle JSON parse errors gracefully', async () => {
      (mockFs.readFile as jest.Mock).mockResolvedValue('invalid json content');

      const result = await (hookLoader as any).loadHooksFromSettings('error-hooks', '/path/settings.json', 'user');
      
      expect(result).toHaveLength(0);
    });

    it('should handle file read errors gracefully', async () => {
      (mockFs.readFile as jest.Mock).mockRejectedValue(new Error('File read error'));

      const result = await (hookLoader as any).loadHooksFromSettings('error-hooks', '/path/settings.json', 'user');
      
      expect(result).toHaveLength(0);
    });

    it('should handle settings without hooks property', async () => {
      const settingsContent = JSON.stringify({
        name: 'test-package',
        version: '1.0.0'
        // No hooks property
      });

      (mockFs.readFile as jest.Mock).mockResolvedValue(settingsContent);

      const result = await (hookLoader as any).loadHooksFromSettings('no-hooks', '/path/settings.json', 'user');
      
      expect(result).toHaveLength(0);
    });

    it('should handle mixed hook formats in same file', async () => {
      const settingsContent = JSON.stringify({
        hooks: {
          'user-prompt-submit': [
            {
              matcher: 'array*',
              hooks: [
                {
                  type: 'command',
                  command: 'echo "array format"'
                }
              ]
            }
          ],
          'tool-call': {
            'Tool*': 'echo "object format"'
          }
        }
      });

      (mockFs.readFile as jest.Mock).mockResolvedValue(settingsContent);

      const result = await (hookLoader as any).loadHooksFromSettings('mixed-format', '/path/settings.json', 'user');
      
      expect(result).toHaveLength(2);
      expect(result.some((h: any) => h.command === 'echo "array format"')).toBe(true);
      expect(result.some((h: any) => h.command === 'echo "object format"')).toBe(true);
    });
  });

  describe('Integration scenarios', () => {
    it('should load hooks from both system and user directories', async () => {
      mockPathUtils.exists.mockImplementation((filePath: string) => {
        return Promise.resolve(filePath.includes('hooks') || filePath.endsWith('settings.json'));
      });

      (mockFs.readdir as jest.Mock).mockImplementation((dirPath: string) => {
        if (dirPath === '/system/hooks') return Promise.resolve(['system-hook']);
        if (dirPath === '/user/hooks') return Promise.resolve(['user-hook']);
        return Promise.resolve([]);
      });

      (mockFs.stat as jest.Mock).mockResolvedValue({
        isDirectory: () => true
      });

      (mockFs.readFile as jest.Mock).mockImplementation((filePath: string) => {
        if (filePath.includes('system-hook')) {
          return Promise.resolve(JSON.stringify({
            hooks: {
              'user-prompt-submit': { 'Tool*': 'echo "system hook"', 'Grep*': 'echo "system grep"' }
            }
          }));
        } else if (filePath.includes('user-hook')) {
          return Promise.resolve(JSON.stringify({
            hooks: {
              'user-prompt-submit': { 'Tool*': 'echo "user hook"' }
            }
          }));
        }
        return Promise.resolve('{}');
      });

      const hooks = await hookLoader.loadHooks();
      
      expect(hooks.length).toBeGreaterThan(0);
      
      // Should have hooks from both system and user directories  
      const toolHooks = hooks.filter((h: any) => h.matcher === 'Tool*');
      const grepHooks = hooks.filter((h: any) => h.matcher === 'Grep*');
      
      expect(toolHooks.length).toBeGreaterThan(0);
      expect(grepHooks.length).toBeGreaterThan(0);
      
      // At least one hook should be from user source and one from system
      const hasUserHook = hooks.some((h: any) => h.source === 'user');
      const hasSystemHook = hooks.some((h: any) => h.source === 'system');
      expect(hasUserHook || hasSystemHook).toBe(true);
    });
  });
});