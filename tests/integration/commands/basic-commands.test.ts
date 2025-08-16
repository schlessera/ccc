import { configureForTesting, clearServices, ServiceKeys, getService } from '../../../src/core/container';
import { IFileSystem } from '../../../src/core/interfaces/filesystem';

// Mock the Logger to avoid console output during tests
jest.mock('../../../src/utils/logger', () => ({
  Logger: {
    debug: jest.fn(),
    success: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  }
}));

describe('Basic Commands Integration', () => {
  let fileSystem: IFileSystem;

  beforeEach(() => {
    // Configure for testing with in-memory filesystem
    configureForTesting();
    fileSystem = getService(ServiceKeys.FileSystem) as IFileSystem;
  });

  afterEach(() => {
    clearServices();
  });

  describe('Container and Service Management', () => {
    it('should configure services for testing', () => {
      expect(fileSystem).toBeDefined();
      expect(typeof fileSystem.exists).toBe('function');
      expect(typeof fileSystem.writeFile).toBe('function');
      expect(typeof fileSystem.readFile).toBe('function');
    });

    it('should provide filesystem service', async () => {
      const testFile = '/test/integration.txt';
      const testContent = 'Integration test content';

      await fileSystem.writeFile(testFile, testContent);
      const exists = await fileSystem.exists(testFile);
      expect(exists).toBe(true);

      const content = await fileSystem.readFile(testFile);
      expect(content).toBe(testContent);
    });

    it('should clear services correctly', () => {
      clearServices();
      
      // After clearing, getting services should still work (they'll be recreated)
      const newFileSystem = getService(ServiceKeys.FileSystem) as IFileSystem;
      expect(newFileSystem).toBeDefined();
    });
  });

  describe('File System Operations', () => {
    it('should handle directory creation', async () => {
      const testDir = '/test/new/directory';
      
      await fileSystem.mkdir(testDir, { recursive: true });
      const exists = await fileSystem.exists(testDir);
      expect(exists).toBe(true);
    });

    it('should handle file operations', async () => {
      const testFile = '/test/file-ops.txt';
      const content1 = 'First content';
      const content2 = 'Updated content';

      // Write initial content
      await fileSystem.writeFile(testFile, content1);
      expect(await fileSystem.readFile(testFile)).toBe(content1);

      // Update content
      await fileSystem.writeFile(testFile, content2);
      expect(await fileSystem.readFile(testFile)).toBe(content2);
    });

    it('should handle JSON operations', async () => {
      const testFile = '/test/data.json';
      const data = {
        name: 'test',
        value: 42,
        nested: {
          array: [1, 2, 3],
          boolean: true
        }
      };

      await fileSystem.writeJSON(testFile, data);
      const readData = await fileSystem.readJSON(testFile);
      expect(readData).toEqual(data);
    });

    it('should handle file copying', async () => {
      const sourceFile = '/test/source.txt';
      const destFile = '/test/destination.txt';
      const content = 'Content to copy';

      await fileSystem.writeFile(sourceFile, content);
      await fileSystem.copy(sourceFile, destFile);

      expect(await fileSystem.exists(destFile)).toBe(true);
      expect(await fileSystem.readFile(destFile)).toBe(content);
    });

    it('should handle directory listing', async () => {
      const testDir = '/test/listing';
      
      // Create some files and directories
      await fileSystem.writeFile(`${testDir}/file1.txt`, 'content1');
      await fileSystem.writeFile(`${testDir}/file2.txt`, 'content2');
      await fileSystem.mkdir(`${testDir}/subdir`, { recursive: true });

      const entries = await fileSystem.readdir(testDir);
      expect(entries).toHaveLength(3);
      expect(entries).toContain('file1.txt');
      expect(entries).toContain('file2.txt');
      expect(entries).toContain('subdir');
    });

    it('should handle file removal', async () => {
      const testFile = '/test/to-remove.txt';
      
      await fileSystem.writeFile(testFile, 'content');
      expect(await fileSystem.exists(testFile)).toBe(true);

      await fileSystem.remove(testFile);
      expect(await fileSystem.exists(testFile)).toBe(false);
    });
  });

  describe('Error Handling in Integration', () => {
    it('should handle non-existent file reads gracefully', async () => {
      await expect(fileSystem.readFile('/non/existent/file.txt'))
        .rejects.toThrow();
    });

    it('should handle non-existent directory listing gracefully', async () => {
      await expect(fileSystem.readdir('/non/existent/directory'))
        .rejects.toThrow();
    });

    it('should handle stats for non-existent files gracefully', async () => {
      await expect(fileSystem.stat('/non/existent/file.txt'))
        .rejects.toThrow();
    });
  });

  describe('Path Operations Integration', () => {
    it('should handle path operations correctly', () => {
      expect(fileSystem.join('a', 'b', 'c')).toBe('a/b/c');
      expect(fileSystem.dirname('/path/to/file.txt')).toBe('/path/to');
      expect(fileSystem.basename('/path/to/file.txt')).toBe('file.txt');
      expect(fileSystem.extname('file.txt')).toBe('.txt');
    });

    it('should handle absolute path checks', () => {
      expect(fileSystem.isAbsolute('/absolute/path')).toBe(true);
      expect(fileSystem.isAbsolute('relative/path')).toBe(false);
    });
  });

  describe('Service Lifecycle', () => {
    it('should maintain service state across operations', async () => {
      const fs1 = getService(ServiceKeys.FileSystem) as IFileSystem;
      const fs2 = getService(ServiceKeys.FileSystem) as IFileSystem;
      
      // Should get the same instance (singleton)
      expect(fs1).toBe(fs2);
      
      // State should persist
      await fs1.writeFile('/test/persistence.txt', 'persistent data');
      expect(await fs2.exists('/test/persistence.txt')).toBe(true);
    });

    it('should handle service reconfiguration', () => {
      const originalFs = getService(ServiceKeys.FileSystem);
      
      // Clear and reconfigure
      clearServices();
      configureForTesting();
      
      const newFs = getService(ServiceKeys.FileSystem);
      expect(newFs).toBeDefined();
      // Should be a new instance after clearing
      expect(newFs).not.toBe(originalFs);
    });
  });

  describe('Complex Operations', () => {
    it('should handle nested directory structures', async () => {
      const deepPath = '/test/very/deep/nested/structure';
      const fileName = 'deep-file.txt';
      const fullPath = fileSystem.join(deepPath, fileName);
      
      await fileSystem.writeFile(fullPath, 'deep content');
      expect(await fileSystem.exists(fullPath)).toBe(true);
      
      const content = await fileSystem.readFile(fullPath);
      expect(content).toBe('deep content');
    });

    it('should handle concurrent operations', async () => {
      const promises = [];
      
      for (let i = 0; i < 10; i++) {
        promises.push(
          fileSystem.writeFile(`/test/concurrent-${i}.txt`, `content-${i}`)
        );
      }
      
      await Promise.all(promises);
      
      // Verify all files were created
      for (let i = 0; i < 10; i++) {
        const exists = await fileSystem.exists(`/test/concurrent-${i}.txt`);
        expect(exists).toBe(true);
      }
    });

    it('should handle copy with options', async () => {
      const sourceFile = '/test/copy-source.txt';
      const destFile = '/test/copy-dest.txt';
      const content = 'Copy test content';

      await fileSystem.writeFile(sourceFile, content);
      await fileSystem.writeFile(destFile, 'existing content');

      // Copy without overwrite should not change destination
      await fileSystem.copy(sourceFile, destFile, { overwrite: false });
      expect(await fileSystem.readFile(destFile)).toBe('existing content');

      // Copy with overwrite should change destination
      await fileSystem.copy(sourceFile, destFile, { overwrite: true });
      expect(await fileSystem.readFile(destFile)).toBe(content);
    });
  });
});