import { statusCommand } from '../../../../src/cli/commands/status';

// Mock all dependencies
jest.mock('@clack/prompts', () => ({
  cancel: jest.fn(),
  log: {
    message: jest.fn(),
  },
}));

jest.mock('chalk', () => {
  const mockChalk = {
    red: jest.fn((text) => `[RED]${text}[/RED]`),
    green: jest.fn((text) => `[GREEN]${text}[/GREEN]`),
    yellow: jest.fn((text) => `[YELLOW]${text}[/YELLOW]`),
    cyan: jest.fn((text) => `[CYAN]${text}[/CYAN]`),
    gray: jest.fn((text) => `[GRAY]${text}[/GRAY]`),
    bold: jest.fn((text) => `[BOLD]${text}[/BOLD]`),
  };
  return {
    __esModule: true,
    default: mockChalk
  };
});

jest.mock('path', () => ({
  basename: jest.fn((path) => path.split('/').pop()),
  join: jest.fn((...args) => args.join('/')),
}));

jest.mock('../../../../src/utils/paths', () => ({
  PathUtils: {
    isProjectManaged: jest.fn(),
    exists: jest.fn(),
  }
}));

jest.mock('../../../../src/core/symlinks/manager', () => ({
  SymlinkManager: jest.fn().mockImplementation(() => ({
    validateSymlinks: jest.fn(),
    getSymlinkTarget: jest.fn(),
  }))
}));

jest.mock('../../../../src/core/storage/manager', () => ({
  StorageManager: jest.fn().mockImplementation(() => ({
    getProjectInfo: jest.fn(),
  }))
}));

jest.mock('../../../../src/core/container', () => ({
  getService: jest.fn(),
  ServiceKeys: {
    StorageManager: 'StorageManager'
  }
}));

import * as p from '@clack/prompts';
import { PathUtils } from '../../../../src/utils/paths';
import { SymlinkManager } from '../../../../src/core/symlinks/manager';
import { StorageManager } from '../../../../src/core/storage/manager';
import { getService } from '../../../../src/core/container';

describe('statusCommand', () => {
  let mockProcess: any;
  let mockSymlinkManager: any;
  let mockStorageManager: any;
  
  const mockProjectInfo = {
    projectPath: '/path/to/project',
    projectType: 'react',
    templateVersion: '1.0.0',
    setupDate: '2023-01-01T00:00:00Z',
  };

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

    // Setup mock managers
    mockSymlinkManager = {
      validateSymlinks: jest.fn(),
      getSymlinkTarget: jest.fn(),
    };
    (SymlinkManager as jest.Mock).mockImplementation(() => mockSymlinkManager);

    mockStorageManager = {
      getProjectInfo: jest.fn(),
    };
    (StorageManager as jest.Mock).mockImplementation(() => mockStorageManager);
    
    // Mock the container service
    (getService as jest.Mock).mockReturnValue(mockStorageManager);

    // Reset all mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Current directory status', () => {
    it('should show status for managed project with valid symlinks', async () => {
      (PathUtils.isProjectManaged as jest.Mock).mockResolvedValue(true);
      mockSymlinkManager.validateSymlinks.mockResolvedValue(true);
      mockSymlinkManager.getSymlinkTarget
        .mockResolvedValueOnce('/storage/.claude')
        .mockResolvedValueOnce('/storage/CLAUDE.md');

      await statusCommand({});

      expect(PathUtils.isProjectManaged).toHaveBeenCalled();
      expect(mockSymlinkManager.validateSymlinks).toHaveBeenCalledWith('/test/project');
      expect(p.log.message).toHaveBeenCalledWith(
        expect.stringContaining('[BOLD]Project:[/BOLD] project')
      );
      expect(p.log.message).toHaveBeenCalledWith(
        expect.stringContaining('[GREEN]✓ CCC-managed[/GREEN]')
      );
      expect(p.log.message).toHaveBeenCalledWith(
        expect.stringContaining('[GREEN]✓ Valid[/GREEN]')
      );
    });

    it('should show status for managed project with invalid symlinks', async () => {
      (PathUtils.isProjectManaged as jest.Mock).mockResolvedValue(true);
      mockSymlinkManager.validateSymlinks.mockResolvedValue(false);
      mockSymlinkManager.getSymlinkTarget.mockResolvedValue(null);

      await statusCommand({});

      expect(p.log.message).toHaveBeenCalledWith(
        expect.stringContaining('[RED]✗ Invalid or broken[/RED]')
      );
    });

    it('should show symlink targets when available', async () => {
      (PathUtils.isProjectManaged as jest.Mock).mockResolvedValue(true);
      mockSymlinkManager.validateSymlinks.mockResolvedValue(true);
      mockSymlinkManager.getSymlinkTarget
        .mockResolvedValueOnce('/storage/path/.claude')
        .mockResolvedValueOnce('/storage/path/CLAUDE.md');

      await statusCommand({});

      expect(p.log.message).toHaveBeenCalledWith(
        expect.stringContaining('[BOLD]Symlink Targets:[/BOLD]')
      );
      expect(p.log.message).toHaveBeenCalledWith(
        expect.stringContaining('[CYAN].claude[/CYAN] → [GRAY]/storage/path/.claude[/GRAY]')
      );
      expect(p.log.message).toHaveBeenCalledWith(
        expect.stringContaining('[CYAN]CLAUDE.md[/CYAN] → [GRAY]/storage/path/CLAUDE.md[/GRAY]')
      );
    });

    it('should show status for non-managed project', async () => {
      (PathUtils.isProjectManaged as jest.Mock).mockResolvedValue(false);

      await statusCommand({});

      expect(p.log.message).toHaveBeenCalledWith(
        expect.stringContaining('[YELLOW]Not CCC-managed[/YELLOW]')
      );
      expect(p.log.message).toHaveBeenCalledWith(
        expect.stringContaining('Run "ccc setup" to manage this project')
      );
    });

    it('should handle partial symlink targets', async () => {
      (PathUtils.isProjectManaged as jest.Mock).mockResolvedValue(true);
      mockSymlinkManager.validateSymlinks.mockResolvedValue(true);
      mockSymlinkManager.getSymlinkTarget
        .mockResolvedValueOnce('/storage/.claude')
        .mockResolvedValueOnce(null); // No CLAUDE.md symlink

      await statusCommand({});

      expect(p.log.message).toHaveBeenCalledWith(
        expect.stringContaining('[CYAN].claude[/CYAN] → [GRAY]/storage/.claude[/GRAY]')
      );
      expect(p.log.message).toHaveBeenCalledWith(
        expect.not.stringContaining('CLAUDE.md →')
      );
    });
  });

  describe('Specific project status', () => {

    it('should show status for existing managed project', async () => {
      mockStorageManager.getProjectInfo.mockResolvedValue(mockProjectInfo);
      (PathUtils.exists as jest.Mock).mockResolvedValue(true);
      (PathUtils.isProjectManaged as jest.Mock).mockResolvedValue(true);
      mockSymlinkManager.validateSymlinks.mockResolvedValue(true);
      mockSymlinkManager.getSymlinkTarget
        .mockResolvedValueOnce('/storage/.claude')
        .mockResolvedValueOnce('/storage/CLAUDE.md');

      await statusCommand({ project: 'test-project' });

      expect(mockStorageManager.getProjectInfo).toHaveBeenCalledWith('test-project');
      const logCall = (p.log.message as jest.Mock).mock.calls[0][0];
      expect(logCall).toContain('[BOLD]Project:[/BOLD] test-project');
      expect(logCall).toContain('[BOLD]Template:[/BOLD] react v1.0.0');
      expect(logCall).toContain('[GREEN]✓ CCC-managed[/GREEN]');
    });

    it('should handle project not found in storage', async () => {
      mockStorageManager.getProjectInfo.mockResolvedValue(null);

      await statusCommand({ project: 'nonexistent-project' });

      expect(p.cancel).toHaveBeenCalledWith('Project not found: nonexistent-project');
      expect(mockProcess.exit).toHaveBeenCalledWith(1);
    });

    it('should handle project with missing directory', async () => {
      mockStorageManager.getProjectInfo.mockResolvedValue(mockProjectInfo);
      (PathUtils.exists as jest.Mock).mockResolvedValue(false);

      await statusCommand({ project: 'test-project' });

      expect(p.log.message).toHaveBeenCalledWith(
        expect.stringContaining('[RED](not found)[/RED]')
      );
      expect(p.log.message).toHaveBeenCalledWith(
        expect.stringContaining('[RED]✗ Path missing[/RED]')
      );
    });

    it('should handle project with missing symlinks', async () => {
      mockStorageManager.getProjectInfo.mockResolvedValue(mockProjectInfo);
      (PathUtils.exists as jest.Mock).mockResolvedValue(true);
      (PathUtils.isProjectManaged as jest.Mock).mockResolvedValue(false);

      await statusCommand({ project: 'test-project' });

      expect(p.log.message).toHaveBeenCalledWith(
        expect.stringContaining('[YELLOW]Not currently linked[/YELLOW]')
      );
      expect(p.log.message).toHaveBeenCalledWith(
        expect.stringContaining('Run "ccc setup" in the project directory')
      );
    });

    it('should show template information when available', async () => {
      mockStorageManager.getProjectInfo.mockResolvedValue(mockProjectInfo);
      (PathUtils.exists as jest.Mock).mockResolvedValue(true);
      (PathUtils.isProjectManaged as jest.Mock).mockResolvedValue(true);
      mockSymlinkManager.validateSymlinks.mockResolvedValue(true);

      await statusCommand({ project: 'test-project' });

      expect(p.log.message).toHaveBeenCalledWith(
        expect.stringContaining('[BOLD]Template:[/BOLD] react v1.0.0')
      );
    });

    it('should handle project without template version', async () => {
      const projectWithoutVersion = {
        ...mockProjectInfo,
        templateVersion: undefined,
      };
      mockStorageManager.getProjectInfo.mockResolvedValue(projectWithoutVersion);
      (PathUtils.exists as jest.Mock).mockResolvedValue(true);
      (PathUtils.isProjectManaged as jest.Mock).mockResolvedValue(true);
      mockSymlinkManager.validateSymlinks.mockResolvedValue(true);

      await statusCommand({ project: 'test-project' });

      expect(p.log.message).toHaveBeenCalledWith(
        expect.stringContaining('[BOLD]Template:[/BOLD] react vN/A')
      );
    });

    it('should not show template for unknown project type', async () => {
      const unknownTypeProject = {
        ...mockProjectInfo,
        projectType: 'unknown',
      };
      mockStorageManager.getProjectInfo.mockResolvedValue(unknownTypeProject);
      (PathUtils.exists as jest.Mock).mockResolvedValue(true);
      (PathUtils.isProjectManaged as jest.Mock).mockResolvedValue(true);
      mockSymlinkManager.validateSymlinks.mockResolvedValue(true);

      await statusCommand({ project: 'test-project' });

      expect(p.log.message).toHaveBeenCalledWith(
        expect.not.stringContaining('[BOLD]Template:[/BOLD]')
      );
    });

    it('should handle storage manager errors', async () => {
      mockStorageManager.getProjectInfo.mockRejectedValue(new Error('Storage error'));

      await statusCommand({ project: 'test-project' });

      expect(p.cancel).toHaveBeenCalledWith(
        '[RED]Error checking project status: Storage error[/RED]'
      );
      expect(mockProcess.exit).toHaveBeenCalledWith(1);
    });
  });

  describe('Date formatting', () => {
    beforeEach(() => {
      // Re-setup mocks after clearAllMocks in main beforeEach
      (getService as jest.Mock).mockReturnValue(mockStorageManager);
    });

    it('should format setup date when available', async () => {
      // Create a date that is actually yesterday relative to today
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      
      const projectWithSetupDate = {
        ...mockProjectInfo,
        setupDate: yesterday.toISOString(),
      };
      mockStorageManager.getProjectInfo.mockResolvedValue(projectWithSetupDate);
      (PathUtils.exists as jest.Mock).mockResolvedValue(true);
      (PathUtils.isProjectManaged as jest.Mock).mockResolvedValue(true);
      mockSymlinkManager.validateSymlinks.mockResolvedValue(true);
      mockSymlinkManager.getSymlinkTarget
        .mockResolvedValueOnce('/storage/.claude')
        .mockResolvedValueOnce('/storage/CLAUDE.md');

      await statusCommand({ project: 'test-project' });

      const logCall = (p.log.message as jest.Mock).mock.calls[0][0];
      expect(logCall).toContain('[BOLD]Setup:[/BOLD] yesterday');
    });

    it('should format today date correctly', async () => {
      // Create a date that is actually today
      const today = new Date();
      
      const projectWithTodaySetup = {
        ...mockProjectInfo,
        setupDate: today.toISOString(),
      };
      mockStorageManager.getProjectInfo.mockResolvedValue(projectWithTodaySetup);
      (PathUtils.exists as jest.Mock).mockResolvedValue(true);
      (PathUtils.isProjectManaged as jest.Mock).mockResolvedValue(true);
      mockSymlinkManager.validateSymlinks.mockResolvedValue(true);
      mockSymlinkManager.getSymlinkTarget
        .mockResolvedValueOnce('/storage/.claude')
        .mockResolvedValueOnce('/storage/CLAUDE.md');

      await statusCommand({ project: 'test-project' });

      const logCall = (p.log.message as jest.Mock).mock.calls[0][0];
      expect(logCall).toContain('[BOLD]Setup:[/BOLD] today');
    });

    it('should format multiple days ago correctly', async () => {
      // Create a date that is actually 5 days ago
      const fiveDaysAgo = new Date();
      fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
      
      const projectWithOldSetup = {
        ...mockProjectInfo,
        setupDate: fiveDaysAgo.toISOString(),
      };
      mockStorageManager.getProjectInfo.mockResolvedValue(projectWithOldSetup);
      (PathUtils.exists as jest.Mock).mockResolvedValue(true);
      (PathUtils.isProjectManaged as jest.Mock).mockResolvedValue(true);
      mockSymlinkManager.validateSymlinks.mockResolvedValue(true);
      mockSymlinkManager.getSymlinkTarget
        .mockResolvedValueOnce('/storage/.claude')
        .mockResolvedValueOnce('/storage/CLAUDE.md');

      await statusCommand({ project: 'test-project' });

      const logCall = (p.log.message as jest.Mock).mock.calls[0][0];
      expect(logCall).toContain('[BOLD]Setup:[/BOLD] 5 days ago');
    });

    it('should format old dates with full date', async () => {
      // Create a date that is more than 7 days ago (should show full date)
      const twoWeeksAgo = new Date();
      twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
      
      const projectWithVeryOldSetup = {
        ...mockProjectInfo,
        setupDate: twoWeeksAgo.toISOString(),
      };
      mockStorageManager.getProjectInfo.mockResolvedValue(projectWithVeryOldSetup);
      (PathUtils.exists as jest.Mock).mockResolvedValue(true);
      (PathUtils.isProjectManaged as jest.Mock).mockResolvedValue(true);
      mockSymlinkManager.validateSymlinks.mockResolvedValue(true);
      mockSymlinkManager.getSymlinkTarget
        .mockResolvedValueOnce('/storage/.claude')
        .mockResolvedValueOnce('/storage/CLAUDE.md');

      await statusCommand({ project: 'test-project' });

      const logCall = (p.log.message as jest.Mock).mock.calls[0][0];
      expect(logCall).toContain('[BOLD]Setup:[/BOLD]');
      // Should contain a formatted date, exact format depends on locale
      expect(logCall).toMatch(/\d{1,2}\/\d{1,2}\/\d{4}|\d{4}-\d{2}-\d{2}/);
    });
  });

  describe('Edge cases', () => {
    it('should handle project names with special characters', async () => {
      const specialProjectInfo = {
        projectPath: '/path/to/special-project_name',
        projectType: 'custom',
      };
      mockStorageManager.getProjectInfo.mockResolvedValue(specialProjectInfo);
      (PathUtils.exists as jest.Mock).mockResolvedValue(true);
      (PathUtils.isProjectManaged as jest.Mock).mockResolvedValue(true);
      mockSymlinkManager.validateSymlinks.mockResolvedValue(true);

      await statusCommand({ project: 'special-project_name' });

      expect(p.log.message).toHaveBeenCalledWith(
        expect.stringContaining('[BOLD]Project:[/BOLD] special-project_name')
      );
    });

    it('should handle very long project paths', async () => {
      const longPath = '/very/long/path/to/project/that/has/many/nested/directories/project-name';
      const longPathProjectInfo = {
        projectPath: longPath,
        projectType: 'react',
      };
      mockStorageManager.getProjectInfo.mockResolvedValue(longPathProjectInfo);
      (PathUtils.exists as jest.Mock).mockResolvedValue(true);
      (PathUtils.isProjectManaged as jest.Mock).mockResolvedValue(true);
      mockSymlinkManager.validateSymlinks.mockResolvedValue(true);

      await statusCommand({ project: 'test-project' });

      expect(p.log.message).toHaveBeenCalledWith(
        expect.stringContaining(`[GRAY]${longPath}[/GRAY]`)
      );
    });

    it('should handle projects with missing optional fields', async () => {
      const minimalProjectInfo = {
        projectPath: '/path/to/project',
      };
      mockStorageManager.getProjectInfo.mockResolvedValue(minimalProjectInfo);
      (PathUtils.exists as jest.Mock).mockResolvedValue(true);
      (PathUtils.isProjectManaged as jest.Mock).mockResolvedValue(true);
      mockSymlinkManager.validateSymlinks.mockResolvedValue(true);

      await statusCommand({ project: 'test-project' });

      expect(p.log.message).toHaveBeenCalledWith(
        expect.stringContaining('[BOLD]Project:[/BOLD] test-project')
      );
      expect(p.log.message).toHaveBeenCalledWith(
        expect.not.stringContaining('[BOLD]Template:[/BOLD]')
      );
      expect(p.log.message).toHaveBeenCalledWith(
        expect.not.stringContaining('[BOLD]Setup:[/BOLD]')
      );
    });
  });
});