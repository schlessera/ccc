import { NodeFileSystem } from '../../../../src/core/filesystem/node-filesystem';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs-extra';

describe('NodeFileSystem (Comprehensive)', () => {
  let nodeFileSystem: NodeFileSystem;
  let tempDir: string;

  beforeEach(async () => {
    nodeFileSystem = new NodeFileSystem();
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ccc-test-'));
  });

  afterEach(async () => {
    // Clean up temp directory
    if (tempDir && await fs.pathExists(tempDir)) {
      await fs.remove(tempDir);
    }
  });

  describe('Basic File Operations', () => {
    it('should be instantiable', () => {
      expect(nodeFileSystem).toBeInstanceOf(NodeFileSystem);
    });

    it('should write and read files', async () => {
      const filePath = path.join(tempDir, 'test.txt');
      const content = 'Hello, World!';

      await nodeFileSystem.writeFile(filePath, content);
      const readContent = await nodeFileSystem.readFile(filePath);

      expect(readContent).toBe(content);
    });

    it('should handle different encodings', async () => {
      const filePath = path.join(tempDir, 'encoding.txt');
      const content = 'Test content with special chars: áéíóú';

      await nodeFileSystem.writeFile(filePath, content, 'utf-8');
      const readContent = await nodeFileSystem.readFile(filePath, 'utf-8');

      expect(readContent).toBe(content);
    });

    it('should create parent directories when writing files', async () => {
      const filePath = path.join(tempDir, 'nested', 'deep', 'file.txt');
      const content = 'Nested file content';

      await nodeFileSystem.writeFile(filePath, content);
      expect(await nodeFileSystem.exists(filePath)).toBe(true);
      
      const readContent = await nodeFileSystem.readFile(filePath);
      expect(readContent).toBe(content);
    });

    it('should handle empty files', async () => {
      const filePath = path.join(tempDir, 'empty.txt');
      
      await nodeFileSystem.writeFile(filePath, '');
      const content = await nodeFileSystem.readFile(filePath);
      
      expect(content).toBe('');
    });
  });

  describe('JSON Operations', () => {
    it('should write and read JSON objects', async () => {
      const filePath = path.join(tempDir, 'data.json');
      const data = { name: 'Test', version: '1.0.0', items: [1, 2, 3] };

      await nodeFileSystem.writeJSON(filePath, data);
      const readData = await nodeFileSystem.readJSON(filePath);

      expect(readData).toEqual(data);
    });

    it('should format JSON with specified spacing', async () => {
      const filePath = path.join(tempDir, 'formatted.json');
      const data = { test: 'value', nested: { key: 'value' } };

      await nodeFileSystem.writeJSON(filePath, data, { spaces: 4 });
      const rawContent = await nodeFileSystem.readFile(filePath);

      expect(rawContent).toContain('    '); // Should have 4-space indentation
    });

    it('should create parent directories for JSON files', async () => {
      const filePath = path.join(tempDir, 'nested', 'config.json');
      const data = { config: 'value' };

      await nodeFileSystem.writeJSON(filePath, data);
      expect(await nodeFileSystem.exists(filePath)).toBe(true);
      
      const readData = await nodeFileSystem.readJSON(filePath);
      expect(readData).toEqual(data);
    });

    it('should handle complex JSON structures', async () => {
      const filePath = path.join(tempDir, 'complex.json');
      const data = {
        string: 'value',
        number: 42,
        boolean: true,
        null: null,
        array: [1, 'two', { three: 3 }],
        object: {
          nested: {
            deeply: {
              value: 'found'
            }
          }
        }
      };

      await nodeFileSystem.writeJSON(filePath, data);
      const readData = await nodeFileSystem.readJSON(filePath);

      expect(readData).toEqual(data);
    });
  });

  describe('Directory Operations', () => {
    it('should create directories', async () => {
      const dirPath = path.join(tempDir, 'testdir');

      await nodeFileSystem.mkdir(dirPath);
      expect(await nodeFileSystem.exists(dirPath)).toBe(true);
      
      const stat = await nodeFileSystem.stat(dirPath);
      expect(stat.isDirectory()).toBe(true);
    });

    it('should create directories recursively', async () => {
      const dirPath = path.join(tempDir, 'deep', 'nested', 'directory');

      await nodeFileSystem.mkdir(dirPath, { recursive: true });
      expect(await nodeFileSystem.exists(dirPath)).toBe(true);
    });

    it('should list directory contents', async () => {
      const dirPath = path.join(tempDir, 'listtest');
      await nodeFileSystem.mkdir(dirPath);

      // Create some files and directories
      await nodeFileSystem.writeFile(path.join(dirPath, 'file1.txt'), 'content1');
      await nodeFileSystem.writeFile(path.join(dirPath, 'file2.txt'), 'content2');
      await nodeFileSystem.mkdir(path.join(dirPath, 'subdir'));

      const entries = await nodeFileSystem.readdir(dirPath);
      
      expect(entries).toContain('file1.txt');
      expect(entries).toContain('file2.txt');
      expect(entries).toContain('subdir');
      expect(entries).toHaveLength(3);
    });

    it('should handle empty directories', async () => {
      const dirPath = path.join(tempDir, 'emptydir');
      await nodeFileSystem.mkdir(dirPath);

      const entries = await nodeFileSystem.readdir(dirPath);
      expect(entries).toEqual([]);
    });
  });

  describe('File System Queries', () => {
    it('should check if files exist', async () => {
      const existsPath = path.join(tempDir, 'exists.txt');
      const notExistsPath = path.join(tempDir, 'notexists.txt');

      await nodeFileSystem.writeFile(existsPath, 'content');

      expect(await nodeFileSystem.exists(existsPath)).toBe(true);
      expect(await nodeFileSystem.exists(notExistsPath)).toBe(false);
    });

    it('should get file stats', async () => {
      const filePath = path.join(tempDir, 'stattest.txt');
      const dirPath = path.join(tempDir, 'statdir');

      await nodeFileSystem.writeFile(filePath, 'content');
      await nodeFileSystem.mkdir(dirPath);

      const fileStat = await nodeFileSystem.stat(filePath);
      const dirStat = await nodeFileSystem.stat(dirPath);

      expect(fileStat.isFile()).toBe(true);
      expect(fileStat.isDirectory()).toBe(false);
      expect(dirStat.isFile()).toBe(false);
      expect(dirStat.isDirectory()).toBe(true);
    });

    it('should handle stat on non-existent files', async () => {
      const nonExistentPath = path.join(tempDir, 'nonexistent.txt');

      await expect(nodeFileSystem.stat(nonExistentPath)).rejects.toThrow();
    });
  });

  describe('File and Directory Removal', () => {
    it('should remove files', async () => {
      const filePath = path.join(tempDir, 'remove.txt');
      
      await nodeFileSystem.writeFile(filePath, 'content');
      expect(await nodeFileSystem.exists(filePath)).toBe(true);

      await nodeFileSystem.remove(filePath);
      expect(await nodeFileSystem.exists(filePath)).toBe(false);
    });

    it('should remove empty directories', async () => {
      const dirPath = path.join(tempDir, 'removedir');
      
      await nodeFileSystem.mkdir(dirPath);
      expect(await nodeFileSystem.exists(dirPath)).toBe(true);

      await nodeFileSystem.remove(dirPath);
      expect(await nodeFileSystem.exists(dirPath)).toBe(false);
    });

    it('should remove directories with contents', async () => {
      const dirPath = path.join(tempDir, 'removecontents');
      const filePath = path.join(dirPath, 'file.txt');
      const subDirPath = path.join(dirPath, 'subdir');
      
      await nodeFileSystem.mkdir(dirPath);
      await nodeFileSystem.writeFile(filePath, 'content');
      await nodeFileSystem.mkdir(subDirPath);

      await nodeFileSystem.remove(dirPath);
      expect(await nodeFileSystem.exists(dirPath)).toBe(false);
    });

    it('should handle removing non-existent files gracefully', async () => {
      const nonExistentPath = path.join(tempDir, 'nonexistent.txt');

      // Should not throw
      await expect(nodeFileSystem.remove(nonExistentPath)).resolves.not.toThrow();
    });
  });

  describe('Copy Operations', () => {
    it('should copy files', async () => {
      const srcPath = path.join(tempDir, 'source.txt');
      const destPath = path.join(tempDir, 'destination.txt');
      const content = 'File content to copy';

      await nodeFileSystem.writeFile(srcPath, content);
      await nodeFileSystem.copy(srcPath, destPath);

      expect(await nodeFileSystem.exists(destPath)).toBe(true);
      const copiedContent = await nodeFileSystem.readFile(destPath);
      expect(copiedContent).toBe(content);
    });

    it('should copy directories recursively', async () => {
      const srcDir = path.join(tempDir, 'srcdir');
      const destDir = path.join(tempDir, 'destdir');

      // Create source directory structure
      await nodeFileSystem.mkdir(srcDir);
      await nodeFileSystem.writeFile(path.join(srcDir, 'file1.txt'), 'content1');
      await nodeFileSystem.mkdir(path.join(srcDir, 'subdir'));
      await nodeFileSystem.writeFile(path.join(srcDir, 'subdir', 'file2.txt'), 'content2');

      await nodeFileSystem.copy(srcDir, destDir);

      expect(await nodeFileSystem.exists(path.join(destDir, 'file1.txt'))).toBe(true);
      expect(await nodeFileSystem.exists(path.join(destDir, 'subdir', 'file2.txt'))).toBe(true);
      
      const content1 = await nodeFileSystem.readFile(path.join(destDir, 'file1.txt'));
      const content2 = await nodeFileSystem.readFile(path.join(destDir, 'subdir', 'file2.txt'));
      
      expect(content1).toBe('content1');
      expect(content2).toBe('content2');
    });

    it('should create parent directories when copying', async () => {
      const srcPath = path.join(tempDir, 'source.txt');
      const destPath = path.join(tempDir, 'nested', 'deep', 'destination.txt');
      const content = 'Content for nested copy';

      await nodeFileSystem.writeFile(srcPath, content);
      await nodeFileSystem.copy(srcPath, destPath);

      expect(await nodeFileSystem.exists(destPath)).toBe(true);
      const copiedContent = await nodeFileSystem.readFile(destPath);
      expect(copiedContent).toBe(content);
    });

    it('should handle copy options', async () => {
      const srcPath = path.join(tempDir, 'source.txt');
      const destPath = path.join(tempDir, 'destination.txt');

      await nodeFileSystem.writeFile(srcPath, 'original');
      await nodeFileSystem.writeFile(destPath, 'existing');

      // Should overwrite by default
      await nodeFileSystem.copy(srcPath, destPath, { overwrite: true });
      const content = await nodeFileSystem.readFile(destPath);
      expect(content).toBe('original');
    });

    it('should handle copy with filter function', async () => {
      const srcDir = path.join(tempDir, 'srcfilter');
      const destDir = path.join(tempDir, 'destfilter');

      // Create source structure
      await nodeFileSystem.mkdir(srcDir);
      await nodeFileSystem.writeFile(path.join(srcDir, 'keep.txt'), 'keep this');
      await nodeFileSystem.writeFile(path.join(srcDir, 'ignore.tmp'), 'ignore this');
      
      // Copy with filter
      await nodeFileSystem.copy(srcDir, destDir, {
        filter: (src) => !src.endsWith('.tmp')
      });

      expect(await nodeFileSystem.exists(path.join(destDir, 'keep.txt'))).toBe(true);
      expect(await nodeFileSystem.exists(path.join(destDir, 'ignore.tmp'))).toBe(false);
    });
  });

  describe('Move Operations', () => {
    it('should move files', async () => {
      const srcPath = path.join(tempDir, 'movesource.txt');
      const destPath = path.join(tempDir, 'movedest.txt');
      const content = 'File to move';

      await nodeFileSystem.writeFile(srcPath, content);
      await nodeFileSystem.move(srcPath, destPath);

      expect(await nodeFileSystem.exists(srcPath)).toBe(false);
      expect(await nodeFileSystem.exists(destPath)).toBe(true);
      
      const movedContent = await nodeFileSystem.readFile(destPath);
      expect(movedContent).toBe(content);
    });

    it('should move directories', async () => {
      const srcDir = path.join(tempDir, 'movesrcdir');
      const destDir = path.join(tempDir, 'movedestdir');

      await nodeFileSystem.mkdir(srcDir);
      await nodeFileSystem.writeFile(path.join(srcDir, 'file.txt'), 'content');

      await nodeFileSystem.move(srcDir, destDir);

      expect(await nodeFileSystem.exists(srcDir)).toBe(false);
      expect(await nodeFileSystem.exists(destDir)).toBe(true);
      expect(await nodeFileSystem.exists(path.join(destDir, 'file.txt'))).toBe(true);
    });

    it('should create parent directories when moving', async () => {
      const srcPath = path.join(tempDir, 'movesource.txt');
      const destPath = path.join(tempDir, 'nested', 'move', 'destination.txt');

      await nodeFileSystem.writeFile(srcPath, 'move content');
      await nodeFileSystem.move(srcPath, destPath);

      expect(await nodeFileSystem.exists(srcPath)).toBe(false);
      expect(await nodeFileSystem.exists(destPath)).toBe(true);
    });
  });

  describe('Path Operations', () => {
    it('should get directory name', () => {
      const filePath = '/path/to/file.txt';
      const dirName = nodeFileSystem.dirname(filePath);
      expect(dirName).toBe('/path/to');
    });

    it('should join paths', () => {
      const joined = nodeFileSystem.join('path', 'to', 'file.txt');
      expect(joined).toBe(path.join('path', 'to', 'file.txt'));
    });

    it('should resolve paths', () => {
      const resolved = nodeFileSystem.resolve('relative', 'path');
      expect(path.isAbsolute(resolved)).toBe(true);
    });

    it('should get basename', () => {
      const filePath = '/path/to/file.txt';
      const basename = nodeFileSystem.basename(filePath);
      expect(basename).toBe('file.txt');
    });

    it('should get basename without extension', () => {
      const filePath = '/path/to/file.txt';
      const basename = nodeFileSystem.basename(filePath, '.txt');
      expect(basename).toBe('file');
    });

    it('should get file extension', () => {
      const filePath = '/path/to/file.txt';
      const ext = nodeFileSystem.extname(filePath);
      expect(ext).toBe('.txt');
    });

    it('should get relative path', () => {
      const from = '/path/from';
      const to = '/path/to/file.txt';
      const relative = nodeFileSystem.relative(from, to);
      expect(relative).toBe(path.relative(from, to));
    });

    it('should check if path is absolute', () => {
      expect(nodeFileSystem.isAbsolute('/absolute/path')).toBe(true);
      expect(nodeFileSystem.isAbsolute('relative/path')).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should throw error when reading non-existent file', async () => {
      const nonExistentPath = path.join(tempDir, 'nonexistent.txt');
      
      await expect(nodeFileSystem.readFile(nonExistentPath)).rejects.toThrow();
    });

    it('should throw error when reading invalid JSON', async () => {
      const jsonPath = path.join(tempDir, 'invalid.json');
      await nodeFileSystem.writeFile(jsonPath, 'invalid json content {');
      
      await expect(nodeFileSystem.readJSON(jsonPath)).rejects.toThrow();
    });

    it('should throw error when copying non-existent file', async () => {
      const srcPath = path.join(tempDir, 'nonexistent.txt');
      const destPath = path.join(tempDir, 'destination.txt');
      
      await expect(nodeFileSystem.copy(srcPath, destPath)).rejects.toThrow();
    });

    it('should throw error when moving non-existent file', async () => {
      const srcPath = path.join(tempDir, 'nonexistent.txt');
      const destPath = path.join(tempDir, 'destination.txt');
      
      await expect(nodeFileSystem.move(srcPath, destPath)).rejects.toThrow();
    });
  });

  describe('Performance and Edge Cases', () => {
    it('should handle large files', async () => {
      const largePath = path.join(tempDir, 'large.txt');
      const largeContent = 'x'.repeat(10000); // 10KB content

      await nodeFileSystem.writeFile(largePath, largeContent);
      const readContent = await nodeFileSystem.readFile(largePath);
      
      expect(readContent).toBe(largeContent);
      expect(readContent.length).toBe(10000);
    });

    it('should handle files with special characters in names', async () => {
      const specialPath = path.join(tempDir, 'file with spaces & special chars!.txt');
      const content = 'Special file content';

      await nodeFileSystem.writeFile(specialPath, content);
      const readContent = await nodeFileSystem.readFile(specialPath);
      
      expect(readContent).toBe(content);
    });

    it('should handle concurrent operations', async () => {
      const operations = Array(10).fill(null).map(async (_, i) => {
        const filePath = path.join(tempDir, `concurrent-${i}.txt`);
        await nodeFileSystem.writeFile(filePath, `content-${i}`);
        return nodeFileSystem.readFile(filePath);
      });

      const results = await Promise.all(operations);
      results.forEach((content, i) => {
        expect(content).toBe(`content-${i}`);
      });
    });

    it('should handle deeply nested paths', async () => {
      const deepPath = path.join(
        tempDir,
        ...Array(10).fill('level'),
        'deep-file.txt'
      );
      const content = 'Deep nested content';

      await nodeFileSystem.writeFile(deepPath, content);
      const readContent = await nodeFileSystem.readFile(deepPath);
      
      expect(readContent).toBe(content);
    });
  });

  describe('Interface Compliance', () => {
    it('should implement all IFileSystem methods', () => {
      // Check that all required methods exist
      expect(typeof nodeFileSystem.exists).toBe('function');
      expect(typeof nodeFileSystem.readFile).toBe('function');
      expect(typeof nodeFileSystem.writeFile).toBe('function');
      expect(typeof nodeFileSystem.readJSON).toBe('function');
      expect(typeof nodeFileSystem.writeJSON).toBe('function');
      expect(typeof nodeFileSystem.remove).toBe('function');
      expect(typeof nodeFileSystem.copy).toBe('function');
      expect(typeof nodeFileSystem.move).toBe('function');
      expect(typeof nodeFileSystem.mkdir).toBe('function');
      expect(typeof nodeFileSystem.readdir).toBe('function');
      expect(typeof nodeFileSystem.stat).toBe('function');
      
      // Path operations
      expect(typeof nodeFileSystem.dirname).toBe('function');
      expect(typeof nodeFileSystem.join).toBe('function');
      expect(typeof nodeFileSystem.resolve).toBe('function');
      expect(typeof nodeFileSystem.basename).toBe('function');
      expect(typeof nodeFileSystem.extname).toBe('function');
      expect(typeof nodeFileSystem.relative).toBe('function');
      expect(typeof nodeFileSystem.isAbsolute).toBe('function');
    });

    it('should return correct types from all methods', async () => {
      const filePath = path.join(tempDir, 'types-test.txt');
      const dirPath = path.join(tempDir, 'types-dir');
      
      await nodeFileSystem.writeFile(filePath, 'test');
      await nodeFileSystem.mkdir(dirPath);

      // Boolean returns
      expect(typeof await nodeFileSystem.exists(filePath)).toBe('boolean');
      expect(typeof nodeFileSystem.isAbsolute(filePath)).toBe('boolean');

      // String returns
      expect(typeof await nodeFileSystem.readFile(filePath)).toBe('string');
      expect(typeof nodeFileSystem.dirname(filePath)).toBe('string');
      expect(typeof nodeFileSystem.join('a', 'b')).toBe('string');
      expect(typeof nodeFileSystem.resolve('a')).toBe('string');
      expect(typeof nodeFileSystem.basename(filePath)).toBe('string');
      expect(typeof nodeFileSystem.extname(filePath)).toBe('string');
      expect(typeof nodeFileSystem.relative(dirPath, filePath)).toBe('string');

      // Array returns
      const entries = await nodeFileSystem.readdir(tempDir);
      expect(Array.isArray(entries)).toBe(true);

      // Object returns
      const stat = await nodeFileSystem.stat(filePath);
      expect(typeof stat).toBe('object');
      expect(typeof stat.isFile).toBe('function');
      expect(typeof stat.isDirectory).toBe('function');
    });
  });
});