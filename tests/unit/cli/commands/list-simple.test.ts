import { StorageManager } from '../../../../src/core/storage/manager';
import { ProjectInfo } from '../../../../src/types/config';

// Simple test file for list command coverage

// Mock external dependencies
jest.mock('@clack/prompts', () => ({
  note: jest.fn(),
  cancel: jest.fn(),
}));

jest.mock('chalk', () => ({
  red: jest.fn((str) => str),
  green: jest.fn((str) => str),
  cyan: jest.fn((str) => str),
  yellow: jest.fn((str) => str),
  gray: jest.fn((str) => str),
  bold: jest.fn((str) => str),
  dim: jest.fn((str) => str),
}));

jest.mock('fs-extra', () => ({
  stat: jest.fn(),
  readFile: jest.fn(),
  readdir: jest.fn(),
}));

jest.mock('../../../../src/utils/paths', () => ({
  PathUtils: {
    exists: jest.fn(),
    getSize: jest.fn(),
    formatSize: jest.fn((size) => `${size}B`),
    getProjectStorageDir: jest.fn((project) => `/storage/${project}`),
    getProjectBackupsDir: jest.fn((project) => `/backups/${project}`),
  }
}));

// Create a mock storage manager
const createMockStorageManager = (): jest.Mocked<StorageManager> => ({
  listProjects: jest.fn(),
  getProjectInfo: jest.fn(),
} as any);

// Mock the container to return our mock storage manager
jest.mock('../../../../src/core/container', () => {
  let mockStorageManager: jest.Mocked<StorageManager>;
  
  return {
    getService: jest.fn((key: string) => {
      if (key === 'StorageManager') {
        return mockStorageManager;
      }
      return null;
    }),
    ServiceKeys: {
      StorageManager: 'StorageManager',
    },
    setMockStorageManager: (manager: jest.Mocked<StorageManager>) => {
      mockStorageManager = manager;
    },
  };
});

describe('List Command (Simple Integration)', () => {
  let mockStorageManager: jest.Mocked<StorageManager>;
  let listCommand: any;
  let mockP: any;
  let consoleSpy: jest.SpyInstance;
  let processExitSpy: jest.SpyInstance;

  beforeEach(async () => {
    // Clear all mocks
    jest.clearAllMocks();
    
    // Create fresh mock storage manager
    mockStorageManager = createMockStorageManager();
    
    // Set up the mock in the container
    const mockContainer = require('../../../../src/core/container');
    (mockContainer as any).setMockStorageManager(mockStorageManager);
    mockContainer.getService.mockImplementation((key: string) => {
      if (key === 'StorageManager') {
        return mockStorageManager;
      }
      return null;
    });
    
    // Import the list command after setting up mocks
    const listModule = await import('../../../../src/cli/commands/list');
    listCommand = listModule.listCommand;
    
    // Set up other mocks
    mockP = require('@clack/prompts');
    consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    processExitSpy = jest.spyOn(process, 'exit').mockImplementation((() => {}) as any);
  });

  afterEach(() => {
    jest.resetModules();
    consoleSpy.mockRestore();
    processExitSpy.mockRestore();
  });

  describe('Core Functionality', () => {
    it('should execute without errors when called', async () => {
      mockStorageManager.listProjects.mockResolvedValue([]);
      
      await expect(listCommand({})).resolves.not.toThrow();
    });

    it('should call storage manager methods', async () => {
      mockStorageManager.listProjects.mockResolvedValue(['test-project']);
      
      const mockProjectInfo: ProjectInfo = {
        projectName: 'test-project',
        projectPath: '/path/to/test-project',
        projectType: 'typescript',
        templateVersion: '1.0.0',
        setupDate: '2023-01-01T00:00:00Z',
        lastUpdate: '2023-01-01T12:00:00Z'
      };
      
      mockStorageManager.getProjectInfo.mockResolvedValue(mockProjectInfo);
      
      await listCommand({});
      
      expect(mockStorageManager.listProjects).toHaveBeenCalled();
      expect(mockStorageManager.getProjectInfo).toHaveBeenCalledWith('test-project');
    });

    it('should handle empty project list', async () => {
      mockStorageManager.listProjects.mockResolvedValue([]);
      
      await listCommand({});
      
      expect(mockStorageManager.listProjects).toHaveBeenCalled();
      expect(mockP.note).toHaveBeenCalledWith(
        expect.stringContaining('No projects currently managed'),
        expect.any(String)
      );
    });

    it('should handle JSON output option', async () => {
      mockStorageManager.listProjects.mockResolvedValue(['json-project']);
      
      const mockProjectInfo: ProjectInfo = {
        projectName: 'json-project',
        projectPath: '/path/to/json-project',
        projectType: 'typescript',
        templateVersion: '1.0.0',
        setupDate: '2023-01-01T00:00:00Z',
        lastUpdate: '2023-01-01T12:00:00Z'
      };
      
      mockStorageManager.getProjectInfo.mockResolvedValue(mockProjectInfo);
      
      await listCommand({ json: true });
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('"projectName"')
      );
    });

    it('should handle verbose output option', async () => {
      mockStorageManager.listProjects.mockResolvedValue(['verbose-project']);
      
      const mockProjectInfo: ProjectInfo = {
        projectName: 'verbose-project',
        projectPath: '/path/to/verbose-project',
        projectType: 'typescript',
        templateVersion: '1.0.0',
        setupDate: '2023-01-01T00:00:00Z',
        lastUpdate: '2023-01-01T12:00:00Z'
      };
      
      mockStorageManager.getProjectInfo.mockResolvedValue(mockProjectInfo);
      
      // Mock file system operations for verbose mode
      const mockPathUtils = require('../../../../src/utils/paths').PathUtils;
      const mockFs = require('fs-extra');
      
      mockPathUtils.exists.mockResolvedValue(true);
      mockPathUtils.getSize.mockResolvedValue(1024);
      mockFs.stat.mockResolvedValue({ mtime: new Date('2023-01-01T12:00:00Z') });
      mockFs.readFile.mockResolvedValue('# Test CLAUDE.md content');
      
      await listCommand({ verbose: true });
      
      expect(mockStorageManager.listProjects).toHaveBeenCalled();
      expect(mockStorageManager.getProjectInfo).toHaveBeenCalledWith('verbose-project');
    });

    it('should handle storage manager errors', async () => {
      const error = new Error('Storage error');
      mockStorageManager.listProjects.mockRejectedValue(error);
      
      await listCommand({});
      
      expect(mockP.cancel).toHaveBeenCalledWith('Storage error');
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it('should handle project info errors', async () => {
      mockStorageManager.listProjects.mockResolvedValue(['error-project']);
      mockStorageManager.getProjectInfo.mockRejectedValue(new Error('Info error'));
      
      await listCommand({});
      
      expect(mockP.cancel).toHaveBeenCalledWith('Info error');
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it('should handle multiple projects', async () => {
      mockStorageManager.listProjects.mockResolvedValue(['project1', 'project2', 'project3']);
      
      const mockProjectInfo: ProjectInfo = {
        projectName: 'project1',
        projectPath: '/path/to/project1',
        projectType: 'typescript',
        templateVersion: '1.0.0',
        setupDate: '2023-01-01T00:00:00Z',
        lastUpdate: '2023-01-01T12:00:00Z'
      };
      
      mockStorageManager.getProjectInfo.mockResolvedValue(mockProjectInfo);
      
      await listCommand({});
      
      expect(mockStorageManager.listProjects).toHaveBeenCalled();
      expect(mockStorageManager.getProjectInfo).toHaveBeenCalledTimes(3);
    });
  });

  describe('Edge Cases', () => {
    it('should handle null project info gracefully', async () => {
      mockStorageManager.listProjects.mockResolvedValue(['null-project']);
      mockStorageManager.getProjectInfo.mockResolvedValue(null);
      
      // Should not throw - list command handles null project info with optional chaining
      await expect(listCommand({})).resolves.not.toThrow();
    });

    it('should handle file system errors in verbose mode', async () => {
      mockStorageManager.listProjects.mockResolvedValue(['fs-error-project']);
      
      const mockProjectInfo: ProjectInfo = {
        projectName: 'fs-error-project',
        projectPath: '/path/to/fs-error-project',
        projectType: 'typescript',
        templateVersion: '1.0.0',
        setupDate: '2023-01-01T00:00:00Z',
        lastUpdate: '2023-01-01T12:00:00Z'
      };
      
      mockStorageManager.getProjectInfo.mockResolvedValue(mockProjectInfo);
      
      const mockPathUtils = require('../../../../src/utils/paths').PathUtils;
      const mockFs = require('fs-extra');
      
      mockPathUtils.exists.mockResolvedValue(true);
      mockPathUtils.getSize.mockResolvedValue(1024);
      // Mock fs.readdir to throw an error when trying to read directories
      mockFs.readdir.mockRejectedValue(new Error('File system error'));
      
      await listCommand({ verbose: true });
      
      expect(mockP.cancel).toHaveBeenCalledWith('File system error');
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it('should prioritize JSON output over verbose when both options are provided', async () => {
      mockStorageManager.listProjects.mockResolvedValue(['dual-option-project']);
      
      const mockProjectInfo: ProjectInfo = {
        projectName: 'dual-option-project',
        projectPath: '/path/to/dual-option-project',
        projectType: 'typescript',
        templateVersion: '1.0.0',
        setupDate: '2023-01-01T00:00:00Z',
        lastUpdate: '2023-01-01T12:00:00Z'
      };
      
      mockStorageManager.getProjectInfo.mockResolvedValue(mockProjectInfo);
      
      const mockPathUtils = require('../../../../src/utils/paths').PathUtils;
      mockPathUtils.getSize.mockResolvedValue(512);
      
      await listCommand({ verbose: true, json: true });
      
      // Should output JSON, not verbose format
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('"projectName": "dual-option-project"')
      );
    });
  });
});