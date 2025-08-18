import { SymlinkManager } from '../../../../src/core/symlinks/manager';
import * as fs from 'fs-extra';

// Mock dependencies
jest.mock('fs-extra');
jest.mock('../../../../src/utils/paths', () => ({
  PathUtils: {
    exists: jest.fn(),
    ensureDir: jest.fn(),
    getProjectStorageDir: jest.fn().mockReturnValue('/test/storage/project'),
  },
}));

jest.mock('../../../../src/utils/logger', () => ({
  Logger: {
    success: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
  },
}));

describe('SymlinkManager - Extra Coverage', () => {
  let manager: SymlinkManager;
  let mockFs: any;
  let mockPathUtils: any;

  beforeEach(() => {
    manager = new SymlinkManager();
    mockFs = fs as any;
    mockPathUtils = require('../../../../src/utils/paths').PathUtils;
    jest.clearAllMocks();
  });

  it('should handle getSymlinkTarget error case', async () => {
    // Setup: isSymlink returns true but readlink throws
    mockFs.lstat.mockResolvedValue({ isSymbolicLink: () => true });
    mockFs.readlink.mockRejectedValue(new Error('readlink failed'));

    const result = await manager.getSymlinkTarget('/test/path');
    
    expect(result).toBe(null);
  });

  it('should handle permission errors in createProjectSymlinks', async () => {
    mockPathUtils.exists.mockResolvedValue(false);
    
    const permissionError = new Error('Permission denied');
    (permissionError as any).code = 'EACCES';
    mockFs.symlink.mockRejectedValue(permissionError);
    
    await expect(manager.createProjectSymlinks('/test/project', 'test-project'))
      .rejects.toThrow('Permission denied: Cannot create symlink');
  });

  it('should handle isSymlink lstat errors', async () => {
    mockFs.lstat.mockRejectedValue(new Error('lstat failed'));
    
    const result = await (manager as any).isSymlink('/test/path');
    
    expect(result).toBe(false);
  });

  it('should handle isValidSymlink readlink errors', async () => {
    // Mock isSymlink to return true
    jest.spyOn(manager as any, 'isSymlink').mockResolvedValue(true);
    mockFs.readlink.mockRejectedValue(new Error('readlink failed'));
    
    const result = await (manager as any).isValidSymlink('/test/path');
    
    expect(result).toBe(false);
  });

  it('should handle EPERM permission errors', async () => {
    mockPathUtils.exists.mockResolvedValue(false);
    
    const permissionError = new Error('Operation not permitted');
    (permissionError as any).code = 'EPERM';
    mockFs.symlink.mockRejectedValue(permissionError);
    
    await expect(manager.createProjectSymlinks('/test/project', 'test-project'))
      .rejects.toThrow('Permission denied: Cannot create symlink');
  });
});