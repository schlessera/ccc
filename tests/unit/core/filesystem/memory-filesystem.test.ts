import { MemoryFileSystem } from '../../../../src/core/filesystem/memory-filesystem';
import * as path from 'path';

describe('MemoryFileSystem', () => {
  let fs: MemoryFileSystem;

  beforeEach(() => {
    fs = new MemoryFileSystem();
  });

  describe('Basic File Operations', () => {
    it('should write and read files', async () => {
      const filePath = '/test/file.txt';
      const content = 'Hello World';

      await fs.writeFile(filePath, content);
      const readContent = await fs.readFile(filePath);

      expect(readContent).toBe(content);
      expect(await fs.exists(filePath)).toBe(true);
    });

    it('should handle JSON operations', async () => {
      const filePath = '/test/data.json';
      const data = { name: 'test', value: 42 };

      await fs.writeJSON(filePath, data);
      const readData = await fs.readJSON(filePath);

      expect(readData).toEqual(data);
    });

    it('should throw error when reading non-existent file', async () => {
      await expect(fs.readFile('/non/existent.txt'))
        .rejects.toThrow('ENOENT: no such file or directory');
    });
  });

  describe('Directory Operations', () => {
    it('should create directories', async () => {
      const dirPath = '/test/nested/directory';
      
      await fs.mkdir(dirPath, { recursive: true });
      
      expect(await fs.exists(dirPath)).toBe(true);
    });

    it('should list directory contents', async () => {
      const dirPath = '/test/dir';
      
      // Create some files and subdirectories
      await fs.writeFile(path.join(dirPath, 'file1.txt'), 'content1');
      await fs.writeFile(path.join(dirPath, 'file2.txt'), 'content2');
      await fs.mkdir(path.join(dirPath, 'subdir'), { recursive: true });

      const entries = await fs.readdir(dirPath);
      
      expect(entries).toHaveLength(3);
      expect(entries).toContain('file1.txt');
      expect(entries).toContain('file2.txt');
      expect(entries).toContain('subdir');
    });

    it('should handle stat operations', async () => {
      const filePath = '/test/file.txt';
      const dirPath = '/test/dir';
      
      await fs.writeFile(filePath, 'content');
      await fs.mkdir(dirPath, { recursive: true });

      const fileStat = await fs.stat(filePath);
      const dirStat = await fs.stat(dirPath);

      expect(fileStat.isFile()).toBe(true);
      expect(fileStat.isDirectory()).toBe(false);
      expect(dirStat.isFile()).toBe(false);
      expect(dirStat.isDirectory()).toBe(true);
    });
  });

  describe('File Management', () => {
    it('should remove files and directories', async () => {
      const filePath = '/test/file.txt';
      const dirPath = '/test/dir';
      
      await fs.writeFile(filePath, 'content');
      await fs.mkdir(dirPath, { recursive: true });
      await fs.writeFile(path.join(dirPath, 'nested.txt'), 'nested content');

      await fs.remove(filePath);
      await fs.remove(dirPath);

      expect(await fs.exists(filePath)).toBe(false);
      expect(await fs.exists(dirPath)).toBe(false);
      expect(await fs.exists(path.join(dirPath, 'nested.txt'))).toBe(false);
    });

    it('should copy files', async () => {
      const srcFile = '/test/source.txt';
      const destFile = '/test/dest.txt';
      const content = 'test content';

      await fs.writeFile(srcFile, content);
      await fs.copy(srcFile, destFile);

      expect(await fs.exists(destFile)).toBe(true);
      expect(await fs.readFile(destFile)).toBe(content);
    });

    it('should copy directories recursively', async () => {
      const srcDir = '/test/source';
      const destDir = '/test/dest';

      // Create source directory structure
      await fs.writeFile(path.join(srcDir, 'file1.txt'), 'content1');
      await fs.writeFile(path.join(srcDir, 'subdir', 'file2.txt'), 'content2');

      await fs.copy(srcDir, destDir);

      expect(await fs.exists(path.join(destDir, 'file1.txt'))).toBe(true);
      expect(await fs.exists(path.join(destDir, 'subdir', 'file2.txt'))).toBe(true);
      expect(await fs.readFile(path.join(destDir, 'file1.txt'))).toBe('content1');
      expect(await fs.readFile(path.join(destDir, 'subdir', 'file2.txt'))).toBe('content2');
    });

    it('should move files', async () => {
      const srcFile = '/test/source.txt';
      const destFile = '/test/dest.txt';
      const content = 'test content';

      await fs.writeFile(srcFile, content);
      await fs.move(srcFile, destFile);

      expect(await fs.exists(srcFile)).toBe(false);
      expect(await fs.exists(destFile)).toBe(true);
      expect(await fs.readFile(destFile)).toBe(content);
    });
  });

  describe('Path Operations', () => {
    it('should handle path operations correctly', () => {
      expect(fs.join('a', 'b', 'c')).toBe(path.join('a', 'b', 'c'));
      expect(fs.resolve('relative/path')).toBe(path.resolve('relative/path'));
      expect(fs.dirname('/path/to/file.txt')).toBe('/path/to');
      expect(fs.basename('/path/to/file.txt')).toBe('file.txt');
      expect(fs.extname('file.txt')).toBe('.txt');
      expect(fs.isAbsolute('/absolute/path')).toBe(true);
      expect(fs.isAbsolute('relative/path')).toBe(false);
    });
  });

  describe('Copy Options', () => {
    it('should respect overwrite option', async () => {
      const srcFile = '/test/source.txt';
      const destFile = '/test/dest.txt';

      await fs.writeFile(srcFile, 'new content');
      await fs.writeFile(destFile, 'existing content');

      // Don't overwrite
      await fs.copy(srcFile, destFile, { overwrite: false });
      expect(await fs.readFile(destFile)).toBe('existing content');

      // Do overwrite
      await fs.copy(srcFile, destFile, { overwrite: true });
      expect(await fs.readFile(destFile)).toBe('new content');
    });

    it('should respect errorOnExist option', async () => {
      const srcFile = '/test/source.txt';
      const destFile = '/test/dest.txt';

      await fs.writeFile(srcFile, 'content');
      await fs.writeFile(destFile, 'existing');

      await expect(fs.copy(srcFile, destFile, { errorOnExist: true }))
        .rejects.toThrow('EEXIST: file already exists');
    });

    it('should use filter function', async () => {
      const srcDir = '/test/source';
      const destDir = '/test/dest';

      await fs.writeFile(path.join(srcDir, 'file1.txt'), 'content1');
      await fs.writeFile(path.join(srcDir, 'file2.log'), 'content2');

      // Only copy .txt files
      await fs.copy(srcDir, destDir, {
        filter: (src) => path.extname(src) === '.txt'
      });

      expect(await fs.exists(path.join(destDir, 'file1.txt'))).toBe(true);
      expect(await fs.exists(path.join(destDir, 'file2.log'))).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should throw appropriate errors', async () => {
      await expect(fs.readdir('/non/existent'))
        .rejects.toThrow('ENOENT: no such file or directory');
      
      await expect(fs.stat('/non/existent'))
        .rejects.toThrow('ENOENT: no such file or directory');
      
      await expect(fs.copy('/non/existent', '/dest'))
        .rejects.toThrow('ENOENT: no such file or directory');
    });
  });

  describe('Initialization with Files', () => {
    it('should initialize with provided files', () => {
      const initialFiles = {
        '/test/file1.txt': 'content1',
        '/test/dir/file2.txt': 'content2'
      };

      const fsWithFiles = new MemoryFileSystem(initialFiles);
      const allFiles = fsWithFiles.getAllFiles();

      expect(Object.keys(allFiles)).toHaveLength(2);
      expect(allFiles[path.resolve('/test/file1.txt')]).toBe('content1');
      expect(allFiles[path.resolve('/test/dir/file2.txt')]).toBe('content2');
    });
  });

  describe('Utility Methods', () => {
    it('should provide testing utilities', async () => {
      await fs.writeFile('/test1.txt', 'content1');
      await fs.writeFile('/test2.txt', 'content2');
      await fs.mkdir('/testdir', { recursive: true });

      const allFiles = fs.getAllFiles();
      const allDirs = fs.getAllDirectories();

      expect(Object.keys(allFiles)).toHaveLength(2);
      expect(allDirs.length).toBeGreaterThan(0);
      expect(allDirs).toContain(path.resolve('/testdir'));

      fs.clear();
      expect(Object.keys(fs.getAllFiles())).toHaveLength(0);
      expect(fs.getAllDirectories()).toEqual(['/']); // Root directory should always exist
    });
  });
});