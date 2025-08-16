import { PathUtils } from '../../../src/utils/paths';
import * as path from 'path';

describe('PathUtils', () => {
  let originalCwd: () => string;

  beforeEach(() => {
    originalCwd = process.cwd;
  });

  afterEach(() => {
    process.cwd = originalCwd;
    delete process.env.CCC_CONFIG_DIR;
  });

  describe('resolveProjectPath', () => {
    it('should return current working directory when no path provided', () => {
      const testCwd = '/current/working/dir';
      process.cwd = jest.fn().mockReturnValue(testCwd);
      
      const result = PathUtils.resolveProjectPath();
      expect(result).toBe(testCwd);
    });

    it('should resolve relative paths correctly', () => {
      const relativePath = './relative/path';
      const result = PathUtils.resolveProjectPath(relativePath);
      const expected = path.resolve(relativePath);
      expect(result).toBe(expected);
    });

    it('should resolve absolute paths correctly', () => {
      const absolutePath = '/absolute/path/to/project';
      const result = PathUtils.resolveProjectPath(absolutePath);
      expect(result).toBe(absolutePath);
    });
  });

  describe('path consistency', () => {
    it('should return consistent storage paths', () => {
      const storageDir = PathUtils.getStorageDir();
      const projectName = 'test-project';
      const projectStorageDir = PathUtils.getProjectStorageDir(projectName);
      const backupsDir = PathUtils.getProjectBackupsDir(projectName);
      
      expect(typeof storageDir).toBe('string');
      expect(storageDir.length).toBeGreaterThan(0);
      
      expect(projectStorageDir).toContain(storageDir);
      expect(projectStorageDir).toContain(projectName);
      
      expect(backupsDir).toContain(projectStorageDir);
      expect(backupsDir).toContain('.backups');
    });

    it('should return consistent template paths', () => {
      const templatesDir = PathUtils.getTemplatesDir();
      expect(typeof templatesDir).toBe('string');
      expect(templatesDir.length).toBeGreaterThan(0);
    });

    it('should return consistent agent paths', () => {
      const agentsDir = PathUtils.getAgentsDir();
      expect(typeof agentsDir).toBe('string');
      expect(agentsDir.length).toBeGreaterThan(0);
    });

    it('should return consistent command paths', () => {
      const commandsDir = PathUtils.getCommandsDir();
      expect(typeof commandsDir).toBe('string');
      expect(commandsDir.length).toBeGreaterThan(0);
    });

    it('should return consistent hook paths', () => {
      const hooksDir = PathUtils.getHooksDir();
      expect(typeof hooksDir).toBe('string');
      expect(hooksDir.length).toBeGreaterThan(0);
    });
  });

  describe('getRelativePath', () => {
    it('should return relative path between two directories', () => {
      const from = '/users/test/project';
      const to = '/users/test/project/src/index.ts';
      const result = PathUtils.getRelativePath(from, to);
      expect(result).toBe('src/index.ts');
    });

    it('should handle parent directories', () => {
      const from = '/users/test/project/src';
      const to = '/users/test/project/package.json';
      const result = PathUtils.getRelativePath(from, to);
      expect(result).toBe('../package.json');
    });

    it('should handle same directory', () => {
      const from = '/users/test/project';
      const to = '/users/test/project';
      const result = PathUtils.getRelativePath(from, to);
      expect(result).toBe('');
    });

    it('should handle completely different paths', () => {
      const from = '/users/test/project1';
      const to = '/users/test/project2/file.txt';
      const result = PathUtils.getRelativePath(from, to);
      expect(result).toBe('../project2/file.txt');
    });
  });

  describe('getProjectStorageDir', () => {
    it('should return storage directory for a project', () => {
      const projectName = 'test-project';
      const result = PathUtils.getProjectStorageDir(projectName);
      const storageDir = PathUtils.getStorageDir();
      
      expect(result).toBe(path.join(storageDir, projectName));
      expect(result).toContain(projectName);
    });

    it('should handle different project names', () => {
      const projects = ['project1', 'my-project', 'test-123'];
      
      projects.forEach(project => {
        const result = PathUtils.getProjectStorageDir(project);
        expect(result).toContain(project);
        expect(typeof result).toBe('string');
        expect(result.length).toBeGreaterThan(0);
      });
    });

    it('should return different paths for different projects', () => {
      const project1 = PathUtils.getProjectStorageDir('project1');
      const project2 = PathUtils.getProjectStorageDir('project2');
      
      expect(project1).not.toBe(project2);
      expect(project1).toContain('project1');
      expect(project2).toContain('project2');
    });
  });

  describe('getProjectBackupsDir', () => {
    it('should return backups directory for a project', () => {
      const projectName = 'test-project';
      const result = PathUtils.getProjectBackupsDir(projectName);
      const projectStorageDir = PathUtils.getProjectStorageDir(projectName);
      
      expect(result).toBe(path.join(projectStorageDir, '.backups'));
      expect(result).toContain(projectName);
      expect(result).toContain('.backups');
    });

    it('should be inside project storage directory', () => {
      const projectName = 'test-project';
      const backupsDir = PathUtils.getProjectBackupsDir(projectName);
      const storageDir = PathUtils.getProjectStorageDir(projectName);
      
      expect(backupsDir).toContain(storageDir);
    });
  });

  describe('getGlobalCommandsDir', () => {
    it('should return global commands directory', () => {
      const result = PathUtils.getGlobalCommandsDir();
      
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
      expect(result).toContain('commands');
      expect(result).toContain('.claude');
    });

    it('should be in home directory', () => {
      const result = PathUtils.getGlobalCommandsDir();
      const homedir = require('os').homedir();
      
      expect(result).toContain(homedir);
    });
  });

  describe('Directory structure consistency', () => {
    it('should maintain consistent directory hierarchy', () => {
      const projectName = 'test-project';
      const storageDir = PathUtils.getStorageDir();
      const projectStorageDir = PathUtils.getProjectStorageDir(projectName);
      const backupsDir = PathUtils.getProjectBackupsDir(projectName);
      
      // Storage dir should be the root
      expect(projectStorageDir).toContain(storageDir);
      
      // Backups should be inside project storage
      expect(backupsDir).toContain(projectStorageDir);
      
      // All paths should be absolute
      expect(path.isAbsolute(storageDir)).toBe(true);
      expect(path.isAbsolute(projectStorageDir)).toBe(true);
      expect(path.isAbsolute(backupsDir)).toBe(true);
    });

    it('should return normalized paths', () => {
      const paths = [
        PathUtils.getStorageDir(),
        PathUtils.getTemplatesDir(),
        PathUtils.getCommandsDir(),
        PathUtils.getAgentsDir(),
        PathUtils.getHooksDir(),
        PathUtils.getProjectStorageDir('test'),
        PathUtils.getProjectBackupsDir('test'),
        PathUtils.getGlobalCommandsDir()
      ];

      paths.forEach(dirPath => {
        expect(dirPath).toBe(path.normalize(dirPath));
        expect(dirPath).not.toContain('//');
        expect(dirPath).not.toContain('\\\\');
      });
    });
  });

  describe('resolveProjectPath edge cases', () => {
    it('should handle empty string', () => {
      const result = PathUtils.resolveProjectPath('');
      expect(result).toBe(process.cwd());
    });

    it('should handle null/undefined', () => {
      const result1 = PathUtils.resolveProjectPath(undefined);
      const result2 = PathUtils.resolveProjectPath();
      
      expect(result1).toBe(process.cwd());
      expect(result2).toBe(process.cwd());
    });

    it('should handle complex relative paths', () => {
      const relativePath = '../../../test/path';
      const result = PathUtils.resolveProjectPath(relativePath);
      const expected = path.resolve(relativePath);
      
      expect(result).toBe(expected);
    });

    it('should handle paths with spaces', () => {
      const pathWithSpaces = '/path/with spaces/project';
      const result = PathUtils.resolveProjectPath(pathWithSpaces);
      
      expect(result).toBe(pathWithSpaces);
    });
  });

  describe('Method signatures and types', () => {
    it('should have correct static method signatures', () => {
      expect(typeof PathUtils.getStorageDir).toBe('function');
      expect(typeof PathUtils.getTemplatesDir).toBe('function');
      expect(typeof PathUtils.getCommandsDir).toBe('function');
      expect(typeof PathUtils.getAgentsDir).toBe('function');
      expect(typeof PathUtils.getHooksDir).toBe('function');
      expect(typeof PathUtils.getProjectStorageDir).toBe('function');
      expect(typeof PathUtils.getProjectBackupsDir).toBe('function');
      expect(typeof PathUtils.getGlobalCommandsDir).toBe('function');
      expect(typeof PathUtils.resolveProjectPath).toBe('function');
      expect(typeof PathUtils.getRelativePath).toBe('function');
    });

    it('should return strings for all path methods', () => {
      const methods = [
        () => PathUtils.getStorageDir(),
        () => PathUtils.getTemplatesDir(),
        () => PathUtils.getCommandsDir(),
        () => PathUtils.getAgentsDir(),
        () => PathUtils.getHooksDir(),
        () => PathUtils.getProjectStorageDir('test'),
        () => PathUtils.getProjectBackupsDir('test'),
        () => PathUtils.getGlobalCommandsDir(),
        () => PathUtils.resolveProjectPath(),
        () => PathUtils.getRelativePath('/a', '/b')
      ];

      methods.forEach(method => {
        const result = method();
        expect(typeof result).toBe('string');
        expect(result.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Error handling', () => {
    it('should handle special characters in project names', () => {
      const specialNames = [
        'project-with-dashes',
        'project_with_underscores',
        'project.with.dots',
        'project123',
        '123project'
      ];

      specialNames.forEach(name => {
        const storageDir = PathUtils.getProjectStorageDir(name);
        const backupsDir = PathUtils.getProjectBackupsDir(name);
        
        expect(storageDir).toContain(name);
        expect(backupsDir).toContain(name);
        expect(typeof storageDir).toBe('string');
        expect(typeof backupsDir).toBe('string');
      });
    });

    it('should handle very long project names', () => {
      const longName = 'a'.repeat(100);
      const storageDir = PathUtils.getProjectStorageDir(longName);
      const backupsDir = PathUtils.getProjectBackupsDir(longName);
      
      expect(storageDir).toContain(longName);
      expect(backupsDir).toContain(longName);
    });
  });
});