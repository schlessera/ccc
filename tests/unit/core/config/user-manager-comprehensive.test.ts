import { UserConfigManager } from '../../../../src/core/config/user-manager';

// Mock dependencies
jest.mock('path', () => ({
  join: jest.fn((...args) => args.join('/')),
  basename: jest.fn((filePath, ext) => {
    const name = filePath.split('/').pop() || '';
    return ext ? name.replace(ext, '') : name;
  }),
}));

jest.mock('os', () => ({
  homedir: jest.fn(() => '/home/user'),
}));

jest.mock('fs-extra', () => ({
  readdir: jest.fn(),
  stat: jest.fn(),
}));

jest.mock('../../../../src/utils/paths', () => ({
  PathUtils: {
    exists: jest.fn(),
    ensureDir: jest.fn(),
  },
}));

import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs-extra';
import { PathUtils } from '../../../../src/utils/paths';

describe('UserConfigManager', () => {
  let manager: UserConfigManager;
  let mockProcess: any;

  beforeEach(() => {
    // Reset singleton instance
    (UserConfigManager as any).instance = undefined;
    
    // Mock process.env
    mockProcess = {
      env: {},
    };
    Object.defineProperty(global, 'process', {
      value: mockProcess,
      writable: true,
    });

    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Singleton pattern', () => {
    it('should return the same instance when called multiple times', () => {
      const instance1 = UserConfigManager.getInstance();
      const instance2 = UserConfigManager.getInstance();
      const instance3 = UserConfigManager.getInstance();

      expect(instance1).toBe(instance2);
      expect(instance2).toBe(instance3);
      expect(instance1).toBeInstanceOf(UserConfigManager);
    });

    it('should create new instance only once', () => {
      const spy = jest.spyOn(os, 'homedir');
      
      UserConfigManager.getInstance();
      UserConfigManager.getInstance();
      UserConfigManager.getInstance();

      // homedir should only be called once during construction
      expect(spy).toHaveBeenCalledTimes(1);
    });
  });

  describe('Configuration directory setup', () => {
    it('should use default config directory when no environment variable set', () => {
      manager = UserConfigManager.getInstance();
      
      expect(os.homedir).toHaveBeenCalled();
      expect(path.join).toHaveBeenCalledWith('/home/user', '.ccc');
      expect(manager.getConfigDir()).toBe('/home/user/.ccc');
    });

    it('should use CCC_CONFIG_DIR environment variable when set', () => {
      mockProcess.env.CCC_CONFIG_DIR = '/custom/config/dir';
      
      manager = UserConfigManager.getInstance();
      
      expect(manager.getConfigDir()).toBe('/custom/config/dir');
    });

    it('should handle empty CCC_CONFIG_DIR environment variable', () => {
      mockProcess.env.CCC_CONFIG_DIR = '';
      
      manager = UserConfigManager.getInstance();
      
      expect(manager.getConfigDir()).toBe('/home/user/.ccc');
    });

    it('should handle absolute path in CCC_CONFIG_DIR', () => {
      mockProcess.env.CCC_CONFIG_DIR = '/absolute/path/to/config';
      
      manager = UserConfigManager.getInstance();
      
      expect(manager.getConfigDir()).toBe('/absolute/path/to/config');
    });

    it('should handle relative path in CCC_CONFIG_DIR', () => {
      mockProcess.env.CCC_CONFIG_DIR = 'relative/config/path';
      
      manager = UserConfigManager.getInstance();
      
      expect(manager.getConfigDir()).toBe('relative/config/path');
    });
  });

  describe('Directory path getters', () => {
    beforeEach(() => {
      manager = UserConfigManager.getInstance();
    });

    it('should return correct user templates directory', () => {
      const result = manager.getUserTemplatesDir();
      
      expect(path.join).toHaveBeenCalledWith('/home/user/.ccc', 'templates');
      expect(result).toBe('/home/user/.ccc/templates');
    });

    it('should return correct user agents directory', () => {
      const result = manager.getUserAgentsDir();
      
      expect(path.join).toHaveBeenCalledWith('/home/user/.ccc', 'agents');
      expect(result).toBe('/home/user/.ccc/agents');
    });

    it('should return correct user commands directory', () => {
      const result = manager.getUserCommandsDir();
      
      expect(path.join).toHaveBeenCalledWith('/home/user/.ccc', 'commands');
      expect(result).toBe('/home/user/.ccc/commands');
    });

    it('should return correct user hooks directory', () => {
      const result = manager.getUserHooksDir();
      
      expect(path.join).toHaveBeenCalledWith('/home/user/.ccc', 'hooks');
      expect(result).toBe('/home/user/.ccc/hooks');
    });

    it('should return correct system templates directory', () => {
      const result = manager.getSystemTemplatesDir();
      
      expect(result).toContain('templates');
    });

    it('should return correct system agents directory', () => {
      const result = manager.getSystemAgentsDir();
      
      expect(result).toContain('agents');
    });

    it('should return correct system commands directory', () => {
      const result = manager.getSystemCommandsDir();
      
      expect(result).toContain('commands');
    });

    it('should return correct system hooks directory', () => {
      const result = manager.getSystemHooksDir();
      
      expect(result).toContain('hooks');
    });
  });

  describe('ensureUserConfigDir method', () => {
    beforeEach(() => {
      manager = UserConfigManager.getInstance();
      (PathUtils.ensureDir as jest.Mock).mockResolvedValue(undefined);
    });

    it('should ensure all user directories exist', async () => {
      await manager.ensureUserConfigDir();

      expect(PathUtils.ensureDir).toHaveBeenCalledTimes(5);
      expect(PathUtils.ensureDir).toHaveBeenCalledWith('/home/user/.ccc');
      expect(PathUtils.ensureDir).toHaveBeenCalledWith('/home/user/.ccc/templates');
      expect(PathUtils.ensureDir).toHaveBeenCalledWith('/home/user/.ccc/agents');
      expect(PathUtils.ensureDir).toHaveBeenCalledWith('/home/user/.ccc/commands');
      expect(PathUtils.ensureDir).toHaveBeenCalledWith('/home/user/.ccc/hooks');
    });

    it('should handle errors from PathUtils.ensureDir', async () => {
      (PathUtils.ensureDir as jest.Mock).mockRejectedValue(new Error('Permission denied'));

      await expect(manager.ensureUserConfigDir()).rejects.toThrow('Permission denied');
    });

    it('should create directories in correct order', async () => {
      const ensureDirCalls: string[] = [];
      (PathUtils.ensureDir as jest.Mock).mockImplementation((dir) => {
        ensureDirCalls.push(dir);
        return Promise.resolve();
      });

      await manager.ensureUserConfigDir();

      expect(ensureDirCalls).toEqual([
        '/home/user/.ccc',
        '/home/user/.ccc/templates',
        '/home/user/.ccc/agents',
        '/home/user/.ccc/commands',
        '/home/user/.ccc/hooks',
      ]);
    });
  });

  describe('getCombinedItems method', () => {
    beforeEach(() => {
      manager = UserConfigManager.getInstance();
    });

    it('should combine system and user directories', async () => {
      (PathUtils.exists as jest.Mock)
        .mockResolvedValueOnce(true)  // system dir exists
        .mockResolvedValueOnce(true); // user dir exists
      
      (fs.readdir as unknown as jest.Mock)
        .mockResolvedValueOnce(['system-item1', 'system-item2'])
        .mockResolvedValueOnce(['user-item1', 'system-item1']); // user-item1 new, system-item1 override
      
      (fs.stat as unknown as jest.Mock).mockResolvedValue({ isDirectory: () => true });

      const result = await manager.getCombinedItems('/system/dir', '/user/dir');

      expect(result).toHaveLength(3);
      expect(result).toEqual([
        { name: 'system-item1', path: '/user/dir/system-item1', source: 'user' }, // user overrides system
        { name: 'system-item2', path: '/system/dir/system-item2', source: 'system' },
        { name: 'user-item1', path: '/user/dir/user-item1', source: 'user' },
      ]);
    });

    it('should handle only system directory existing', async () => {
      (PathUtils.exists as jest.Mock)
        .mockResolvedValueOnce(true)   // system dir exists
        .mockResolvedValueOnce(false); // user dir doesn't exist
      
      (fs.readdir as unknown as jest.Mock).mockResolvedValueOnce(['system-only1', 'system-only2']);
      (fs.stat as unknown as jest.Mock).mockResolvedValue({ isDirectory: () => true });

      const result = await manager.getCombinedItems('/system/dir', '/user/dir');

      expect(result).toHaveLength(2);
      expect(result).toEqual([
        { name: 'system-only1', path: '/system/dir/system-only1', source: 'system' },
        { name: 'system-only2', path: '/system/dir/system-only2', source: 'system' },
      ]);
    });

    it('should handle only user directory existing', async () => {
      (PathUtils.exists as jest.Mock)
        .mockResolvedValueOnce(false) // system dir doesn't exist
        .mockResolvedValueOnce(true); // user dir exists
      
      (fs.readdir as unknown as jest.Mock).mockResolvedValueOnce(['user-only1', 'user-only2']);
      (fs.stat as unknown as jest.Mock).mockResolvedValue({ isDirectory: () => true });

      const result = await manager.getCombinedItems('/system/dir', '/user/dir');

      expect(result).toHaveLength(2);
      expect(result).toEqual([
        { name: 'user-only1', path: '/user/dir/user-only1', source: 'user' },
        { name: 'user-only2', path: '/user/dir/user-only2', source: 'user' },
      ]);
    });

    it('should handle neither directory existing', async () => {
      (PathUtils.exists as jest.Mock)
        .mockResolvedValueOnce(false) // system dir doesn't exist
        .mockResolvedValueOnce(false); // user dir doesn't exist

      const result = await manager.getCombinedItems('/system/dir', '/user/dir');

      expect(result).toHaveLength(0);
      expect(fs.readdir).not.toHaveBeenCalled();
    });

    it('should support markdown files when supportFiles is true', async () => {
      (PathUtils.exists as jest.Mock)
        .mockResolvedValueOnce(true)  // system dir exists
        .mockResolvedValueOnce(true); // user dir exists
      
      (fs.readdir as unknown as jest.Mock)
        .mockResolvedValueOnce(['command1.md', 'command2.md', 'directory1'])
        .mockResolvedValueOnce(['command3.md', 'command1.md']); // command1.md overridden
      
      (fs.stat as unknown as jest.Mock)
        .mockResolvedValueOnce({ isDirectory: () => false }) // command1.md
        .mockResolvedValueOnce({ isDirectory: () => false }) // command2.md
        .mockResolvedValueOnce({ isDirectory: () => true })  // directory1
        .mockResolvedValueOnce({ isDirectory: () => false }) // command3.md
        .mockResolvedValueOnce({ isDirectory: () => false }); // command1.md (user)

      const result = await manager.getCombinedItems('/system/dir', '/user/dir', true);

      expect(result).toHaveLength(4);
      expect(result).toEqual([
        { name: 'command1', path: '/user/dir/command1.md', source: 'user' },
        { name: 'command2', path: '/system/dir/command2.md', source: 'system' },
        { name: 'directory1', path: '/system/dir/directory1', source: 'system' },
        { name: 'command3', path: '/user/dir/command3.md', source: 'user' },
      ]);
    });

    it('should ignore non-markdown files when supportFiles is true', async () => {
      (PathUtils.exists as jest.Mock).mockResolvedValueOnce(true).mockResolvedValueOnce(false);
      
      (fs.readdir as unknown as jest.Mock).mockResolvedValueOnce(['valid.md', 'invalid.txt', 'another.js', 'directory']);
      
      (fs.stat as unknown as jest.Mock)
        .mockResolvedValueOnce({ isDirectory: () => false }) // valid.md
        .mockResolvedValueOnce({ isDirectory: () => false }) // invalid.txt
        .mockResolvedValueOnce({ isDirectory: () => false }) // another.js
        .mockResolvedValueOnce({ isDirectory: () => true });  // directory

      const result = await manager.getCombinedItems('/system/dir', '/user/dir', true);

      expect(result).toHaveLength(2);
      expect(result).toEqual([
        { name: 'valid', path: '/system/dir/valid.md', source: 'system' },
        { name: 'directory', path: '/system/dir/directory', source: 'system' },
      ]);
    });

    it('should handle mixed directories and files correctly', async () => {
      (PathUtils.exists as jest.Mock).mockResolvedValueOnce(true).mockResolvedValueOnce(false);
      
      (fs.readdir as unknown as jest.Mock).mockResolvedValueOnce(['template-dir', 'agent.md', 'config.json']);
      
      (fs.stat as unknown as jest.Mock)
        .mockResolvedValueOnce({ isDirectory: () => true })  // template-dir
        .mockResolvedValueOnce({ isDirectory: () => false }) // agent.md
        .mockResolvedValueOnce({ isDirectory: () => false }); // config.json

      const result = await manager.getCombinedItems('/system/dir', '/user/dir', true);

      expect(result).toHaveLength(2);
      expect(result).toEqual([
        { name: 'template-dir', path: '/system/dir/template-dir', source: 'system' },
        { name: 'agent', path: '/system/dir/agent.md', source: 'system' },
      ]);
    });

    it('should handle file system errors gracefully', async () => {
      (PathUtils.exists as jest.Mock).mockResolvedValueOnce(true).mockResolvedValueOnce(false);
      (fs.readdir as unknown as jest.Mock).mockRejectedValue(new Error('Permission denied'));

      await expect(manager.getCombinedItems('/system/dir', '/user/dir')).rejects.toThrow('Permission denied');
    });

    it('should handle stat errors gracefully', async () => {
      (PathUtils.exists as jest.Mock).mockResolvedValueOnce(true).mockResolvedValueOnce(false);
      (fs.readdir as unknown as jest.Mock).mockResolvedValueOnce(['item1']);
      (fs.stat as unknown as jest.Mock).mockRejectedValue(new Error('Stat failed'));

      await expect(manager.getCombinedItems('/system/dir', '/user/dir')).rejects.toThrow('Stat failed');
    });
  });

  describe('Combined directory methods', () => {
    beforeEach(() => {
      manager = UserConfigManager.getInstance();
      (PathUtils.exists as jest.Mock).mockResolvedValue(false);
    });

    it('should call getCombinedItems for templates', async () => {
      const spy = jest.spyOn(manager, 'getCombinedItems').mockResolvedValue([]);
      
      await manager.getCombinedTemplates();
      
      expect(spy).toHaveBeenCalledWith(manager.getSystemTemplatesDir(), manager.getUserTemplatesDir());
    });

    it('should call getCombinedItems for agents with file support', async () => {
      const spy = jest.spyOn(manager, 'getCombinedItems').mockResolvedValue([]);
      
      await manager.getCombinedAgents();
      
      expect(spy).toHaveBeenCalledWith(manager.getSystemAgentsDir(), manager.getUserAgentsDir(), true);
    });

    it('should call getCombinedItems for commands with file support', async () => {
      const spy = jest.spyOn(manager, 'getCombinedItems').mockResolvedValue([]);
      
      await manager.getCombinedCommands();
      
      expect(spy).toHaveBeenCalledWith(manager.getSystemCommandsDir(), manager.getUserCommandsDir(), true);
    });

    it('should call getCombinedItems for hooks', async () => {
      const spy = jest.spyOn(manager, 'getCombinedItems').mockResolvedValue([]);
      
      await manager.getCombinedHooks();
      
      expect(spy).toHaveBeenCalledWith(manager.getSystemHooksDir(), manager.getUserHooksDir());
    });
  });

  describe('Edge cases and error handling', () => {
    beforeEach(() => {
      manager = UserConfigManager.getInstance();
    });

    it('should handle very long directory paths', async () => {
      // Reset singleton to pick up new environment variable
      (UserConfigManager as any).instance = undefined;
      
      const longPath = '/very/long/path/that/goes/on/and/on/and/has/many/nested/directories';
      mockProcess.env.CCC_CONFIG_DIR = longPath;
      
      manager = UserConfigManager.getInstance();
      
      expect(manager.getConfigDir()).toBe(longPath);
    });

    it('should handle special characters in config directory path', async () => {
      // Reset singleton to pick up new environment variable
      (UserConfigManager as any).instance = undefined;
      
      const specialPath = '/path/with/spëcial/chars/and-symbols_123';
      mockProcess.env.CCC_CONFIG_DIR = specialPath;
      
      manager = UserConfigManager.getInstance();
      
      expect(manager.getConfigDir()).toBe(specialPath);
    });

    it('should handle empty directory listings', async () => {
      (PathUtils.exists as jest.Mock).mockResolvedValue(true);
      (fs.readdir as unknown as jest.Mock).mockResolvedValue([]);

      const result = await manager.getCombinedItems('/empty/system', '/empty/user');

      expect(result).toHaveLength(0);
    });

    it('should handle large directory listings', async () => {
      const largeSystemList = Array.from({ length: 1000 }, (_, i) => `system-item-${i}`);
      const largeUserList = Array.from({ length: 500 }, (_, i) => `user-item-${i}`);
      
      (PathUtils.exists as jest.Mock).mockResolvedValue(true);
      (fs.readdir as unknown as jest.Mock)
        .mockResolvedValueOnce(largeSystemList)
        .mockResolvedValueOnce(largeUserList);
      (fs.stat as unknown as jest.Mock).mockResolvedValue({ isDirectory: () => true });

      const result = await manager.getCombinedItems('/large/system', '/large/user');

      expect(result).toHaveLength(1500); // All items should be included
    });

    it('should handle concurrent access to singleton', async () => {
      // Reset singleton
      (UserConfigManager as any).instance = undefined;
      
      // Create multiple instances concurrently
      const promises = Array.from({ length: 10 }, () => 
        Promise.resolve(UserConfigManager.getInstance())
      );
      
      const instances = await Promise.all(promises);
      
      // All should be the same instance
      const firstInstance = instances[0];
      expect(instances.every(instance => instance === firstInstance)).toBe(true);
    });
  });

  describe('Integration scenarios', () => {
    beforeEach(() => {
      manager = UserConfigManager.getInstance();
    });

    it('should support complete setup workflow', async () => {
      (PathUtils.ensureDir as jest.Mock).mockResolvedValue(undefined);
      
      // Ensure directories exist
      await manager.ensureUserConfigDir();
      
      // Get all combined items
      (PathUtils.exists as jest.Mock).mockResolvedValue(true);
      (fs.readdir as unknown as jest.Mock).mockResolvedValue(['item1']);
      (fs.stat as unknown as jest.Mock).mockResolvedValue({ isDirectory: () => true });
      
      const [templates, agents, commands, hooks] = await Promise.all([
        manager.getCombinedTemplates(),
        manager.getCombinedAgents(),
        manager.getCombinedCommands(),
        manager.getCombinedHooks(),
      ]);

      expect(PathUtils.ensureDir).toHaveBeenCalledTimes(5);
      expect(templates).toBeDefined();
      expect(agents).toBeDefined();
      expect(commands).toBeDefined();
      expect(hooks).toBeDefined();
    });

    it('should handle first-time user setup', async () => {
      // No directories exist initially
      (PathUtils.exists as jest.Mock).mockResolvedValue(false);
      (PathUtils.ensureDir as jest.Mock).mockResolvedValue(undefined);
      
      await manager.ensureUserConfigDir();
      const items = await manager.getCombinedTemplates();

      expect(PathUtils.ensureDir).toHaveBeenCalledTimes(5);
      expect(items).toEqual([]);
    });
  });
});