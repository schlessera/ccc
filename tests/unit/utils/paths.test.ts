import { PathUtils } from '../../../src/utils/paths';
import * as path from 'path';
import * as os from 'os';

describe('PathUtils', () => {
  describe('getStorageDir', () => {
    it('should return the correct storage directory path', () => {
      const expected = path.join(os.homedir(), '.ccc', 'storage');
      expect(PathUtils.getStorageDir()).toBe(expected);
    });
  });

  describe('getTemplatesDir', () => {
    it('should return the correct templates directory path', () => {
      const expected = path.join(os.homedir(), '.ccc', 'templates');
      expect(PathUtils.getTemplatesDir()).toBe(expected);
    });
  });

  describe('getProjectStorageDir', () => {
    it('should return the correct project storage path', () => {
      const projectName = 'test-project';
      const expected = path.join(os.homedir(), '.ccc', 'storage', projectName);
      expect(PathUtils.getProjectStorageDir(projectName)).toBe(expected);
    });
  });

  describe('resolveProjectPath', () => {
    it('should resolve to current directory when no path provided', () => {
      const expected = process.cwd();
      expect(PathUtils.resolveProjectPath()).toBe(expected);
    });

    it('should resolve provided path', () => {
      const testPath = '/test/path';
      const expected = path.resolve(testPath);
      expect(PathUtils.resolveProjectPath(testPath)).toBe(expected);
    });
  });
});