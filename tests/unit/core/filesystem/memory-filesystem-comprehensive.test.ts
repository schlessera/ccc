import { MemoryFileSystem } from '../../../../src/core/filesystem/memory-filesystem';

describe('MemoryFileSystem (Comprehensive)', () => {
  let memfs: MemoryFileSystem;

  beforeEach(() => {
    memfs = new MemoryFileSystem();
  });

  describe('Constructor', () => {
    it('should create empty filesystem', () => {
      expect(memfs.getAllFiles()).toEqual({});
      expect(memfs.getAllDirectories()).toEqual(['/']); // Root directory should always exist
    });

    it('should initialize with files', () => {
      const initialFiles = {
        '/test.txt': 'content',
        '/dir/file.txt': 'nested content'
      };
      const fs = new MemoryFileSystem(initialFiles);
      
      expect(fs.getAllFiles()).toEqual(expect.objectContaining({
        '/test.txt': 'content',
        '/dir/file.txt': 'nested content'
      }));
      expect(fs.getAllDirectories()).toContain('/dir');
    });

    it('should create parent directories for initial files', () => {
      const fs = new MemoryFileSystem({
        '/deep/nested/file.txt': 'content'
      });
      
      const dirs = fs.getAllDirectories();
      expect(dirs).toContain('/deep');
      expect(dirs).toContain('/deep/nested');
    });
  });

  describe('File Operations', () => {
    describe('exists', () => {
      it('should return false for non-existent files', async () => {
        expect(await memfs.exists('/nonexistent.txt')).toBe(false);
      });

      it('should return true for existing files', async () => {
        await memfs.writeFile('/test.txt', 'content');
        expect(await memfs.exists('/test.txt')).toBe(true);
      });

      it('should return true for existing directories', async () => {
        await memfs.mkdir('/testdir', { recursive: true });
        expect(await memfs.exists('/testdir')).toBe(true);
      });

      it('should handle relative paths', async () => {
        await memfs.writeFile('relative.txt', 'content');
        expect(await memfs.exists('relative.txt')).toBe(true);
      });
    });

    describe('readFile', () => {
      it('should read file content', async () => {
        await memfs.writeFile('/test.txt', 'Hello World');
        const content = await memfs.readFile('/test.txt');
        expect(content).toBe('Hello World');
      });

      it('should throw error for non-existent files', async () => {
        await expect(memfs.readFile('/nonexistent.txt')).rejects.toThrow(
          'ENOENT: no such file or directory, open \'/nonexistent.txt\''
        );
      });

      it('should handle different encodings parameter', async () => {
        await memfs.writeFile('/test.txt', 'content');
        const content = await memfs.readFile('/test.txt', 'utf8');
        expect(content).toBe('content');
      });

      it('should handle empty files', async () => {
        await memfs.writeFile('/empty.txt', '');
        const content = await memfs.readFile('/empty.txt');
        expect(content).toBe('');
      });
    });

    describe('writeFile', () => {
      it('should write file content', async () => {
        await memfs.writeFile('/test.txt', 'Hello World');
        const content = await memfs.readFile('/test.txt');
        expect(content).toBe('Hello World');
      });

      it('should create parent directories', async () => {
        await memfs.writeFile('/deep/nested/file.txt', 'content');
        expect(await memfs.exists('/deep')).toBe(true);
        expect(await memfs.exists('/deep/nested')).toBe(true);
        expect(await memfs.readFile('/deep/nested/file.txt')).toBe('content');
      });

      it('should overwrite existing files', async () => {
        await memfs.writeFile('/test.txt', 'original');
        await memfs.writeFile('/test.txt', 'updated');
        expect(await memfs.readFile('/test.txt')).toBe('updated');
      });

      it('should handle encoding parameter', async () => {
        await memfs.writeFile('/test.txt', 'content', 'utf8');
        expect(await memfs.readFile('/test.txt')).toBe('content');
      });
    });
  });

  describe('JSON Operations', () => {
    describe('readJSON', () => {
      it('should read and parse JSON files', async () => {
        const data = { name: 'test', value: 42 };
        await memfs.writeFile('/data.json', JSON.stringify(data));
        const parsed = await memfs.readJSON('/data.json');
        expect(parsed).toEqual(data);
      });

      it('should throw error for invalid JSON', async () => {
        await memfs.writeFile('/invalid.json', 'invalid json {');
        await expect(memfs.readJSON('/invalid.json')).rejects.toThrow(
          'Failed to parse JSON from /invalid.json'
        );
      });

      it('should handle complex JSON structures', async () => {
        const complex = {
          string: 'value',
          number: 123,
          boolean: true,
          null: null,
          array: [1, 2, 3],
          nested: { deep: { value: 'found' } }
        };
        await memfs.writeFile('/complex.json', JSON.stringify(complex));
        expect(await memfs.readJSON('/complex.json')).toEqual(complex);
      });
    });

    describe('writeJSON', () => {
      it('should write JSON with default formatting', async () => {
        const data = { name: 'test', value: 42 };
        await memfs.writeJSON('/data.json', data);
        const content = await memfs.readFile('/data.json');
        expect(content).toBe(JSON.stringify(data, null, 2));
      });

      it('should write JSON with custom spacing', async () => {
        const data = { name: 'test' };
        await memfs.writeJSON('/data.json', data, { spaces: 4 });
        const content = await memfs.readFile('/data.json');
        expect(content).toBe(JSON.stringify(data, null, 4));
      });

      it('should create parent directories', async () => {
        await memfs.writeJSON('/config/settings.json', { key: 'value' });
        expect(await memfs.exists('/config')).toBe(true);
        expect(await memfs.readJSON('/config/settings.json')).toEqual({ key: 'value' });
      });
    });
  });

  describe('Directory Operations', () => {
    describe('mkdir', () => {
      it('should create directory', async () => {
        await memfs.mkdir('/testdir');
        expect(await memfs.exists('/testdir')).toBe(true);
        expect(memfs.getAllDirectories()).toContain('/testdir');
      });

      it('should create nested directories with recursive option', async () => {
        await memfs.mkdir('/deep/nested/dir', { recursive: true });
        expect(await memfs.exists('/deep')).toBe(true);
        expect(await memfs.exists('/deep/nested')).toBe(true);
        expect(await memfs.exists('/deep/nested/dir')).toBe(true);
      });

      it('should throw error without recursive option for nested path', async () => {
        await expect(memfs.mkdir('/deep/nested/dir')).rejects.toThrow(
          'ENOENT: no such file or directory, mkdir \'/deep/nested/dir\''
        );
      });

      it('should work when parent exists', async () => {
        await memfs.mkdir('/parent');
        await memfs.mkdir('/parent/child');
        expect(await memfs.exists('/parent/child')).toBe(true);
      });
    });

    describe('readdir', () => {
      it('should list directory contents', async () => {
        await memfs.writeFile('/dir/file1.txt', 'content1');
        await memfs.writeFile('/dir/file2.txt', 'content2');
        await memfs.mkdir('/dir/subdir');
        
        const entries = await memfs.readdir('/dir');
        expect(entries.sort()).toEqual(['file1.txt', 'file2.txt', 'subdir']);
      });

      it('should return empty array for empty directory', async () => {
        await memfs.mkdir('/emptydir');
        const entries = await memfs.readdir('/emptydir');
        expect(entries).toEqual([]);
      });

      it('should throw error for non-existent directory', async () => {
        await expect(memfs.readdir('/nonexistent')).rejects.toThrow(
          'ENOENT: no such file or directory, scandir \'/nonexistent\''
        );
      });

      it('should only list immediate children', async () => {
        await memfs.writeFile('/dir/file.txt', 'content');
        await memfs.writeFile('/dir/sub/deep.txt', 'deep content');
        await memfs.mkdir('/dir/subdir');
        
        const entries = await memfs.readdir('/dir');
        expect(entries.sort()).toEqual(['file.txt', 'sub', 'subdir']);
      });

      it('should sort entries alphabetically', async () => {
        await memfs.writeFile('/dir/zebra.txt', 'z');
        await memfs.writeFile('/dir/alpha.txt', 'a');
        await memfs.mkdir('/dir/beta');
        
        const entries = await memfs.readdir('/dir');
        expect(entries).toEqual(['alpha.txt', 'beta', 'zebra.txt']);
      });
    });
  });

  describe('Remove Operations', () => {
    describe('remove', () => {
      it('should remove files', async () => {
        await memfs.writeFile('/test.txt', 'content');
        await memfs.remove('/test.txt');
        expect(await memfs.exists('/test.txt')).toBe(false);
      });

      it('should remove empty directories', async () => {
        await memfs.mkdir('/testdir');
        await memfs.remove('/testdir');
        expect(await memfs.exists('/testdir')).toBe(false);
      });

      it('should remove directories with contents', async () => {
        await memfs.writeFile('/dir/file.txt', 'content');
        await memfs.mkdir('/dir/subdir');
        await memfs.writeFile('/dir/subdir/deep.txt', 'deep');
        
        await memfs.remove('/dir');
        expect(await memfs.exists('/dir')).toBe(false);
        expect(await memfs.exists('/dir/file.txt')).toBe(false);
        expect(await memfs.exists('/dir/subdir')).toBe(false);
        expect(await memfs.exists('/dir/subdir/deep.txt')).toBe(false);
      });

      it('should not throw for non-existent paths', async () => {
        await expect(memfs.remove('/nonexistent')).resolves.not.toThrow();
      });

      it('should preserve other files and directories', async () => {
        await memfs.writeFile('/keep.txt', 'keep');
        await memfs.writeFile('/remove.txt', 'remove');
        await memfs.mkdir('/keepdir');
        
        await memfs.remove('/remove.txt');
        expect(await memfs.exists('/keep.txt')).toBe(true);
        expect(await memfs.exists('/keepdir')).toBe(true);
      });
    });
  });

  describe('Copy Operations', () => {
    describe('copy', () => {
      it('should copy files', async () => {
        await memfs.writeFile('/source.txt', 'content');
        await memfs.copy('/source.txt', '/dest.txt');
        
        expect(await memfs.readFile('/dest.txt')).toBe('content');
        expect(await memfs.exists('/source.txt')).toBe(true); // Source should remain
      });

      it('should copy directories recursively', async () => {
        await memfs.writeFile('/srcdir/file.txt', 'content');
        await memfs.mkdir('/srcdir/subdir');
        await memfs.writeFile('/srcdir/subdir/deep.txt', 'deep');
        
        await memfs.copy('/srcdir', '/destdir');
        
        expect(await memfs.readFile('/destdir/file.txt')).toBe('content');
        expect(await memfs.exists('/destdir/subdir')).toBe(true);
        expect(await memfs.readFile('/destdir/subdir/deep.txt')).toBe('deep');
      });

      it('should throw error for non-existent source', async () => {
        await expect(memfs.copy('/nonexistent', '/dest')).rejects.toThrow(
          'ENOENT: no such file or directory, copyfile \'/nonexistent\' -> \'/dest\''
        );
      });

      it('should handle overwrite option', async () => {
        await memfs.writeFile('/source.txt', 'new content');
        await memfs.writeFile('/dest.txt', 'old content');
        
        await memfs.copy('/source.txt', '/dest.txt', { overwrite: true });
        expect(await memfs.readFile('/dest.txt')).toBe('new content');
      });

      it('should skip if destination exists and overwrite is false', async () => {
        await memfs.writeFile('/source.txt', 'new content');
        await memfs.writeFile('/dest.txt', 'old content');
        
        await memfs.copy('/source.txt', '/dest.txt', { overwrite: false });
        expect(await memfs.readFile('/dest.txt')).toBe('old content');
      });

      it('should handle errorOnExist option', async () => {
        await memfs.writeFile('/source.txt', 'content');
        await memfs.writeFile('/dest.txt', 'existing');
        
        await expect(memfs.copy('/source.txt', '/dest.txt', { errorOnExist: true }))
          .rejects.toThrow('EEXIST: file already exists');
      });

      it('should apply filter function', async () => {
        await memfs.writeFile('/srcdir/keep.txt', 'keep');
        await memfs.writeFile('/srcdir/skip.tmp', 'skip');
        
        await memfs.copy('/srcdir', '/destdir', {
          filter: (src) => !src.endsWith('.tmp')
        });
        
        expect(await memfs.exists('/destdir/keep.txt')).toBe(true);
        expect(await memfs.exists('/destdir/skip.tmp')).toBe(false);
      });

      it('should create parent directories for destination', async () => {
        await memfs.writeFile('/source.txt', 'content');
        await memfs.copy('/source.txt', '/deep/nested/dest.txt');
        
        expect(await memfs.exists('/deep')).toBe(true);
        expect(await memfs.exists('/deep/nested')).toBe(true);
        expect(await memfs.readFile('/deep/nested/dest.txt')).toBe('content');
      });
    });
  });

  describe('Move Operations', () => {
    describe('move', () => {
      it('should move files', async () => {
        await memfs.writeFile('/source.txt', 'content');
        await memfs.move('/source.txt', '/dest.txt');
        
        expect(await memfs.exists('/source.txt')).toBe(false);
        expect(await memfs.readFile('/dest.txt')).toBe('content');
      });

      it('should move directories', async () => {
        await memfs.writeFile('/srcdir/file.txt', 'content');
        await memfs.move('/srcdir', '/destdir');
        
        expect(await memfs.exists('/srcdir')).toBe(false);
        expect(await memfs.readFile('/destdir/file.txt')).toBe('content');
      });

      it('should overwrite destination', async () => {
        await memfs.writeFile('/source.txt', 'new');
        await memfs.writeFile('/dest.txt', 'old');
        
        await memfs.move('/source.txt', '/dest.txt');
        expect(await memfs.readFile('/dest.txt')).toBe('new');
      });
    });
  });

  describe('File Stats', () => {
    describe('stat', () => {
      it('should return stats for files', async () => {
        await memfs.writeFile('/test.txt', 'Hello World');
        const stats = await memfs.stat('/test.txt');
        
        expect(stats.isFile()).toBe(true);
        expect(stats.isDirectory()).toBe(false);
        expect(stats.size).toBe(Buffer.byteLength('Hello World', 'utf8'));
        expect(stats).toHaveProperty('atime');
        expect(stats).toHaveProperty('mtime');
      });

      it('should return stats for directories', async () => {
        await memfs.mkdir('/testdir');
        const stats = await memfs.stat('/testdir');
        
        expect(stats.isFile()).toBe(false);
        expect(stats.isDirectory()).toBe(true);
        expect(stats.size).toBe(0);
      });

      it('should throw error for non-existent paths', async () => {
        await expect(memfs.stat('/nonexistent')).rejects.toThrow(
          'ENOENT: no such file or directory, stat \'/nonexistent\''
        );
      });

      it('should return correct file size for different content lengths', async () => {
        await memfs.writeFile('/empty.txt', '');
        await memfs.writeFile('/small.txt', 'hi');
        await memfs.writeFile('/large.txt', 'x'.repeat(1000));
        
        expect((await memfs.stat('/empty.txt')).size).toBe(0);
        expect((await memfs.stat('/small.txt')).size).toBe(2);
        expect((await memfs.stat('/large.txt')).size).toBe(1000);
      });

      it('should include all required Stats properties', async () => {
        await memfs.writeFile('/test.txt', 'content');
        const stats = await memfs.stat('/test.txt');
        
        expect(typeof stats.isBlockDevice).toBe('function');
        expect(typeof stats.isCharacterDevice).toBe('function');
        expect(typeof stats.isSymbolicLink).toBe('function');
        expect(typeof stats.isFIFO).toBe('function');
        expect(typeof stats.isSocket).toBe('function');
        expect(typeof stats.mode).toBe('number');
        expect(typeof stats.uid).toBe('number');
        expect(typeof stats.gid).toBe('number');
        expect(stats.birthtime).toBeInstanceOf(Date);
        expect(stats.ctime).toBeInstanceOf(Date);
      });
    });
  });

  describe('Path Operations', () => {
    it('should join paths', () => {
      expect(memfs.join('a', 'b', 'c')).toBe('a/b/c');
    });

    it('should resolve paths', () => {
      const resolved = memfs.resolve('relative/path');
      expect(memfs.isAbsolute(resolved)).toBe(true);
    });

    it('should get dirname', () => {
      expect(memfs.dirname('/path/to/file.txt')).toBe('/path/to');
    });

    it('should get basename', () => {
      expect(memfs.basename('/path/to/file.txt')).toBe('file.txt');
      expect(memfs.basename('/path/to/file.txt', '.txt')).toBe('file');
    });

    it('should get extension', () => {
      expect(memfs.extname('/path/to/file.txt')).toBe('.txt');
      expect(memfs.extname('/path/to/file')).toBe('');
    });

    it('should get relative path', () => {
      const rel = memfs.relative('/a/b', '/a/c');
      expect(rel).toBe('../c');
    });

    it('should check if path is absolute', () => {
      expect(memfs.isAbsolute('/absolute/path')).toBe(true);
      expect(memfs.isAbsolute('relative/path')).toBe(false);
    });
  });

  describe('Testing Utilities', () => {
    describe('getAllFiles', () => {
      it('should return all files in filesystem', async () => {
        await memfs.writeFile('/file1.txt', 'content1');
        await memfs.writeFile('/dir/file2.txt', 'content2');
        
        const files = memfs.getAllFiles();
        expect(files['/file1.txt']).toBe('content1');
        expect(files['/dir/file2.txt']).toBe('content2');
        expect(Object.keys(files)).toHaveLength(2);
      });
    });

    describe('getAllDirectories', () => {
      it('should return all directories in filesystem', async () => {
        await memfs.mkdir('/dir1');
        await memfs.mkdir('/dir2/subdir', { recursive: true });
        
        const dirs = memfs.getAllDirectories();
        expect(dirs).toContain('/dir1');
        expect(dirs).toContain('/dir2');
        expect(dirs).toContain('/dir2/subdir');
      });
    });

    describe('clear', () => {
      it('should remove all files and directories', async () => {
        await memfs.writeFile('/file.txt', 'content');
        await memfs.mkdir('/dir');
        
        memfs.clear();
        
        expect(memfs.getAllFiles()).toEqual({});
        expect(memfs.getAllDirectories()).toEqual(['/']); // Root directory should always exist
      });
    });

    describe('dump', () => {
      it('should log filesystem state', async () => {
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
        
        await memfs.writeFile('/file.txt', 'content');
        await memfs.mkdir('/dir');
        
        memfs.dump();
        
        expect(consoleSpy).toHaveBeenCalledWith('Files:', expect.arrayContaining(['/file.txt']));
        expect(consoleSpy).toHaveBeenCalledWith('Directories:', expect.arrayContaining(['/dir']));
        
        consoleSpy.mockRestore();
      });
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle paths with special characters', async () => {
      const specialPath = '/special-chars_file!@#$.txt';
      await memfs.writeFile(specialPath, 'content');
      expect(await memfs.readFile(specialPath)).toBe('content');
    });

    it('should handle very deep nested paths', async () => {
      const deepPath = '/a/b/c/d/e/f/g/h/i/j/deep-file.txt';
      await memfs.writeFile(deepPath, 'deep content');
      expect(await memfs.readFile(deepPath)).toBe('deep content');
    });

    it('should handle empty directory names gracefully', async () => {
      // Paths with empty segments should be normalized by path module
      await memfs.writeFile('/dir//file.txt', 'content');
      expect(await memfs.exists('/dir/file.txt')).toBe(true);
    });

    it('should handle Unicode content', async () => {
      const unicode = '🚀 Unicode test with émojis and spéciàl chars';
      await memfs.writeFile('/unicode.txt', unicode);
      expect(await memfs.readFile('/unicode.txt')).toBe(unicode);
    });

    it('should handle large content', async () => {
      const largeContent = 'x'.repeat(100000);
      await memfs.writeFile('/large.txt', largeContent);
      expect(await memfs.readFile('/large.txt')).toBe(largeContent);
      expect((await memfs.stat('/large.txt')).size).toBe(100000);
    });

    it('should handle concurrent operations', async () => {
      const operations = Array(10).fill(null).map(async (_, i) => {
        await memfs.writeFile(`/file${i}.txt`, `content${i}`);
        return memfs.readFile(`/file${i}.txt`);
      });
      
      const results = await Promise.all(operations);
      results.forEach((content, i) => {
        expect(content).toBe(`content${i}`);
      });
    });
  });

  describe('Path Normalization', () => {
    it('should normalize relative paths consistently', async () => {
      await memfs.writeFile('relative.txt', 'content');
      expect(await memfs.exists('./relative.txt')).toBe(true);
    });

    it('should handle path traversal attempts', async () => {
      await memfs.writeFile('/safe/file.txt', 'content');
      // Path normalization should handle ../.. traversal
      const normalizedExists = await memfs.exists('/safe/../safe/file.txt');
      expect(normalizedExists).toBe(true);
    });

    it('should treat different path forms as same location', async () => {
      await memfs.writeFile('/dir/file.txt', 'content');
      expect(await memfs.exists('/dir/../dir/file.txt')).toBe(true);
    });
  });
});