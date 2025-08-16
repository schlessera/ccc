import { NodeFileSystem } from '../../../../src/core/filesystem/node-filesystem';
import * as path from 'path';

describe('NodeFileSystem Path Operations', () => {
  let nodeFs: NodeFileSystem;

  beforeEach(() => {
    nodeFs = new NodeFileSystem();
  });

  describe('Path Operations', () => {
    it('should handle join operations correctly', () => {
      expect(nodeFs.join('a', 'b', 'c')).toBe(path.join('a', 'b', 'c'));
      expect(nodeFs.join('/root', 'nested', 'file.txt')).toBe('/root/nested/file.txt');
      expect(nodeFs.join('relative', '..', 'other')).toBe(path.join('relative', '..', 'other'));
    });

    it('should handle resolve operations correctly', () => {
      const resolved = nodeFs.resolve('relative/path');
      expect(resolved).toBe(path.resolve('relative/path'));
      expect(path.isAbsolute(resolved)).toBe(true);
    });

    it('should handle dirname operations correctly', () => {
      expect(nodeFs.dirname('/path/to/file.txt')).toBe('/path/to');
      expect(nodeFs.dirname('/path/to/')).toBe('/path');
      expect(nodeFs.dirname('/file.txt')).toBe('/');
      expect(nodeFs.dirname('relative/file.txt')).toBe('relative');
    });

    it('should handle basename operations correctly', () => {
      expect(nodeFs.basename('/path/to/file.txt')).toBe('file.txt');
      expect(nodeFs.basename('/path/to/file.txt', '.txt')).toBe('file');
      expect(nodeFs.basename('/path/to/')).toBe('to');
      expect(nodeFs.basename('file.txt')).toBe('file.txt');
      expect(nodeFs.basename('file.txt', '.txt')).toBe('file');
    });

    it('should handle extname operations correctly', () => {
      expect(nodeFs.extname('file.txt')).toBe('.txt');
      expect(nodeFs.extname('/path/to/file.json')).toBe('.json');
      expect(nodeFs.extname('file')).toBe('');
      expect(nodeFs.extname('.hidden')).toBe('');
      expect(nodeFs.extname('file.tar.gz')).toBe('.gz');
    });

    it('should handle relative path operations correctly', () => {
      expect(nodeFs.relative('/a/b', '/a/b/c/d')).toBe(path.relative('/a/b', '/a/b/c/d'));
      expect(nodeFs.relative('/a/b/c', '/a/b')).toBe(path.relative('/a/b/c', '/a/b'));
      expect(nodeFs.relative('/a/b', '/x/y')).toBe(path.relative('/a/b', '/x/y'));
    });

    it('should handle isAbsolute operations correctly', () => {
      expect(nodeFs.isAbsolute('/absolute/path')).toBe(true);
      expect(nodeFs.isAbsolute('relative/path')).toBe(false);
      expect(nodeFs.isAbsolute('./relative')).toBe(false);
      expect(nodeFs.isAbsolute('../relative')).toBe(false);
      
      // Test platform-specific absolute paths
      if (process.platform === 'win32') {
        expect(nodeFs.isAbsolute('C:\\Windows')).toBe(true);
        expect(nodeFs.isAbsolute('\\\\server\\share')).toBe(true);
      }
    });
  });

  describe('Path Edge Cases', () => {
    it('should handle empty strings and edge cases', () => {
      expect(nodeFs.join('', 'file.txt')).toBe('file.txt');
      expect(nodeFs.dirname('')).toBe('.');
      expect(nodeFs.basename('')).toBe('');
      expect(nodeFs.extname('')).toBe('');
      expect(nodeFs.isAbsolute('')).toBe(false);
    });

    it('should handle root directory cases', () => {
      expect(nodeFs.dirname('/')).toBe('/');
      expect(nodeFs.basename('/')).toBe(path.basename('/'));
      expect(nodeFs.join('/', 'file.txt')).toBe('/file.txt');
    });

    it('should handle multiple extensions correctly', () => {
      expect(nodeFs.extname('archive.tar.gz')).toBe('.gz');
      expect(nodeFs.basename('archive.tar.gz', '.gz')).toBe('archive.tar');
      expect(nodeFs.basename('archive.tar.gz', '.tar.gz')).toBe('archive');
    });

    it('should handle hidden files correctly', () => {
      expect(nodeFs.basename('/.hidden')).toBe('.hidden');
      expect(nodeFs.extname('/.hidden')).toBe('');
      expect(nodeFs.extname('.hidden.txt')).toBe('.txt');
      expect(nodeFs.basename('.hidden.txt', '.txt')).toBe('.hidden');
    });

    it('should handle complex relative paths', () => {
      const complexPath = nodeFs.join('a', '..', 'b', '.', 'c', '..', 'd');
      const normalized = path.normalize(complexPath);
      expect(nodeFs.join('a', '..', 'b', '.', 'c', '..', 'd')).toBe(normalized);
    });
  });

  describe('Consistency with Node.js path module', () => {
    const testPaths = [
      '/absolute/path/to/file.txt',
      'relative/path/to/file.txt',
      '../parent/file.txt',
      './current/file.txt',
      '/',
      '',
      'file.txt',
      '.hidden',
      'file.name.with.dots.txt'
    ];

    testPaths.forEach(testPath => {
      it(`should handle "${testPath}" consistently with path module`, () => {
        expect(nodeFs.dirname(testPath)).toBe(path.dirname(testPath));
        expect(nodeFs.basename(testPath)).toBe(path.basename(testPath));
        expect(nodeFs.extname(testPath)).toBe(path.extname(testPath));
        expect(nodeFs.isAbsolute(testPath)).toBe(path.isAbsolute(testPath));
      });
    });
  });
});