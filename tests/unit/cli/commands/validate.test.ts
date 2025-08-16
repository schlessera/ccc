import { validateCommand } from '../../../../src/cli/commands/validate';

// Mock all dependencies
jest.mock('@clack/prompts', () => ({
  cancel: jest.fn(),
  note: jest.fn(),
  confirm: jest.fn(),
  spinner: jest.fn(() => ({
    start: jest.fn(),
    stop: jest.fn(),
  })),
  isCancel: jest.fn(),
  outro: jest.fn(),
}));

jest.mock('chalk', () => {
  const mockChalk = {
    red: jest.fn((text) => `[RED]${text}[/RED]`),
    green: jest.fn((text) => `[GREEN]${text}[/GREEN]`),
    yellow: jest.fn((text) => `[YELLOW]${text}[/YELLOW]`),
    cyan: jest.fn((text) => `[CYAN]${text}[/CYAN]`),
    gray: jest.fn((text) => `[GRAY]${text}[/GRAY]`),
  };
  return {
    __esModule: true,
    default: mockChalk
  };
});

jest.mock('fs-extra', () => ({
  access: jest.fn(),
  constants: {
    R_OK: 4,
    W_OK: 2,
  },
  writeJSON: jest.fn(),
}));

jest.mock('path', () => ({
  join: jest.fn((...args) => args.join('/')),
}));

jest.mock('../../../../src/utils/paths', () => ({
  PathUtils: {
    exists: jest.fn(),
    isProjectManaged: jest.fn(),
    getProjectStorageDir: jest.fn(),
    ensureDir: jest.fn(),
  }
}));

jest.mock('../../../../src/core/container', () => ({
  getService: jest.fn(),
  ServiceKeys: {
    StorageManager: 'StorageManager',
  }
}));

jest.mock('../../../../src/core/symlinks/manager', () => ({
  SymlinkManager: jest.fn().mockImplementation(() => ({
    validateSymlinks: jest.fn(),
    createProjectSymlinks: jest.fn(),
  }))
}));

import * as p from '@clack/prompts';
import * as fs from 'fs-extra';
import { PathUtils } from '../../../../src/utils/paths';
import { getService } from '../../../../src/core/container';
import { SymlinkManager } from '../../../../src/core/symlinks/manager';

describe('validateCommand', () => {
  let mockProcess: any;
  let mockStorageManager: any;
  let mockSymlinkManager: any;

  beforeEach(() => {
    // Mock process.cwd and process.exit
    mockProcess = {
      cwd: jest.fn(() => '/test/project'),
      exit: jest.fn(),
    };
    Object.defineProperty(global, 'process', {
      value: mockProcess,
      writable: true,
    });

    // Setup mock StorageManager
    mockStorageManager = {
      listProjects: jest.fn(),
      getProjectInfo: jest.fn(),
    };
    (getService as jest.Mock).mockReturnValue(mockStorageManager);

    // Setup mock SymlinkManager
    mockSymlinkManager = {
      validateSymlinks: jest.fn(),
      createProjectSymlinks: jest.fn(),
    };
    (SymlinkManager as jest.Mock).mockImplementation(() => mockSymlinkManager);

    // Reset all mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Basic functionality', () => {
    it('should validate all projects when no project specified and not in managed directory', async () => {
      (PathUtils.isProjectManaged as jest.Mock).mockResolvedValue(false);
      mockStorageManager.listProjects.mockResolvedValue([]);

      await validateCommand({});

      expect(PathUtils.isProjectManaged).toHaveBeenCalledWith('/test/project');
      expect(mockStorageManager.listProjects).toHaveBeenCalled();
      expect(p.note).toHaveBeenCalledWith('No projects to validate', '📋 Empty Project List');
    });

    it('should validate current project when in managed directory', async () => {
      (PathUtils.isProjectManaged as jest.Mock).mockResolvedValue(true);
      mockStorageManager.listProjects.mockResolvedValue(['test-project']);
      mockStorageManager.getProjectInfo.mockResolvedValue({
        projectPath: '/test/project',
        projectName: 'test-project'
      });
      (PathUtils.exists as jest.Mock).mockResolvedValue(true);
      (PathUtils.getProjectStorageDir as jest.Mock).mockReturnValue('/storage/test-project');
      mockSymlinkManager.validateSymlinks.mockResolvedValue(true);
      (fs.access as unknown as jest.Mock).mockResolvedValue(undefined);

      await validateCommand({});

      expect(PathUtils.isProjectManaged).toHaveBeenCalledWith('/test/project');
      expect(p.note).toHaveBeenCalledWith(
        '[GREEN]✅[/GREEN] All checks passed',
        '[CYAN]test-project[/CYAN]'
      );
    });

    it('should validate specific project when project option provided', async () => {
      const mockProjectInfo = {
        projectPath: '/path/to/project',
        projectName: 'specific-project'
      };
      mockStorageManager.getProjectInfo.mockResolvedValue(mockProjectInfo);
      (PathUtils.exists as jest.Mock).mockResolvedValue(true);
      (PathUtils.getProjectStorageDir as jest.Mock).mockReturnValue('/storage/specific-project');
      mockSymlinkManager.validateSymlinks.mockResolvedValue(true);
      (fs.access as unknown as jest.Mock).mockResolvedValue(undefined);

      await validateCommand({ project: 'specific-project' });

      expect(mockStorageManager.getProjectInfo).toHaveBeenCalledWith('specific-project');
      expect(p.note).toHaveBeenCalledWith(
        '[GREEN]✅[/GREEN] All checks passed',
        '[CYAN]specific-project[/CYAN]'
      );
    });

    it('should handle non-existent specific project', async () => {
      mockStorageManager.getProjectInfo.mockResolvedValue(null);

      await validateCommand({ project: 'nonexistent' });

      expect(p.cancel).toHaveBeenCalledWith('Project not found: nonexistent');
      expect(mockProcess.exit).toHaveBeenCalledWith(1);
    });
  });

  describe('Current project validation', () => {
    it('should handle case where project name cannot be determined', async () => {
      (PathUtils.isProjectManaged as jest.Mock).mockResolvedValue(true);
      mockStorageManager.listProjects.mockResolvedValue(['other-project']);
      mockStorageManager.getProjectInfo.mockResolvedValue({
        projectPath: '/different/path',
        projectName: 'other-project'
      });

      await validateCommand({});

      expect(p.cancel).toHaveBeenCalledWith('Could not determine project name from current directory');
      expect(mockProcess.exit).toHaveBeenCalledWith(1);
    });

    it('should find project by matching path', async () => {
      (PathUtils.isProjectManaged as jest.Mock).mockResolvedValue(true);
      mockStorageManager.listProjects.mockResolvedValue(['test-project']);
      mockStorageManager.getProjectInfo.mockResolvedValue({
        projectPath: '/test/project',
        projectName: 'test-project'
      });
      (PathUtils.exists as jest.Mock).mockResolvedValue(true);
      (PathUtils.getProjectStorageDir as jest.Mock).mockReturnValue('/storage/test-project');
      mockSymlinkManager.validateSymlinks.mockResolvedValue(true);
      (fs.access as unknown as jest.Mock).mockResolvedValue(undefined);

      await validateCommand({});

      expect(mockStorageManager.getProjectInfo).toHaveBeenCalledWith('test-project');
    });
  });

  describe('All projects validation', () => {
    it('should validate multiple projects', async () => {
      (PathUtils.isProjectManaged as jest.Mock).mockResolvedValue(false);
      mockStorageManager.listProjects.mockResolvedValue(['project1', 'project2']);
      
      mockStorageManager.getProjectInfo
        .mockResolvedValueOnce({
          projectPath: '/path/to/project1',
          projectName: 'project1'
        })
        .mockResolvedValueOnce({
          projectPath: '/path/to/project2',
          projectName: 'project2'
        });

      (PathUtils.exists as jest.Mock).mockResolvedValue(true);
      (PathUtils.getProjectStorageDir as jest.Mock)
        .mockReturnValueOnce('/storage/project1')
        .mockReturnValueOnce('/storage/project2');
      mockSymlinkManager.validateSymlinks.mockResolvedValue(true);
      (fs.access as unknown as jest.Mock).mockResolvedValue(undefined);

      const mockSpinner = {
        start: jest.fn(),
        stop: jest.fn(),
      };
      (p.spinner as jest.Mock).mockReturnValue(mockSpinner);

      await validateCommand({});

      expect(mockSpinner.start).toHaveBeenCalledWith('Validating project1');
      expect(mockSpinner.stop).toHaveBeenCalledWith('Validated project1');
      expect(mockSpinner.start).toHaveBeenCalledWith('Validating project2');
      expect(mockSpinner.stop).toHaveBeenCalledWith('Validated project2');
    });

    it('should handle project with missing project info', async () => {
      (PathUtils.isProjectManaged as jest.Mock).mockResolvedValue(false);
      mockStorageManager.listProjects.mockResolvedValue(['project1']);
      mockStorageManager.getProjectInfo.mockResolvedValue(null);
      (PathUtils.getProjectStorageDir as jest.Mock).mockReturnValue('/storage/project1');

      const mockSpinner = {
        start: jest.fn(),
        stop: jest.fn(),
      };
      (p.spinner as jest.Mock).mockReturnValue(mockSpinner);

      await validateCommand({});

      expect(mockSpinner.stop).toHaveBeenCalledWith('Validated project1 (storage issues found)');
      expect(p.note).toHaveBeenCalledWith(
        '❌ Missing .project-info file',
        expect.stringContaining('project1')
      );
    });
  });

  describe('Issue detection', () => {
    it('should detect missing project path', async () => {
      const mockProjectInfo = {
        projectPath: '/nonexistent/path',
        projectName: 'test-project'
      };
      mockStorageManager.getProjectInfo.mockResolvedValue(mockProjectInfo);
      (PathUtils.exists as jest.Mock).mockResolvedValue(false);

      await validateCommand({ project: 'test-project' });

      expect(p.note).toHaveBeenCalledWith(
        '❌ Project path does not exist',
        expect.stringContaining('test-project')
      );
    });

    it('should detect missing storage directory', async () => {
      const mockProjectInfo = {
        projectPath: '/path/to/project',
        projectName: 'test-project'
      };
      mockStorageManager.getProjectInfo.mockResolvedValue(mockProjectInfo);
      (PathUtils.exists as jest.Mock)
        .mockResolvedValueOnce(true)  // project path exists
        .mockResolvedValueOnce(false) // storage dir missing
        .mockResolvedValue(true);     // other paths exist
      (PathUtils.getProjectStorageDir as jest.Mock).mockReturnValue('/storage/test-project');
      mockSymlinkManager.validateSymlinks.mockResolvedValue(true);
      (fs.access as unknown as jest.Mock).mockResolvedValue(undefined);

      await validateCommand({ project: 'test-project' });

      expect(p.note).toHaveBeenCalledWith(
        expect.stringContaining('❌ Storage directory missing[GRAY] (fixable)[/GRAY]'),
        expect.stringContaining('test-project')
      );
    });

    it('should detect missing .claude directory', async () => {
      const mockProjectInfo = {
        projectPath: '/path/to/project',
        projectName: 'test-project'
      };
      mockStorageManager.getProjectInfo.mockResolvedValue(mockProjectInfo);
      (PathUtils.exists as jest.Mock)
        .mockResolvedValueOnce(true)  // project path exists
        .mockResolvedValueOnce(true)  // storage dir exists
        .mockResolvedValueOnce(false) // .claude dir missing
        .mockResolvedValueOnce(true); // CLAUDE.md exists
      (PathUtils.getProjectStorageDir as jest.Mock).mockReturnValue('/storage/test-project');
      (fs.access as unknown as jest.Mock).mockResolvedValue(undefined);

      await validateCommand({ project: 'test-project' });

      expect(p.note).toHaveBeenCalledWith(
        expect.stringContaining('❌ .claude directory missing[GRAY] (fixable)[/GRAY]'),
        expect.stringContaining('test-project')
      );
    });

    it('should detect broken symlinks', async () => {
      const mockProjectInfo = {
        projectPath: '/path/to/project',
        projectName: 'test-project'
      };
      mockStorageManager.getProjectInfo.mockResolvedValue(mockProjectInfo);
      (PathUtils.exists as jest.Mock).mockResolvedValue(true);
      (PathUtils.getProjectStorageDir as jest.Mock).mockReturnValue('/storage/test-project');
      mockSymlinkManager.validateSymlinks.mockResolvedValue(false);
      (fs.access as unknown as jest.Mock).mockResolvedValue(undefined);

      await validateCommand({ project: 'test-project' });

      expect(p.note).toHaveBeenCalledWith(
        expect.stringContaining('❌ .claude symlink is broken or invalid[GRAY] (fixable)[/GRAY]'),
        expect.stringContaining('test-project')
      );
    });

    it('should detect missing CLAUDE.md file', async () => {
      const mockProjectInfo = {
        projectPath: '/path/to/project',
        projectName: 'test-project'
      };
      mockStorageManager.getProjectInfo.mockResolvedValue(mockProjectInfo);
      (PathUtils.exists as jest.Mock)
        .mockResolvedValueOnce(true)  // project path exists
        .mockResolvedValueOnce(true)  // storage dir exists
        .mockResolvedValueOnce(true)  // .claude dir exists
        .mockResolvedValueOnce(false) // CLAUDE.md missing
        .mockResolvedValueOnce(true); // settings.json exists
      (PathUtils.getProjectStorageDir as jest.Mock).mockReturnValue('/storage/test-project');
      mockSymlinkManager.validateSymlinks.mockResolvedValue(true);
      (fs.access as unknown as jest.Mock).mockResolvedValue(undefined);

      await validateCommand({ project: 'test-project' });

      expect(p.note).toHaveBeenCalledWith(
        expect.stringContaining('❌ CLAUDE.md file missing[GRAY] (fixable)[/GRAY]'),
        expect.stringContaining('test-project')
      );
    });

    it('should detect missing essential files', async () => {
      const mockProjectInfo = {
        projectPath: '/path/to/project',
        projectName: 'test-project'
      };
      mockStorageManager.getProjectInfo.mockResolvedValue(mockProjectInfo);
      (PathUtils.exists as jest.Mock)
        .mockResolvedValueOnce(true)  // project path exists
        .mockResolvedValueOnce(true)  // storage dir exists
        .mockResolvedValueOnce(true)  // .claude dir exists
        .mockResolvedValueOnce(true)  // CLAUDE.md exists
        .mockResolvedValueOnce(false); // settings.json missing
      (PathUtils.getProjectStorageDir as jest.Mock).mockReturnValue('/storage/test-project');
      mockSymlinkManager.validateSymlinks.mockResolvedValue(true);
      (fs.access as unknown as jest.Mock).mockResolvedValue(undefined);

      await validateCommand({ project: 'test-project' });

      expect(p.note).toHaveBeenCalledWith(
        expect.stringContaining('⚠️ Essential file missing: settings.json[GRAY] (fixable)[/GRAY]'),
        expect.stringContaining('test-project')
      );
    });

    it('should detect permission issues', async () => {
      const mockProjectInfo = {
        projectPath: '/path/to/project',
        projectName: 'test-project'
      };
      mockStorageManager.getProjectInfo.mockResolvedValue(mockProjectInfo);
      (PathUtils.exists as jest.Mock).mockResolvedValue(true);
      (PathUtils.getProjectStorageDir as jest.Mock).mockReturnValue('/storage/test-project');
      mockSymlinkManager.validateSymlinks.mockResolvedValue(true);
      (fs.access as unknown as jest.Mock).mockRejectedValue(new Error('Permission denied'));

      await validateCommand({ project: 'test-project' });

      expect(p.note).toHaveBeenCalledWith(
        expect.stringContaining('❌ No read/write access to storage directory'),
        expect.stringContaining('test-project')
      );
    });
  });

  describe('Validation summary', () => {
    it('should show clean validation summary when all projects pass', async () => {
      (PathUtils.isProjectManaged as jest.Mock).mockResolvedValue(false);
      mockStorageManager.listProjects.mockResolvedValue(['project1']);
      mockStorageManager.getProjectInfo.mockResolvedValue({
        projectPath: '/path/to/project1',
        projectName: 'project1'
      });
      (PathUtils.exists as jest.Mock).mockResolvedValue(true);
      (PathUtils.getProjectStorageDir as jest.Mock).mockReturnValue('/storage/project1');
      mockSymlinkManager.validateSymlinks.mockResolvedValue(true);
      (fs.access as unknown as jest.Mock).mockResolvedValue(undefined);

      await validateCommand({});

      expect(p.note).toHaveBeenCalledWith(
        expect.stringContaining('Projects validated: 1'),
        '[GREEN]✅ Validation Complete[/GREEN]'
      );
    });

    it('should show issues summary when problems found', async () => {
      const mockProjectInfo = {
        projectPath: '/path/to/project',
        projectName: 'test-project'
      };
      mockStorageManager.getProjectInfo.mockResolvedValue(mockProjectInfo);
      (PathUtils.exists as jest.Mock)
        .mockResolvedValueOnce(true)  // project path exists
        .mockResolvedValueOnce(false) // storage dir missing
        .mockResolvedValue(true);     // other paths exist
      (PathUtils.getProjectStorageDir as jest.Mock).mockReturnValue('/storage/test-project');
      mockSymlinkManager.validateSymlinks.mockResolvedValue(true);
      (fs.access as unknown as jest.Mock).mockResolvedValue(undefined);

      await validateCommand({ project: 'test-project' });

      expect(p.note).toHaveBeenCalledWith(
        expect.stringContaining('Total issues: 1'),
        '[YELLOW]⚠️ Validation Summary[/YELLOW]'
      );
      expect(p.note).toHaveBeenCalledWith(
        'Run with --fix flag to attempt automatic repairs',
        '💡 Tip'
      );
    });
  });

  describe('Auto-fix functionality', () => {
    it('should offer to fix issues when --fix flag is used', async () => {
      const mockProjectInfo = {
        projectPath: '/path/to/project',
        projectName: 'test-project'
      };
      mockStorageManager.getProjectInfo.mockResolvedValue(mockProjectInfo);
      (PathUtils.exists as jest.Mock)
        .mockResolvedValueOnce(true)  // project path exists
        .mockResolvedValueOnce(false) // storage dir missing
        .mockResolvedValue(true);     // other paths exist
      (PathUtils.getProjectStorageDir as jest.Mock).mockReturnValue('/storage/test-project');
      mockSymlinkManager.validateSymlinks.mockResolvedValue(true);
      (fs.access as unknown as jest.Mock).mockResolvedValue(undefined);
      (p.confirm as jest.Mock).mockResolvedValue(true);
      (PathUtils.ensureDir as jest.Mock).mockResolvedValue(undefined);

      const mockSpinner = {
        start: jest.fn(),
        stop: jest.fn(),
      };
      (p.spinner as jest.Mock).mockReturnValue(mockSpinner);

      await validateCommand({ project: 'test-project', fix: true });

      expect(p.confirm).toHaveBeenCalledWith({
        message: 'Attempt to fix 1 fixable issues?',
        initialValue: true
      });
      expect(mockSpinner.start).toHaveBeenCalledWith('Fixing: Storage directory missing');
      expect(mockSpinner.stop).toHaveBeenCalledWith('Fixed: Storage directory missing');
    });

    it('should skip fixing when user declines', async () => {
      const mockProjectInfo = {
        projectPath: '/path/to/project',
        projectName: 'test-project'
      };
      mockStorageManager.getProjectInfo.mockResolvedValue(mockProjectInfo);
      (PathUtils.exists as jest.Mock)
        .mockResolvedValueOnce(true)  // project path exists
        .mockResolvedValueOnce(false) // storage dir missing
        .mockResolvedValue(true);     // other paths exist
      (PathUtils.getProjectStorageDir as jest.Mock).mockReturnValue('/storage/test-project');
      mockSymlinkManager.validateSymlinks.mockResolvedValue(true);
      (fs.access as unknown as jest.Mock).mockResolvedValue(undefined);
      (p.confirm as jest.Mock).mockResolvedValue(false);

      await validateCommand({ project: 'test-project', fix: true });

      expect(p.confirm).toHaveBeenCalled();
      expect(PathUtils.ensureDir).not.toHaveBeenCalled();
    });

    it('should handle cancelled fix confirmation', async () => {
      const mockProjectInfo = {
        projectPath: '/path/to/project',
        projectName: 'test-project'
      };
      mockStorageManager.getProjectInfo.mockResolvedValue(mockProjectInfo);
      (PathUtils.exists as jest.Mock)
        .mockResolvedValueOnce(true)  // project path exists
        .mockResolvedValueOnce(false) // storage dir missing
        .mockResolvedValue(true);     // other paths exist
      (PathUtils.getProjectStorageDir as jest.Mock).mockReturnValue('/storage/test-project');
      mockSymlinkManager.validateSymlinks.mockResolvedValue(true);
      (fs.access as unknown as jest.Mock).mockResolvedValue(undefined);
      (p.confirm as jest.Mock).mockResolvedValue(Symbol('cancel'));
      (p.isCancel as unknown as jest.Mock).mockReturnValue(true);

      await validateCommand({ project: 'test-project', fix: true });

      expect(PathUtils.ensureDir).not.toHaveBeenCalled();
    });

    it('should fix symlink issues', async () => {
      const mockProjectInfo = {
        projectPath: '/path/to/project',
        projectName: 'test-project'
      };
      mockStorageManager.getProjectInfo.mockResolvedValue(mockProjectInfo);
      (PathUtils.exists as jest.Mock)
        .mockResolvedValueOnce(true) // project path exists
        .mockResolvedValueOnce(true) // storage dir exists
        .mockResolvedValueOnce(false); // .claude dir missing
      (PathUtils.getProjectStorageDir as jest.Mock).mockReturnValue('/storage/test-project');
      (fs.access as unknown as jest.Mock).mockResolvedValue(undefined);
      (p.confirm as jest.Mock).mockResolvedValue(true);
      (p.isCancel as unknown as jest.Mock).mockReturnValue(false);
      mockSymlinkManager.createProjectSymlinks.mockResolvedValue(undefined);

      const mockSpinner = {
        start: jest.fn(),
        stop: jest.fn(),
      };
      (p.spinner as jest.Mock).mockReturnValue(mockSpinner);

      await validateCommand({ project: 'test-project', fix: true });

      expect(mockSymlinkManager.createProjectSymlinks).toHaveBeenCalledWith(
        '/path/to/project',
        'test-project'
      );
    });

    it('should fix template issues', async () => {
      const mockProjectInfo = {
        projectPath: '/path/to/project',
        projectName: 'test-project'
      };
      mockStorageManager.getProjectInfo.mockResolvedValue(mockProjectInfo);
      (PathUtils.exists as jest.Mock)
        .mockResolvedValueOnce(true)  // project path exists
        .mockResolvedValueOnce(true)  // storage dir exists
        .mockResolvedValueOnce(true)  // .claude dir exists
        .mockResolvedValueOnce(true)  // CLAUDE.md exists
        .mockResolvedValueOnce(false); // settings.json missing
      (PathUtils.getProjectStorageDir as jest.Mock).mockReturnValue('/storage/test-project');
      mockSymlinkManager.validateSymlinks.mockResolvedValue(true);
      (fs.access as unknown as jest.Mock).mockResolvedValue(undefined);
      (p.confirm as jest.Mock).mockResolvedValue(true);
      (p.isCancel as unknown as jest.Mock).mockReturnValue(false);
      (fs.writeJSON as jest.Mock).mockResolvedValue(undefined);

      const mockSpinner = {
        start: jest.fn(),
        stop: jest.fn(),
      };
      (p.spinner as jest.Mock).mockReturnValue(mockSpinner);

      await validateCommand({ project: 'test-project', fix: true });

      expect(fs.writeJSON).toHaveBeenCalledWith(
        '/storage/test-project/settings.json',
        expect.objectContaining({
          version: '1.0.0',
          created: expect.any(String)
        }),
        { spaces: 2 }
      );
    });

    it('should handle fix failures gracefully', async () => {
      const mockProjectInfo = {
        projectPath: '/path/to/project',
        projectName: 'test-project'
      };
      mockStorageManager.getProjectInfo.mockResolvedValue(mockProjectInfo);
      (PathUtils.exists as jest.Mock)
        .mockResolvedValueOnce(true)  // project path exists
        .mockResolvedValueOnce(false) // storage dir missing
        .mockResolvedValue(true);     // other paths exist
      (PathUtils.getProjectStorageDir as jest.Mock).mockReturnValue('/storage/test-project');
      mockSymlinkManager.validateSymlinks.mockResolvedValue(true);
      (fs.access as unknown as jest.Mock).mockResolvedValue(undefined);
      (p.confirm as jest.Mock).mockResolvedValue(true);
      (p.isCancel as unknown as jest.Mock).mockReturnValue(false);
      (PathUtils.ensureDir as jest.Mock).mockRejectedValue(new Error('Fix failed'));

      const mockSpinner = {
        start: jest.fn(),
        stop: jest.fn(),
      };
      (p.spinner as jest.Mock).mockReturnValue(mockSpinner);

      await validateCommand({ project: 'test-project', fix: true });

      expect(mockSpinner.stop).toHaveBeenCalledWith('Failed to fix: Storage directory missing');
      expect(p.note).toHaveBeenCalledWith(
        'Fixed 0 issues',
        '[GREEN]🔧 Repair Complete[/GREEN]'
      );
    });
  });

  describe('Error handling', () => {
    it('should handle validation errors gracefully', async () => {
      mockStorageManager.listProjects.mockRejectedValue(new Error('Storage error'));

      await validateCommand({});

      expect(p.cancel).toHaveBeenCalledWith('[RED]Storage error[/RED]');
      expect(mockProcess.exit).toHaveBeenCalledWith(1);
    });

    it('should handle project info retrieval errors', async () => {
      (PathUtils.isProjectManaged as jest.Mock).mockResolvedValue(false);
      mockStorageManager.listProjects.mockResolvedValue(['project1']);
      mockStorageManager.getProjectInfo.mockRejectedValue(new Error('Project info error'));

      await validateCommand({});

      expect(p.cancel).toHaveBeenCalledWith('[RED]Project info error[/RED]');
    });
  });
});