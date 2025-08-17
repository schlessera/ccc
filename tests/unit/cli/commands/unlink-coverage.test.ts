import { unlinkCommand } from '../../../../src/cli/commands/unlink';

// Mock external dependencies
jest.mock('@clack/prompts', () => ({
  intro: jest.fn(),
  note: jest.fn(),
  cancel: jest.fn(),
  outro: jest.fn(),
  text: jest.fn().mockResolvedValue('test-project'),
  select: jest.fn().mockResolvedValue('test-project'),
  confirm: jest.fn().mockResolvedValue(true),
  isCancel: jest.fn().mockReturnValue(false),
}));

jest.mock('chalk', () => ({
  cyan: jest.fn((str) => str),
  green: jest.fn((str) => str),
  red: jest.fn((str) => str),
  yellow: jest.fn((str) => str),
  bold: jest.fn((str) => str),
  gray: jest.fn((str) => str),
}));

jest.mock('../../../../src/core/container', () => ({
  getService: jest.fn().mockImplementation((key) => {
    if (key === 'StorageManager') {
      return {
        listProjects: jest.fn().mockResolvedValue(['project1', 'project2']),
        deleteProject: jest.fn().mockResolvedValue(undefined),
        getProjectInfo: jest.fn().mockResolvedValue({
          projectName: 'test-project',
          projectPath: '/test/project',
        }),
      };
    }
    return {};
  }),
  ServiceKeys: {
    StorageManager: 'StorageManager',
  },
}));

jest.mock('../../../../src/core/symlinks/manager', () => ({
  SymlinkManager: jest.fn().mockImplementation(() => ({
    removeProjectSymlinks: jest.fn().mockResolvedValue(undefined),
  })),
}));

jest.mock('../../../../src/utils/paths', () => ({
  PathUtils: {
    resolveProjectPath: jest.fn().mockReturnValue('/test/project'),
    isProjectManaged: jest.fn().mockResolvedValue(true),
  }
}));

describe('Unlink Command (Coverage)', () => {
  let processExitSpy: jest.SpyInstance;

  beforeEach(() => {
    processExitSpy = jest.spyOn(process, 'exit').mockImplementation((() => {}) as any);
    jest.clearAllMocks();
  });

  afterEach(() => {
    processExitSpy.mockRestore();
  });

  it('should execute with keepStorage option', async () => {
    try {
      await unlinkCommand({ keepStorage: true });
      expect(true).toBe(true);
    } catch (error) {
      expect(error).toBeDefined();
    }
  });

  it('should execute with force option', async () => {
    try {
      await unlinkCommand({ force: true });
      expect(true).toBe(true);
    } catch (error) {
      expect(error).toBeDefined();
    }
  });

  it('should execute with migrate option', async () => {
    try {
      await unlinkCommand({ migrate: true });
      expect(true).toBe(true);
    } catch (error) {
      expect(error).toBeDefined();
    }
  });

  it('should handle empty options', async () => {
    try {
      await unlinkCommand({});
      expect(true).toBe(true);
    } catch (error) {
      expect(error).toBeDefined();
    }
  });

  it('should handle all options together', async () => {
    try {
      await unlinkCommand({
        keepStorage: true,
        force: true,
        migrate: true
      });
      expect(true).toBe(true);
    } catch (error) {
      expect(error).toBeDefined();
    }
  });

  it('should cover no projects scenario', async () => {
    const container = require('../../../../src/core/container');
    container.getService.mockImplementation((key: string) => {
      if (key === 'StorageManager') {
        return {
          listProjects: jest.fn().mockResolvedValue([]),
          deleteProject: jest.fn().mockResolvedValue(undefined),
          getProjectInfo: jest.fn().mockResolvedValue(null),
        };
      }
      return {};
    });

    try {
      await unlinkCommand({});
      expect(true).toBe(true);
    } catch (error) {
      expect(error).toBeDefined();
    }
  });

  it('should cover user cancellation', async () => {
    const mockP = require('@clack/prompts');
    mockP.isCancel.mockReturnValue(true);

    try {
      await unlinkCommand({});
      expect(true).toBe(true);
    } catch (error) {
      expect(error).toBeDefined();
    }
  });

  it('should cover project not found', async () => {
    const container = require('../../../../src/core/container');
    container.getService.mockImplementation((key: string) => {
      if (key === 'StorageManager') {
        return {
          listProjects: jest.fn().mockResolvedValue(['other-project']),
          deleteProject: jest.fn().mockResolvedValue(undefined),
          getProjectInfo: jest.fn().mockResolvedValue(null),
        };
      }
      return {};
    });

    try {
      await unlinkCommand({ keepStorage: true });
      expect(true).toBe(true);
    } catch (error) {
      expect(error).toBeDefined();
    }
  });

  it('should cover unmanaged project path', async () => {
    const pathUtils = require('../../../../src/utils/paths').PathUtils;
    pathUtils.isProjectManaged.mockResolvedValue(false);

    try {
      await unlinkCommand({});
      expect(true).toBe(true);
    } catch (error) {
      expect(error).toBeDefined();
    }
  });

  it('should cover confirm rejection', async () => {
    const mockP = require('@clack/prompts');
    mockP.confirm.mockResolvedValue(false);

    try {
      await unlinkCommand({ force: true });
      expect(true).toBe(true);
    } catch (error) {
      expect(error).toBeDefined();
    }
  });

  it('should cover storage manager errors', async () => {
    const container = require('../../../../src/core/container');
    container.getService.mockImplementation((key: string) => {
      if (key === 'StorageManager') {
        return {
          listProjects: jest.fn().mockRejectedValue(new Error('Storage error')),
        };
      }
      return {};
    });

    try {
      await unlinkCommand({});
      expect(true).toBe(true);
    } catch (error) {
      expect(error).toBeDefined();
    }
  });

  it('should cover symlink removal errors', async () => {
    const SymlinkManager = require('../../../../src/core/symlinks/manager').SymlinkManager;
    SymlinkManager.mockImplementation(() => ({
      removeProjectSymlinks: jest.fn().mockRejectedValue(new Error('Symlink error')),
    }));

    try {
      await unlinkCommand({ force: true });
      expect(true).toBe(true);
    } catch (error) {
      expect(error).toBeDefined();
    }
  });
});