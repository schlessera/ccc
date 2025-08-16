import { cleanupCommand } from '../../../../src/cli/commands/cleanup';

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
  };
  return {
    __esModule: true,
    default: mockChalk
  };
});

jest.mock('fs-extra', () => ({
  readdir: jest.fn(),
  stat: jest.fn(),
  remove: jest.fn(),
}));

jest.mock('path', () => ({
  join: jest.fn((...args) => args.join('/')),
}));

jest.mock('../../../../src/utils/paths', () => ({
  PathUtils: {
    exists: jest.fn(),
    getProjectBackupsDir: jest.fn(),
  }
}));

jest.mock('../../../../src/core/container', () => ({
  getService: jest.fn(),
  ServiceKeys: {
    StorageManager: 'StorageManager',
  }
}));

import * as p from '@clack/prompts';
import * as fs from 'fs-extra';
import { PathUtils } from '../../../../src/utils/paths';
import { getService } from '../../../../src/core/container';

describe('cleanupCommand', () => {
  let mockProcess: any;
  let mockStorageManager: any;

  beforeEach(() => {
    // Mock process.exit
    mockProcess = {
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

    // Reset all mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Basic functionality', () => {
    it('should parse days threshold from options', async () => {
      mockStorageManager.listProjects.mockResolvedValue([]);

      await cleanupCommand({ days: '15' });

      expect(mockStorageManager.listProjects).toHaveBeenCalled();
      expect(p.note).toHaveBeenCalledWith('No projects to clean up', '📋 Empty Project List');
    });

    it('should use default 30 days when not specified', async () => {
      mockStorageManager.listProjects.mockResolvedValue([]);

      await cleanupCommand({});

      expect(mockStorageManager.listProjects).toHaveBeenCalled();
    });

    it('should handle project-specific cleanup', async () => {
      const mockProjectInfo = { projectName: 'test-project' };
      mockStorageManager.getProjectInfo.mockResolvedValue(mockProjectInfo);
      (PathUtils.getProjectBackupsDir as jest.Mock).mockReturnValue('/backups/test-project');
      (PathUtils.exists as jest.Mock).mockResolvedValue(false);

      await cleanupCommand({ project: 'test-project' });

      expect(mockStorageManager.getProjectInfo).toHaveBeenCalledWith('test-project');
      expect(p.note).toHaveBeenCalledWith('No backups found for test-project', '🧹 Nothing to Clean');
    });

    it('should handle non-existent project', async () => {
      mockStorageManager.getProjectInfo.mockResolvedValue(null);

      await cleanupCommand({ project: 'nonexistent' });

      expect(p.cancel).toHaveBeenCalledWith('Project not found: nonexistent');
      expect(mockProcess.exit).toHaveBeenCalledWith(1);
    });
  });

  describe('All projects cleanup', () => {
    it('should handle empty project list', async () => {
      mockStorageManager.listProjects.mockResolvedValue([]);

      await cleanupCommand({});

      expect(p.note).toHaveBeenCalledWith('No projects to clean up', '📋 Empty Project List');
    });

    it('should process multiple projects', async () => {
      mockStorageManager.listProjects.mockResolvedValue(['project1', 'project2']);
      (PathUtils.getProjectBackupsDir as jest.Mock).mockImplementation((project) => `/backups/${project}`);
      (PathUtils.exists as jest.Mock).mockResolvedValue(false);

      await cleanupCommand({});

      expect(PathUtils.getProjectBackupsDir).toHaveBeenCalledWith('project1');
      expect(PathUtils.getProjectBackupsDir).toHaveBeenCalledWith('project2');
    });

    it('should show no cleanup needed when no old backups found', async () => {
      const recentDate = new Date();
      const recentDateStr = `${recentDate.getFullYear()}-${String(recentDate.getMonth() + 1).padStart(2, '0')}-${String(recentDate.getDate()).padStart(2, '0')}-${String(recentDate.getHours()).padStart(2, '0')}-${String(recentDate.getMinutes()).padStart(2, '0')}-${String(recentDate.getSeconds()).padStart(2, '0')}`;
      
      mockStorageManager.listProjects.mockResolvedValue(['project1']);
      (PathUtils.getProjectBackupsDir as jest.Mock).mockReturnValue('/backups/project1');
      (PathUtils.exists as jest.Mock).mockResolvedValue(true);
      (fs.readdir as unknown as jest.Mock).mockResolvedValue([`backup-${recentDateStr}.tar.gz`]);
      (fs.stat as unknown as jest.Mock).mockResolvedValue({
        size: 1024,
        mtime: recentDate
      });

      await cleanupCommand({ days: '30' });

      expect(p.note).toHaveBeenCalledWith('No backups need cleanup', '[GREEN]🧹 All Clean[/GREEN]');
    });
  });

  describe('Backup discovery and analysis', () => {
    it('should parse backup timestamps correctly', async () => {
      mockStorageManager.listProjects.mockResolvedValue(['project1']);
      (PathUtils.getProjectBackupsDir as jest.Mock).mockReturnValue('/backups/project1');
      (PathUtils.exists as jest.Mock).mockResolvedValue(true);
      (fs.readdir as unknown as jest.Mock).mockResolvedValue([
        'backup-2023-01-01-12-00-00.tar.gz',
        'backup-2023-12-01-15-30-45.tar.gz',
        'other-file.txt' // Should be ignored
      ]);
      
      // Mock old backup (should be deleted)
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 45);
      
      // Mock recent backup (should be kept)
      const recentDate = new Date();
      recentDate.setDate(recentDate.getDate() - 5);
      
      (fs.stat as unknown as jest.Mock)
        .mockResolvedValueOnce({ size: 2048, mtime: oldDate })
        .mockResolvedValueOnce({ size: 1024, mtime: recentDate });

      (p.confirm as jest.Mock).mockResolvedValue(true);

      await cleanupCommand({ days: '30' });

      expect(fs.readdir).toHaveBeenCalledWith('/backups/project1');
      expect(fs.stat).toHaveBeenCalledTimes(2); // Should ignore 'other-file.txt'
    });

    it('should calculate backup ages correctly', async () => {
      mockStorageManager.listProjects.mockResolvedValue(['project1']);
      (PathUtils.getProjectBackupsDir as jest.Mock).mockReturnValue('/backups/project1');
      (PathUtils.exists as jest.Mock).mockResolvedValue(true);
      (fs.readdir as unknown as jest.Mock).mockResolvedValue(['backup-2023-01-01-12-00-00.tar.gz']);
      
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 60); // 60 days old
      
      (fs.stat as unknown as jest.Mock).mockResolvedValue({ size: 1024, mtime: oldDate });
      (p.confirm as jest.Mock).mockResolvedValue(true);

      await cleanupCommand({ days: '30' });

      // Should identify this as old and offer to delete
      expect(p.note).toHaveBeenCalledWith(
        expect.stringContaining('To delete: 1'),
        '🧹 Cleanup Summary'
      );
    });

    it('should format file sizes correctly', async () => {
      mockStorageManager.listProjects.mockResolvedValue(['project1']);
      (PathUtils.getProjectBackupsDir as jest.Mock).mockReturnValue('/backups/project1');
      (PathUtils.exists as jest.Mock).mockResolvedValue(true);
      (fs.readdir as unknown as jest.Mock).mockResolvedValue(['backup-2023-01-01-12-00-00.tar.gz']);
      
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 60);
      
      (fs.stat as unknown as jest.Mock).mockResolvedValue({ 
        size: 1024 * 1024 * 5, // 5MB
        mtime: oldDate 
      });
      (p.confirm as jest.Mock).mockResolvedValue(true);

      await cleanupCommand({ days: '30' });

      expect(p.note).toHaveBeenCalledWith(
        expect.stringContaining('Space to free: 5.0 MB'),
        '🧹 Cleanup Summary'
      );
    });
  });

  describe('Dry run functionality', () => {
    it('should show preview without deleting in dry run mode', async () => {
      mockStorageManager.listProjects.mockResolvedValue(['project1']);
      (PathUtils.getProjectBackupsDir as jest.Mock).mockReturnValue('/backups/project1');
      (PathUtils.exists as jest.Mock).mockResolvedValue(true);
      (fs.readdir as unknown as jest.Mock).mockResolvedValue(['backup-2023-01-01-12-00-00.tar.gz']);
      
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 60);
      
      (fs.stat as unknown as jest.Mock).mockResolvedValue({ size: 1024, mtime: oldDate });

      await cleanupCommand({ days: '30', dryRun: true });

      expect(p.note).toHaveBeenCalledWith(
        expect.stringContaining('Projects: 1'),
        '🔍 Cleanup Preview (Dry Run)'
      );
      expect(p.note).toHaveBeenCalledWith(
        'Run without --dry-run to perform cleanup',
        '💡 Tip'
      );
      expect(fs.remove).not.toHaveBeenCalled();
    });

    it('should show detailed project breakdown in dry run', async () => {
      mockStorageManager.listProjects.mockResolvedValue(['project1']);
      (PathUtils.getProjectBackupsDir as jest.Mock).mockReturnValue('/backups/project1');
      (PathUtils.exists as jest.Mock).mockResolvedValue(true);
      (fs.readdir as unknown as jest.Mock).mockResolvedValue([
        'backup-2023-01-01-12-00-00.tar.gz',
        'backup-2023-01-02-15-30-00.tar.gz'
      ]);
      
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 60);
      
      (fs.stat as unknown as jest.Mock)
        .mockResolvedValue({ size: 1024, mtime: oldDate })
        .mockResolvedValue({ size: 2048, mtime: oldDate });

      await cleanupCommand({ days: '30', dryRun: true });

      expect(p.note).toHaveBeenCalledWith(
        expect.stringContaining('backup-2023-01-01-12-00-00.tar.gz'),
        'project1 - 2 backups'
      );
    });
  });

  describe('User confirmation and execution', () => {
    it('should ask for confirmation before deleting', async () => {
      mockStorageManager.listProjects.mockResolvedValue(['project1']);
      (PathUtils.getProjectBackupsDir as jest.Mock).mockReturnValue('/backups/project1');
      (PathUtils.exists as jest.Mock).mockResolvedValue(true);
      (fs.readdir as unknown as jest.Mock).mockResolvedValue(['backup-2023-01-01-12-00-00.tar.gz']);
      
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 60);
      
      (fs.stat as unknown as jest.Mock).mockResolvedValue({ size: 1024, mtime: oldDate });
      (p.confirm as jest.Mock).mockResolvedValue(true);

      await cleanupCommand({ days: '30' });

      expect(p.confirm).toHaveBeenCalledWith({
        message: 'Delete 1 old backups?',
        initialValue: true
      });
    });

    it('should cancel cleanup when user declines', async () => {
      mockStorageManager.listProjects.mockResolvedValue(['project1']);
      (PathUtils.getProjectBackupsDir as jest.Mock).mockReturnValue('/backups/project1');
      (PathUtils.exists as jest.Mock).mockResolvedValue(true);
      (fs.readdir as unknown as jest.Mock).mockResolvedValue(['backup-2023-01-01-12-00-00.tar.gz']);
      
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 60);
      
      (fs.stat as unknown as jest.Mock).mockResolvedValue({ size: 1024, mtime: oldDate });
      (p.confirm as jest.Mock).mockResolvedValue(false);

      await cleanupCommand({ days: '30' });

      expect(p.outro).toHaveBeenCalledWith('Cleanup cancelled');
      expect(fs.remove).not.toHaveBeenCalled();
    });

    it('should handle cancelled confirmation', async () => {
      mockStorageManager.listProjects.mockResolvedValue(['project1']);
      (PathUtils.getProjectBackupsDir as jest.Mock).mockReturnValue('/backups/project1');
      (PathUtils.exists as jest.Mock).mockResolvedValue(true);
      (fs.readdir as unknown as jest.Mock).mockResolvedValue(['backup-2023-01-01-12-00-00.tar.gz']);
      
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 60);
      
      (fs.stat as unknown as jest.Mock).mockResolvedValue({ size: 1024, mtime: oldDate });
      (p.confirm as jest.Mock).mockResolvedValue(Symbol('cancel'));
      (p.isCancel as unknown as jest.Mock).mockReturnValue(true);

      await cleanupCommand({ days: '30' });

      expect(p.outro).toHaveBeenCalledWith('Cleanup cancelled');
    });

    it('should perform actual deletion when confirmed', async () => {
      mockStorageManager.listProjects.mockResolvedValue(['project1']);
      (PathUtils.getProjectBackupsDir as jest.Mock).mockReturnValue('/backups/project1');
      (PathUtils.exists as jest.Mock).mockResolvedValue(true);
      (fs.readdir as unknown as jest.Mock).mockResolvedValue(['backup-2023-01-01-12-00-00.tar.gz']);
      
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 60);
      
      (fs.stat as unknown as jest.Mock).mockResolvedValue({ size: 1024, mtime: oldDate });
      (p.confirm as jest.Mock).mockResolvedValue(true);
      (p.isCancel as unknown as jest.Mock).mockReturnValue(false);
      (fs.remove as unknown as jest.Mock).mockResolvedValue(undefined);

      await cleanupCommand({ days: '30' });

      expect(fs.remove).toHaveBeenCalledWith('/backups/project1/backup-2023-01-01-12-00-00.tar.gz');
      expect(p.note).toHaveBeenCalledWith(
        expect.stringContaining('Deleted: 1 backups'),
        '[GREEN]🎉 Cleanup Complete[/GREEN]'
      );
    });

    it('should continue with other backups if one deletion fails', async () => {
      mockStorageManager.listProjects.mockResolvedValue(['project1']);
      (PathUtils.getProjectBackupsDir as jest.Mock).mockReturnValue('/backups/project1');
      (PathUtils.exists as jest.Mock).mockResolvedValue(true);
      (fs.readdir as unknown as jest.Mock).mockResolvedValue([
        'backup-2023-01-01-12-00-00.tar.gz',
        'backup-2023-01-02-15-00-00.tar.gz'
      ]);
      
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 60);
      
      (fs.stat as unknown as jest.Mock)
        .mockResolvedValue({ size: 1024, mtime: oldDate })
        .mockResolvedValue({ size: 2048, mtime: oldDate });
      
      (p.confirm as jest.Mock).mockResolvedValue(true);
      (p.isCancel as unknown as jest.Mock).mockReturnValue(false);
      (fs.remove as unknown as jest.Mock)
        .mockRejectedValueOnce(new Error('Permission denied'))
        .mockResolvedValueOnce(undefined);

      await cleanupCommand({ days: '30' });

      expect(fs.remove).toHaveBeenCalledTimes(2);
      expect(p.note).toHaveBeenCalledWith(
        expect.stringContaining('Deleted: 1 backups'), // One failed, one succeeded
        '[GREEN]🎉 Cleanup Complete[/GREEN]'
      );
    });
  });

  describe('Keep count functionality', () => {
    it('should respect keep count option', async () => {
      mockStorageManager.listProjects.mockResolvedValue(['project1']);
      (PathUtils.getProjectBackupsDir as jest.Mock).mockReturnValue('/backups/project1');
      (PathUtils.exists as jest.Mock).mockResolvedValue(true);
      
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 60);
      
      (fs.readdir as unknown as jest.Mock).mockResolvedValue([
        'backup-2023-12-01-12-00-00.tar.gz', // Most recent
        'backup-2023-11-01-12-00-00.tar.gz', // Second most recent
        'backup-2023-01-01-12-00-00.tar.gz'  // Oldest
      ]);
      
      (fs.stat as unknown as jest.Mock)
        .mockResolvedValue({ size: 1024, mtime: new Date() }) // Recent
        .mockResolvedValue({ size: 1024, mtime: oldDate })    // Old but kept
        .mockResolvedValue({ size: 1024, mtime: oldDate });   // Old and deleted
      
      (p.confirm as jest.Mock).mockResolvedValue(true);

      await cleanupCommand({ days: '30', keep: '2' });

      // Should keep 2 most recent, delete only the oldest
      expect(p.note).toHaveBeenCalledWith(
        expect.stringContaining('To delete: 1'),
        '🧹 Cleanup Summary'
      );
    });
  });

  describe('Specific project cleanup', () => {
    it('should handle project-specific cleanup with dry run', async () => {
      const mockProjectInfo = { projectName: 'test-project' };
      mockStorageManager.getProjectInfo.mockResolvedValue(mockProjectInfo);
      (PathUtils.getProjectBackupsDir as jest.Mock).mockReturnValue('/backups/test-project');
      (PathUtils.exists as jest.Mock).mockResolvedValue(true);
      (fs.readdir as unknown as jest.Mock).mockResolvedValue(['backup-2023-01-01-12-00-00.tar.gz']);
      
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 60);
      
      (fs.stat as unknown as jest.Mock).mockResolvedValue({ size: 1024, mtime: oldDate });

      await cleanupCommand({ project: 'test-project', days: '30', dryRun: true });

      expect(p.note).toHaveBeenCalledWith(
        expect.stringContaining('Project: test-project'),
        '🔍 Cleanup Preview (Dry Run)'
      );
    });

    it('should handle project with no old backups', async () => {
      const recentDate = new Date();
      recentDate.setDate(recentDate.getDate() - 5);
      const recentDateStr = `${recentDate.getFullYear()}-${String(recentDate.getMonth() + 1).padStart(2, '0')}-${String(recentDate.getDate()).padStart(2, '0')}-${String(recentDate.getHours()).padStart(2, '0')}-${String(recentDate.getMinutes()).padStart(2, '0')}-${String(recentDate.getSeconds()).padStart(2, '0')}`;
      
      const mockProjectInfo = { projectName: 'test-project' };
      mockStorageManager.getProjectInfo.mockResolvedValue(mockProjectInfo);
      (PathUtils.getProjectBackupsDir as jest.Mock).mockReturnValue('/backups/test-project');
      (PathUtils.exists as jest.Mock).mockResolvedValue(true);
      (fs.readdir as unknown as jest.Mock).mockResolvedValue([`backup-${recentDateStr}.tar.gz`]);
      
      (fs.stat as unknown as jest.Mock).mockResolvedValue({ size: 1024, mtime: recentDate });

      await cleanupCommand({ project: 'test-project', days: '30' });

      expect(p.note).toHaveBeenCalledWith(
        'All 1 backups are recent enough to keep',
        '[GREEN]✅ No Cleanup Needed[/GREEN]'
      );
    });
  });

  describe('Error handling', () => {
    it('should handle errors gracefully', async () => {
      mockStorageManager.listProjects.mockRejectedValue(new Error('Storage error'));

      await cleanupCommand({});

      expect(p.cancel).toHaveBeenCalledWith('[RED]Storage error[/RED]');
      expect(mockProcess.exit).toHaveBeenCalledWith(1);
    });

    it('should handle file system errors during backup discovery', async () => {
      mockStorageManager.listProjects.mockResolvedValue(['project1']);
      (PathUtils.getProjectBackupsDir as jest.Mock).mockReturnValue('/backups/project1');
      (PathUtils.exists as jest.Mock).mockResolvedValue(true);
      (fs.readdir as unknown as jest.Mock).mockRejectedValue(new Error('Permission denied'));

      await cleanupCommand({});

      expect(p.cancel).toHaveBeenCalledWith('[RED]Permission denied[/RED]');
    });
  });

  describe('Size formatting', () => {
    it('should format different file sizes correctly', async () => {
      const testCases = [
        { bytes: 512, expected: '512 B' },
        { bytes: 1536, expected: '2 KB' },
        { bytes: 1024 * 1024 * 2.5, expected: '2.5 MB' },
        { bytes: 1024 * 1024 * 1024 * 1.25, expected: '1.25 GB' }
      ];

      for (const testCase of testCases) {
        mockStorageManager.listProjects.mockResolvedValue(['project1']);
        (PathUtils.getProjectBackupsDir as jest.Mock).mockReturnValue('/backups/project1');
        (PathUtils.exists as jest.Mock).mockResolvedValue(true);
        (fs.readdir as unknown as jest.Mock).mockResolvedValue(['backup-2023-01-01-12-00-00.tar.gz']);
        
        const oldDate = new Date();
        oldDate.setDate(oldDate.getDate() - 60);
        
        (fs.stat as unknown as jest.Mock).mockResolvedValue({ size: testCase.bytes, mtime: oldDate });
        (p.confirm as jest.Mock).mockResolvedValue(true);

        jest.clearAllMocks();
        
        await cleanupCommand({ days: '30', dryRun: true });

        expect(p.note).toHaveBeenCalledWith(
          expect.stringContaining(`Space to free: ${testCase.expected}`),
          expect.stringContaining('Cleanup Preview')
        );
      }
    });
  });
});