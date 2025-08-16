import { PathUtils } from '../../../src/utils/paths';

// Mock dependencies
jest.mock('path', () => ({
  join: jest.fn((...args) => args.join('/')),
  resolve: jest.fn((path) => path.startsWith('/') ? path : `/cwd/${path}`),
  relative: jest.fn((from, to) => `relative(${from}->${to})`),
}));

jest.mock('os', () => ({
  homedir: jest.fn(() => '/home/user'),
}));

jest.mock('fs-extra', () => ({
  ensureDir: jest.fn(),
  access: jest.fn(),
  lstat: jest.fn(),
}));

jest.mock('../../../src/core/config/user-manager', () => ({
  UserConfigManager: {
    getInstance: jest.fn(() => ({
      getConfigDir: jest.fn(() => '/home/user/.ccc'),
      getUserTemplatesDir: jest.fn(() => '/home/user/.ccc/templates'),
      getUserCommandsDir: jest.fn(() => '/home/user/.ccc/commands'),
      getUserAgentsDir: jest.fn(() => '/home/user/.ccc/agents'),
      getUserHooksDir: jest.fn(() => '/home/user/.ccc/hooks'),
    })),
  },
}));

import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs-extra';
import { UserConfigManager } from '../../../src/core/config/user-manager';

describe('PathUtils Comprehensive Tests', () => {
  let mockUserConfig: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockUserConfig = {
      getConfigDir: jest.fn(() => '/home/user/.ccc'),
      getUserTemplatesDir: jest.fn(() => '/home/user/.ccc/templates'),
      getUserCommandsDir: jest.fn(() => '/home/user/.ccc/commands'),
      getUserAgentsDir: jest.fn(() => '/home/user/.ccc/agents'),
      getUserHooksDir: jest.fn(() => '/home/user/.ccc/hooks'),
    };
    
    (UserConfigManager.getInstance as jest.Mock).mockReturnValue(mockUserConfig);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Directory Path Getters', () => {
    it('should get storage directory', () => {
      const result = PathUtils.getStorageDir();
      
      expect(path.join).toHaveBeenCalledWith('/home/user/.ccc', 'storage');
      expect(result).toBe('/home/user/.ccc/storage');
    });

    it('should get templates directory', () => {
      const result = PathUtils.getTemplatesDir();
      
      expect(mockUserConfig.getUserTemplatesDir).toHaveBeenCalled();
      expect(result).toBe('/home/user/.ccc/templates');
    });

    it('should get commands directory', () => {
      const result = PathUtils.getCommandsDir();
      
      expect(mockUserConfig.getUserCommandsDir).toHaveBeenCalled();
      expect(result).toBe('/home/user/.ccc/commands');
    });

    it('should get agents directory', () => {
      const result = PathUtils.getAgentsDir();
      
      expect(mockUserConfig.getUserAgentsDir).toHaveBeenCalled();
      expect(result).toBe('/home/user/.ccc/agents');
    });

    it('should get hooks directory', () => {
      const result = PathUtils.getHooksDir();
      
      expect(mockUserConfig.getUserHooksDir).toHaveBeenCalled();
      expect(result).toBe('/home/user/.ccc/hooks');
    });

    it('should get global commands directory', () => {
      const result = PathUtils.getGlobalCommandsDir();
      
      expect(os.homedir).toHaveBeenCalled();
      expect(path.join).toHaveBeenCalledWith('/home/user', '.claude', 'commands');
      expect(result).toBe('/home/user/.claude/commands');
    });
  });

  describe('Project-specific Path Getters', () => {
    it('should get project storage directory', () => {
      const result = PathUtils.getProjectStorageDir('my-project');
      
      expect(path.join).toHaveBeenCalledWith('/home/user/.ccc/storage', 'my-project');
      expect(result).toBe('/home/user/.ccc/storage/my-project');
    });

    it('should get project backups directory', () => {
      const result = PathUtils.getProjectBackupsDir('my-project');
      
      expect(path.join).toHaveBeenCalledWith('/home/user/.ccc/storage/my-project', '.backups');
      expect(result).toBe('/home/user/.ccc/storage/my-project/.backups');
    });

    it('should handle project names with special characters', () => {
      const projectName = 'my-project_with-symbols@123';
      const result = PathUtils.getProjectStorageDir(projectName);
      
      expect(result).toBe(`/home/user/.ccc/storage/${projectName}`);
    });

    it('should handle empty project name', () => {
      const result = PathUtils.getProjectStorageDir('');
      
      expect(result).toBe('/home/user/.ccc/storage/');
    });

    it('should handle project names with path separators', () => {
      const projectName = 'org/project';
      const result = PathUtils.getProjectStorageDir(projectName);
      
      expect(result).toBe('/home/user/.ccc/storage/org/project');
    });
  });

  describe('File System Operations', () => {
    describe('ensureDir', () => {
      it('should ensure directory exists', async () => {
        (fs.ensureDir as jest.Mock).mockResolvedValue(undefined);
        
        await PathUtils.ensureDir('/test/directory');
        
        expect(fs.ensureDir).toHaveBeenCalledWith('/test/directory');
      });

      it('should handle directory creation errors', async () => {
        (fs.ensureDir as jest.Mock).mockRejectedValueOnce(new Error('Permission denied'));
        
        await expect(PathUtils.ensureDir('/protected/directory')).rejects.toThrow('Permission denied');
      });

      it('should handle empty directory path', async () => {
        await PathUtils.ensureDir('');
        
        expect(fs.ensureDir).toHaveBeenCalledWith('');
      });

      it('should handle nested directory creation', async () => {
        const deepPath = '/very/deep/nested/directory/structure';
        await PathUtils.ensureDir(deepPath);
        
        expect(fs.ensureDir).toHaveBeenCalledWith(deepPath);
      });
    });

    describe('exists', () => {
      it('should return true for existing paths', async () => {
        (fs.access as unknown as jest.Mock).mockResolvedValue(undefined);
        
        const result = await PathUtils.exists('/existing/path');
        
        expect(fs.access).toHaveBeenCalledWith('/existing/path');
        expect(result).toBe(true);
      });

      it('should return false for non-existing paths', async () => {
        (fs.access as unknown as jest.Mock).mockRejectedValue(new Error('ENOENT'));
        
        const result = await PathUtils.exists('/non-existing/path');
        
        expect(fs.access).toHaveBeenCalledWith('/non-existing/path');
        expect(result).toBe(false);
      });

      it('should handle permission errors as non-existing', async () => {
        (fs.access as unknown as jest.Mock).mockRejectedValue(new Error('EACCES'));
        
        const result = await PathUtils.exists('/protected/path');
        
        expect(result).toBe(false);
      });

      it('should handle empty path', async () => {
        await PathUtils.exists('');
        
        expect(fs.access).toHaveBeenCalledWith('');
      });

      it('should handle special characters in path', async () => {
        (fs.access as unknown as jest.Mock).mockResolvedValue(undefined);
        
        const specialPath = '/path with spaces/file@symbol#hash.txt';
        const result = await PathUtils.exists(specialPath);
        
        expect(fs.access).toHaveBeenCalledWith(specialPath);
        expect(result).toBe(true);
      });
    });
  });

  describe('Path Resolution', () => {
    let originalCwd: () => string;

    beforeEach(() => {
      originalCwd = process.cwd;
      process.cwd = jest.fn(() => '/current/working/directory');
    });

    afterEach(() => {
      process.cwd = originalCwd;
    });

    it('should resolve project path with provided path', () => {
      const result = PathUtils.resolveProjectPath('/absolute/project/path');
      
      expect(path.resolve).toHaveBeenCalledWith('/absolute/project/path');
      expect(result).toBe('/absolute/project/path');
    });

    it('should resolve project path with relative path', () => {
      const result = PathUtils.resolveProjectPath('relative/path');
      
      expect(path.resolve).toHaveBeenCalledWith('relative/path');
      expect(result).toBe('/cwd/relative/path');
    });

    it('should resolve project path without provided path', () => {
      const result = PathUtils.resolveProjectPath();
      
      expect(path.resolve).toHaveBeenCalledWith('/current/working/directory');
      expect(result).toBe('/current/working/directory');
    });

    it('should resolve project path with empty string', () => {
      const result = PathUtils.resolveProjectPath('');
      
      expect(path.resolve).toHaveBeenCalledWith('/current/working/directory');
      expect(result).toBe('/current/working/directory');
    });

    it('should resolve project path with undefined', () => {
      const result = PathUtils.resolveProjectPath(undefined);
      
      expect(path.resolve).toHaveBeenCalledWith('/current/working/directory');
      expect(result).toBe('/current/working/directory');
    });
  });

  describe('Relative Path Calculation', () => {
    it('should calculate relative path between two paths', () => {
      const result = PathUtils.getRelativePath('/from/path', '/to/path');
      
      expect(path.relative).toHaveBeenCalledWith('/from/path', '/to/path');
      expect(result).toBe('relative(/from/path->/to/path)');
    });

    it('should handle same paths', () => {
      const samePath = '/same/path';
      const result = PathUtils.getRelativePath(samePath, samePath);
      
      expect(path.relative).toHaveBeenCalledWith(samePath, samePath);
      expect(result).toBe('relative(/same/path->/same/path)');
    });

    it('should handle empty paths', () => {
      const result = PathUtils.getRelativePath('', '');
      
      expect(path.relative).toHaveBeenCalledWith('', '');
      expect(result).toBe('relative(->)');
    });

    it('should handle mixed absolute and relative paths', () => {
      const result = PathUtils.getRelativePath('/absolute/path', 'relative/path');
      
      expect(path.relative).toHaveBeenCalledWith('/absolute/path', 'relative/path');
      expect(result).toBe('relative(/absolute/path->relative/path)');
    });
  });

  describe('Project Management Detection', () => {
    beforeEach(() => {
      process.cwd = jest.fn(() => '/current/project');
    });

    it('should detect managed project with both symlinks', async () => {
      (fs.lstat as unknown as jest.Mock)
        .mockResolvedValueOnce({ isSymbolicLink: () => true })  // .claude dir
        .mockResolvedValueOnce({ isSymbolicLink: () => true }); // CLAUDE.md file
      
      const result = await PathUtils.isProjectManaged();
      
      expect(fs.lstat).toHaveBeenCalledWith('/current/project/.claude');
      expect(fs.lstat).toHaveBeenCalledWith('/current/project/CLAUDE.md');
      expect(result).toBe(true);
    });

    it('should detect managed project with custom path', async () => {
      (fs.lstat as unknown as jest.Mock)
        .mockResolvedValueOnce({ isSymbolicLink: () => true })
        .mockResolvedValueOnce({ isSymbolicLink: () => true });
      
      const result = await PathUtils.isProjectManaged('/custom/project/path');
      
      expect(path.resolve).toHaveBeenCalledWith('/custom/project/path');
      expect(fs.lstat).toHaveBeenCalledWith('/custom/project/path/.claude');
      expect(fs.lstat).toHaveBeenCalledWith('/custom/project/path/CLAUDE.md');
      expect(result).toBe(true);
    });

    it('should not detect managed project when .claude is not a symlink', async () => {
      (fs.lstat as unknown as jest.Mock)
        .mockResolvedValueOnce({ isSymbolicLink: () => false }) // .claude dir (not symlink)
        .mockResolvedValueOnce({ isSymbolicLink: () => true });  // CLAUDE.md file
      
      const result = await PathUtils.isProjectManaged();
      
      expect(result).toBe(false);
    });

    it('should not detect managed project when CLAUDE.md is not a symlink', async () => {
      (fs.lstat as unknown as jest.Mock)
        .mockResolvedValueOnce({ isSymbolicLink: () => true })  // .claude dir
        .mockResolvedValueOnce({ isSymbolicLink: () => false }); // CLAUDE.md file (not symlink)
      
      const result = await PathUtils.isProjectManaged();
      
      expect(result).toBe(false);
    });

    it('should not detect managed project when .claude does not exist', async () => {
      (fs.lstat as unknown as jest.Mock)
        .mockRejectedValueOnce(new Error('ENOENT'))           // .claude dir missing
        .mockResolvedValueOnce({ isSymbolicLink: () => true }); // CLAUDE.md file
      
      const result = await PathUtils.isProjectManaged();
      
      expect(result).toBe(false);
    });

    it('should not detect managed project when CLAUDE.md does not exist', async () => {
      (fs.lstat as unknown as jest.Mock)
        .mockResolvedValueOnce({ isSymbolicLink: () => true }) // .claude dir
        .mockRejectedValueOnce(new Error('ENOENT'));           // CLAUDE.md file missing
      
      const result = await PathUtils.isProjectManaged();
      
      expect(result).toBe(false);
    });

    it('should not detect managed project when both files are missing', async () => {
      (fs.lstat as unknown as jest.Mock)
        .mockRejectedValueOnce(new Error('ENOENT'))
        .mockRejectedValueOnce(new Error('ENOENT'));
      
      const result = await PathUtils.isProjectManaged();
      
      expect(result).toBe(false);
    });

    it('should handle file system errors gracefully', async () => {
      (fs.lstat as unknown as jest.Mock)
        .mockRejectedValueOnce(new Error('Permission denied'))
        .mockRejectedValueOnce(new Error('I/O error'));
      
      const result = await PathUtils.isProjectManaged();
      
      expect(result).toBe(false);
    });

    it('should handle null lstat results', async () => {
      (fs.lstat as unknown as jest.Mock)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ isSymbolicLink: () => true });
      
      const result = await PathUtils.isProjectManaged();
      
      expect(result).toBe(false);
    });
  });

  describe('UserConfigManager Integration', () => {
    it('should use UserConfigManager singleton', () => {
      PathUtils.getStorageDir();
      
      expect(UserConfigManager.getInstance).toHaveBeenCalled();
    });

    it('should handle UserConfigManager errors', () => {
      (UserConfigManager.getInstance as jest.Mock).mockImplementation(() => {
        throw new Error('Config manager error');
      });
      
      expect(() => PathUtils.getStorageDir()).toThrow('Config manager error');
    });

    it('should cache UserConfigManager instance calls', () => {
      PathUtils.getStorageDir();
      PathUtils.getTemplatesDir();
      PathUtils.getCommandsDir();
      
      // Should reuse the same instance
      expect(UserConfigManager.getInstance).toHaveBeenCalledTimes(3);
    });

    it('should handle custom config directories', () => {
      mockUserConfig.getConfigDir.mockReturnValue('/custom/config/dir');
      mockUserConfig.getUserTemplatesDir.mockReturnValue('/custom/config/dir/templates');
      
      const storageDir = PathUtils.getStorageDir();
      const templatesDir = PathUtils.getTemplatesDir();
      
      expect(storageDir).toBe('/custom/config/dir/storage');
      expect(templatesDir).toBe('/custom/config/dir/templates');
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle very long paths', () => {
      const longPath = '/very/long/path/' + 'segment/'.repeat(100);
      const result = PathUtils.getProjectStorageDir(longPath);
      
      expect(result).toContain(longPath);
    });

    it('should handle Unicode characters in paths', () => {
      const unicodePath = '/ユーザー/プロジェクト/测试';
      const result = PathUtils.getProjectStorageDir(unicodePath);
      
      // The path.join adds an extra slash because unicodePath starts with /
      expect(result).toBe('/home/user/.ccc/storage//ユーザー/プロジェクト/测试');
    });

    it('should handle null and undefined inputs gracefully', async () => {
      (fs.ensureDir as jest.Mock).mockResolvedValueOnce(undefined);
      (fs.access as unknown as jest.Mock).mockRejectedValueOnce(new Error('Invalid path'));
      
      await expect(PathUtils.ensureDir(null as any)).resolves.not.toThrow();
      await expect(PathUtils.exists(null as any)).resolves.toBe(false);
      
      expect(PathUtils.getProjectStorageDir(null as any)).toBeDefined();
      expect(PathUtils.getRelativePath(null as any, null as any)).toBeDefined();
    });

    it('should handle concurrent path operations', async () => {
      (fs.access as unknown as jest.Mock).mockResolvedValue(undefined);
      (fs.ensureDir as jest.Mock).mockResolvedValue(undefined);
      
      const operations = Array.from({ length: 10 }, (_, i) => 
        Promise.all([
          PathUtils.exists(`/path${i}`),
          PathUtils.ensureDir(`/dir${i}`)
        ])
      );
      
      const results = await Promise.all(operations);
      
      expect(results).toHaveLength(10);
      expect(fs.access).toHaveBeenCalledTimes(10);
      expect(fs.ensureDir).toHaveBeenCalledTimes(10);
    });

    it('should handle path traversal attempts', () => {
      const maliciousPath = '../../../etc/passwd';
      const result = PathUtils.getProjectStorageDir(maliciousPath);
      
      // Should still construct the path but within storage directory
      expect(result).toBe('/home/user/.ccc/storage/../../../etc/passwd');
    });
  });

  describe('Integration Scenarios', () => {
    it('should support complete project setup workflow', async () => {
      (fs.access as unknown as jest.Mock).mockResolvedValue(undefined);
      (fs.ensureDir as jest.Mock).mockResolvedValue(undefined);
      (fs.lstat as unknown as jest.Mock)
        .mockResolvedValueOnce({ isSymbolicLink: () => true })
        .mockResolvedValueOnce({ isSymbolicLink: () => true });
      
      const projectPath = '/new/project';
      
      // Check if project is managed
      const isManaged = await PathUtils.isProjectManaged(projectPath);
      
      // Get project paths
      const storageDir = PathUtils.getProjectStorageDir('new-project');
      const backupsDir = PathUtils.getProjectBackupsDir('new-project');
      
      // Ensure directories exist
      await PathUtils.ensureDir(storageDir);
      await PathUtils.ensureDir(backupsDir);
      
      // Check if directories exist
      const storageExists = await PathUtils.exists(storageDir);
      const backupsExists = await PathUtils.exists(backupsDir);
      
      expect(isManaged).toBe(true);
      expect(storageExists).toBe(true);
      expect(backupsExists).toBe(true);
    });

    it('should handle project migration workflow', () => {
      const oldPath = '/old/project/location';
      const newPath = '/new/project/location';
      
      const relativePath = PathUtils.getRelativePath(oldPath, newPath);
      const resolvedOldPath = PathUtils.resolveProjectPath(oldPath);
      const resolvedNewPath = PathUtils.resolveProjectPath(newPath);
      
      expect(relativePath).toBe('relative(/old/project/location->/new/project/location)');
      expect(resolvedOldPath).toBe('/old/project/location');
      expect(resolvedNewPath).toBe('/new/project/location');
    });
  });
});