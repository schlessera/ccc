import { StorageManager } from '../../../../src/core/storage/manager';
import { TestFixtures } from '../../../fixtures';
import { PathUtils } from '../../../../src/utils/paths';
import * as path from 'path';
import { IFileSystem } from '../../../../src/core/interfaces/filesystem';
import { Stats } from 'fs';

// Mock the Logger to avoid console output during tests
jest.mock('../../../../src/utils/logger', () => ({
  Logger: {
    debug: jest.fn(),
    success: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  }
}));

// Test filesystem implementation
class TestFileSystem implements IFileSystem {
  private files = new Map<string, string>();
  private dirs = new Set<string>();

  constructor() {
    this.dirs.add('/');
  }

  async exists(filePath: string): Promise<boolean> {
    return this.files.has(filePath) || this.dirs.has(filePath);
  }

  async readFile(filePath: string, _encoding: BufferEncoding = 'utf-8'): Promise<string> {
    const content = this.files.get(filePath);
    if (content === undefined) {
      throw new Error(`ENOENT: no such file or directory, open '${filePath}'`);
    }
    return content;
  }

  async writeFile(filePath: string, content: string, _encoding: BufferEncoding = 'utf-8'): Promise<void> {
    const dir = this.dirname(filePath);
    this.dirs.add(dir);
    this.files.set(filePath, content);
  }

  async move(src: string, dest: string): Promise<void> {
    const content = this.files.get(src);
    if (content !== undefined) {
      const destDir = this.dirname(dest);
      this.dirs.add(destDir);
      this.files.set(dest, content);
      this.files.delete(src);
    }
    
    if (this.dirs.has(src)) {
      this.dirs.add(dest);
      this.dirs.delete(src);
    }
  }

  async readJSON<T = any>(filePath: string): Promise<T> {
    const content = await this.readFile(filePath);
    return JSON.parse(content);
  }

  async writeJSON(filePath: string, obj: any, options: { spaces?: number } = {}): Promise<void> {
    const content = JSON.stringify(obj, null, options.spaces || 2);
    await this.writeFile(filePath, content);
  }

  async remove(filePath: string): Promise<void> {
    this.files.delete(filePath);
    this.dirs.delete(filePath);
  }

  async copy(src: string, dest: string, options: any = {}): Promise<void> {
    // Check if source exists
    if (!this.dirs.has(src) && !this.files.has(src)) {
      throw new Error(`ENOENT: no such file or directory, scandir '${src}'`);
    }
    
    // Simple copy implementation for tests
    if (this.dirs.has(src)) {
      // Copy directory
      this.dirs.add(dest);
      // Copy all files from source directory to destination
      for (const filePath of this.files.keys()) {
        if (filePath.startsWith(src + '/')) {
          // Apply filter if provided
          if (options.filter && !options.filter(filePath)) {
            continue;
          }
          const relativePath = filePath.substring(src.length + 1);
          const destFilePath = path.join(dest, relativePath);
          const content = this.files.get(filePath)!;
          this.files.set(destFilePath, content);
          // Ensure parent directories exist
          const destFileDir = this.dirname(destFilePath);
          this.dirs.add(destFileDir);
        }
      }
      // Copy subdirectories
      for (const dirPath of this.dirs) {
        if (dirPath.startsWith(src + '/')) {
          // Apply filter if provided
          if (options.filter && !options.filter(dirPath)) {
            continue;
          }
          const relativePath = dirPath.substring(src.length + 1);
          const destDirPath = path.join(dest, relativePath);
          this.dirs.add(destDirPath);
        }
      }
    } else if (this.files.has(src)) {
      const content = this.files.get(src)!;
      const destDir = this.dirname(dest);
      this.dirs.add(destDir);
      this.files.set(dest, content);
    }
  }

  async mkdir(dirPath: string, options: { recursive?: boolean } = {}): Promise<void> {
    if (options.recursive) {
      const parts = dirPath.split('/').filter(p => p);
      let current = '/';
      for (const part of parts) {
        current = path.join(current, part);
        this.dirs.add(current);
      }
    } else {
      this.dirs.add(dirPath);
    }
  }

  async readdir(dirPath: string): Promise<string[]> {
    if (!this.dirs.has(dirPath)) {
      throw new Error(`ENOENT: no such file or directory, scandir '${dirPath}'`);
    }
    const entries: string[] = [];
    
    // Find all immediate children
    for (const filePath of this.files.keys()) {
      const dir = this.dirname(filePath);
      if (dir === dirPath) {
        entries.push(path.basename(filePath));
      }
    }
    
    for (const dirPath2 of this.dirs) {
      if (this.dirname(dirPath2) === dirPath && dirPath2 !== dirPath) {
        entries.push(path.basename(dirPath2));
      }
    }
    
    return [...new Set(entries)]; // Remove duplicates
  }

  async stat(filePath: string): Promise<Stats> {
    if (!this.exists(filePath)) {
      throw new Error(`ENOENT: no such file or directory, stat '${filePath}'`);
    }
    return {
      isDirectory: () => this.dirs.has(filePath),
      isFile: () => this.files.has(filePath),
    } as Stats;
  }

  dirname(filePath: string): string {
    return path.dirname(filePath);
  }

  join(...paths: string[]): string {
    return path.join(...paths);
  }

  resolve(...paths: string[]): string {
    return path.resolve(...paths);
  }

  basename(filePath: string, ext?: string): string {
    return path.basename(filePath, ext);
  }

  extname(filePath: string): string {
    return path.extname(filePath);
  }

  relative(from: string, to: string): string {
    return path.relative(from, to);
  }

  isAbsolute(filePath: string): boolean {
    return path.isAbsolute(filePath);
  }
}

describe('StorageManager', () => {
  let fileSystem: TestFileSystem;
  let storageManager: StorageManager;
  let homeDir: string;
  let storageDir: string;
  let templatesDir: string;

  beforeEach(async () => {
    homeDir = '/home/test';
    storageDir = path.join(homeDir, '.ccc', 'storage');
    templatesDir = path.join(homeDir, '.ccc', 'templates');
    
    fileSystem = new TestFileSystem();
    storageManager = new StorageManager(fileSystem);
    
    // Create basic directory structure
    await fileSystem.mkdir(homeDir, { recursive: true });
    await fileSystem.mkdir(path.join(homeDir, '.ccc'), { recursive: true });
    await fileSystem.mkdir(storageDir, { recursive: true });
    await fileSystem.mkdir(templatesDir, { recursive: true });
    await fileSystem.mkdir(path.join(homeDir, '.ccc', 'agents'), { recursive: true });
    await fileSystem.mkdir(path.join(homeDir, '.ccc', 'commands'), { recursive: true });
    await fileSystem.mkdir(path.join(homeDir, '.ccc', 'hooks'), { recursive: true });
    
    // Mock PathUtils methods
    jest.spyOn(PathUtils, 'getProjectStorageDir').mockImplementation((projectName: string) => {
      return path.join(storageDir, projectName);
    });
    
    jest.spyOn(PathUtils, 'getStorageDir').mockImplementation(() => {
      return storageDir;
    });
    
    jest.spyOn(PathUtils, 'getProjectBackupsDir').mockImplementation((projectName: string) => {
      return path.join(storageDir, projectName, '.backups');
    });
    
    jest.spyOn(PathUtils, 'ensureDir').mockImplementation(async (dirPath: string) => {
      await fileSystem.mkdir(dirPath, { recursive: true });
    });
    
    jest.spyOn(PathUtils, 'exists').mockImplementation(async (filePath: string) => {
      return fileSystem.exists(filePath);
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // Helper to create a template in the test filesystem
  const createTemplateInMockFs = async (templateName: string) => {
    const templatePath = path.join(templatesDir, templateName);
    await fileSystem.mkdir(templatePath, { recursive: true });
    await fileSystem.writeFile(
      path.join(templatePath, 'CLAUDE.md'),
      '# Test Template\n\nTemplate content.'
    );
    await fileSystem.mkdir(path.join(templatePath, '.claude'), { recursive: true });
    await fileSystem.writeJSON(
      path.join(templatePath, '.claude', 'settings.json'),
      {
        permissions: { allow: ['read', 'write'], deny: [] },
        env: { NODE_ENV: 'development' }
      }
    );
    return templatePath;
  };

  describe('createProject', () => {
    it('should create a new project with template files', async () => {
      const projectName = 'test-project';
      const templateName = 'typescript';
      const templatePath = await createTemplateInMockFs(templateName);
      
      const template = TestFixtures.createTemplate({
        name: templateName,
        path: templatePath
      });
      
      await storageManager.createProject(projectName, template);

      // Verify project storage directory was created
      const projectStorageDir = PathUtils.getProjectStorageDir(projectName);
      expect(await fileSystem.exists(projectStorageDir)).toBe(true);

      // Verify template files were copied
      expect(await fileSystem.exists(path.join(projectStorageDir, 'CLAUDE.md'))).toBe(true);
      expect(await fileSystem.exists(path.join(projectStorageDir, '.claude', 'settings.json'))).toBe(true);

      // Verify project info was created
      const projectInfoPath = path.join(projectStorageDir, '.project-info');
      expect(await fileSystem.exists(projectInfoPath)).toBe(true);
      
      const projectInfo = await fileSystem.readFile(projectInfoPath);
      expect(projectInfo).toContain('PROJECT_NAME=test-project');
      expect(projectInfo).toContain('PROJECT_TYPE=typescript');
      expect(projectInfo).toContain('TEMPLATE_VERSION=1.0.0');
    });

    it('should handle missing template gracefully', async () => {
      const projectName = 'test-project';
      const template = TestFixtures.createTemplate({
        path: '/non-existent-template'
      });

      await expect(storageManager.createProject(projectName, template))
        .rejects.toThrow(); // Should throw ENOENT error
    });
  });

  describe('createProjectFromExisting', () => {
    it('should create project from existing .claude directory', async () => {
      const projectName = 'existing-project';
      const projectPath = path.join(homeDir, 'existing', 'project');

      // Setup existing project with .claude directory
      await fileSystem.mkdir(path.join(homeDir, 'existing'), { recursive: true });
      await fileSystem.mkdir(projectPath, { recursive: true });
      await fileSystem.writeFile(
        path.join(projectPath, 'CLAUDE.md'),
        '# Existing Project\n\nExisting content.'
      );
      await fileSystem.mkdir(path.join(projectPath, '.claude'), { recursive: true });
      await fileSystem.writeJSON(
        path.join(projectPath, '.claude', 'settings.json'),
        {
          permissions: { allow: [], deny: [] },
          env: {}
        }
      );

      await storageManager.createProjectFromExisting(projectName, projectPath);

      const projectStorageDir = PathUtils.getProjectStorageDir(projectName);
      
      // Verify files were copied (settings.json is copied from .claude to storage root)
      expect(await fileSystem.exists(path.join(projectStorageDir, 'settings.json'))).toBe(true);
      expect(await fileSystem.exists(path.join(projectStorageDir, 'CLAUDE.md'))).toBe(true);

      // Verify project info
      const projectInfoPath = path.join(projectStorageDir, '.project-info');
      const projectInfo = await fileSystem.readFile(projectInfoPath);
      expect(projectInfo).toContain('PROJECT_NAME=existing-project');
      expect(projectInfo).toContain('PROJECT_TYPE=existing');
      expect(projectInfo).toContain(`PROJECT_PATH=${projectPath}`);
    });

    it('should create minimal defaults when no .claude directory exists', async () => {
      const projectName = 'minimal-project';
      const projectPath = path.join(homeDir, 'minimal', 'project');

      // Setup project directory without .claude
      await fileSystem.mkdir(path.join(homeDir, 'minimal'), { recursive: true });
      await fileSystem.mkdir(projectPath, { recursive: true });
      
      await storageManager.createProjectFromExisting(projectName, projectPath);

      const projectStorageDir = PathUtils.getProjectStorageDir(projectName);
      
      // Verify minimal files were created
      expect(await fileSystem.exists(path.join(projectStorageDir, 'settings.json'))).toBe(true);
      expect(await fileSystem.exists(path.join(projectStorageDir, 'CLAUDE.md'))).toBe(true);

      // Verify settings.json content
      const settingsContent = await fileSystem.readJSON(path.join(projectStorageDir, 'settings.json'));
      expect(settingsContent).toEqual({
        permissions: { allow: [], deny: [] },
        env: {}
      });
    });
  });

  describe('deleteProject', () => {
    it('should remove project storage directory', async () => {
      const projectName = 'delete-project';
      const templateName = 'test-template';
      const templatePath = await createTemplateInMockFs(templateName);
      const template = TestFixtures.createTemplate({ name: templateName, path: templatePath });

      // Create project first
      await storageManager.createProject(projectName, template);
      
      const projectStorageDir = PathUtils.getProjectStorageDir(projectName);
      expect(await fileSystem.exists(projectStorageDir)).toBe(true);

      // Delete project
      await storageManager.deleteProject(projectName);

      // Verify it was removed
      expect(await fileSystem.exists(projectStorageDir)).toBe(false);
    });

    it('should handle non-existent project gracefully', async () => {
      const projectName = 'non-existent-project';

      // Should not throw when trying to delete non-existent project
      await expect(storageManager.deleteProject(projectName)).resolves.toBeUndefined();
    });
  });

  describe('listProjects', () => {
    it('should return list of project names', async () => {
      const templateName = 'test-template';
      const templatePath = await createTemplateInMockFs(templateName);
      const template = TestFixtures.createTemplate({ name: templateName, path: templatePath });

      // Create multiple projects
      await storageManager.createProject('project-1', template);
      await storageManager.createProject('project-2', template);
      await storageManager.createProject('project-3', template);

      const projects = await storageManager.listProjects();

      expect(projects).toHaveLength(3);
      expect(projects).toContain('project-1');
      expect(projects).toContain('project-2');
      expect(projects).toContain('project-3');
    });

    it('should return empty array when no projects exist', async () => {
      const projects = await storageManager.listProjects();
      expect(projects).toEqual([]);
    });

    it('should ignore files in storage directory', async () => {
      const templateName = 'test-template';
      const templatePath = await createTemplateInMockFs(templateName);
      const template = TestFixtures.createTemplate({ name: templateName, path: templatePath });

      // Create a project and a random file
      await storageManager.createProject('valid-project', template);
      await fileSystem.writeFile(path.join(storageDir, 'random-file.txt'), 'content');

      const projects = await storageManager.listProjects();

      expect(projects).toHaveLength(1);
      expect(projects).toContain('valid-project');
    });
  });

  describe('getProjectInfo', () => {
    it('should return project info when it exists', async () => {
      const projectName = 'info-project';
      const templateName = 'test-template';
      const templatePath = await createTemplateInMockFs(templateName);
      const template = TestFixtures.createTemplate({
        name: templateName,
        path: templatePath,
        meta: { ...TestFixtures.createTemplate().meta, version: '1.5.0' }
      });

      await storageManager.createProject(projectName, template);

      const projectInfo = await storageManager.getProjectInfo(projectName);

      expect(projectInfo).not.toBeNull();
      expect(projectInfo?.projectName).toBe('info-project');
      expect(projectInfo?.projectType).toBe(templateName);
      expect(projectInfo?.templateVersion).toBe('1.5.0');
      expect(projectInfo?.setupDate).toBeDefined();
      expect(projectInfo?.lastUpdate).toBeDefined();
    });

    it('should return null when project info does not exist', async () => {
      const projectInfo = await storageManager.getProjectInfo('non-existent-project');
      expect(projectInfo).toBeNull();
    });
  });

  describe('createBackup', () => {
    it('should create backup of project storage', async () => {
      const projectName = 'backup-project';
      const templateName = 'test-template';
      const templatePath = await createTemplateInMockFs(templateName);
      const template = TestFixtures.createTemplate({ name: templateName, path: templatePath });

      // Create project
      await storageManager.createProject(projectName, template);

      const backupPath = await storageManager.createBackup(projectName);

      // Verify backup was created
      expect(await fileSystem.exists(backupPath)).toBe(true);
      
      // Verify backup contains project files
      expect(await fileSystem.exists(path.join(backupPath, 'CLAUDE.md'))).toBe(true);
      expect(await fileSystem.exists(path.join(backupPath, '.project-info'))).toBe(true);
    });

    it('should generate unique backup names', async () => {
      const projectName = 'unique-backup-project';
      const templateName = 'test-template';
      const templatePath = await createTemplateInMockFs(templateName);
      const template = TestFixtures.createTemplate({ name: templateName, path: templatePath });

      await storageManager.createProject(projectName, template);

      // Mock Date to return different timestamps
      let callCount = 0;
      const originalDate = Date;
      const mockDate = jest.fn().mockImplementation(() => {
        callCount++;
        const baseTime = 1234567890000; // Fixed timestamp
        return new originalDate(baseTime + callCount * 1000); // Add seconds to ensure uniqueness
      });
      mockDate.prototype = originalDate.prototype;
      global.Date = mockDate as any;

      try {
        // Create multiple backups
        const backup1 = await storageManager.createBackup(projectName);
        const backup2 = await storageManager.createBackup(projectName);

        // Verify both backups exist and have different names
        expect(await fileSystem.exists(backup1)).toBe(true);
        expect(await fileSystem.exists(backup2)).toBe(true);
        expect(backup1).not.toBe(backup2);
      } finally {
        global.Date = originalDate;
      }
    });
  });

  describe('updateProject', () => {
    it('should update project with new template', async () => {
      const projectName = 'update-project';
      
      // Create old template
      const oldTemplatePath = await createTemplateInMockFs('old-template');
      const oldTemplate = TestFixtures.createTemplate({ 
        name: 'old-template',
        path: oldTemplatePath 
      });

      // Create initial project
      await storageManager.createProject(projectName, oldTemplate);

      // Mock createBackup method since it's called during update
      jest.spyOn(storageManager, 'createBackup').mockResolvedValue('/backup/path');

      // Create new template
      const newTemplatePath = await createTemplateInMockFs('new-template');
      const newTemplate = TestFixtures.createTemplate({ 
        name: 'new-template',
        path: newTemplatePath,
        meta: { ...TestFixtures.createTemplate().meta, version: '2.0.0' }
      });

      await storageManager.updateProject(projectName, newTemplate);

      // Verify backup was created
      expect(storageManager.createBackup).toHaveBeenCalledWith(projectName);

      // Verify project info was updated
      const projectInfo = await storageManager.getProjectInfo(projectName);
      expect(projectInfo?.templateVersion).toBe('2.0.0');
    });
  });

  describe('error handling', () => {
    it('should handle filesystem errors gracefully', async () => {
      // Create a filesystem that throws errors
      const errorFs = new TestFileSystem();
      
      // Create the template in the error filesystem first
      const templateName = 'error-template';
      const templatePath = path.join(templatesDir, templateName);
      await errorFs.mkdir(templatePath, { recursive: true });
      await errorFs.writeFile(path.join(templatePath, 'CLAUDE.md'), 'template content');
      
      // Mock writeFile to throw an error after the template exists
      jest.spyOn(errorFs, 'writeFile').mockRejectedValue(new Error('Disk full'));
      
      const errorStorageManager = new StorageManager(errorFs);
      const template = TestFixtures.createTemplate({ 
        name: templateName,
        path: templatePath 
      });

      await expect(errorStorageManager.createProject('error-project', template))
        .rejects.toThrow('Disk full');
    });
  });

  describe('file operations', () => {
    it('should preserve existing CLAUDE.md custom sections during merge', async () => {
      const projectName = 'merge-project';
      const projectPath = path.join(homeDir, 'merge', 'project');

      // Setup existing CLAUDE.md with custom section
      const existingClaude = `# Original Project

## Overview
Original content.

## Custom Configuration
This is my custom configuration.
Custom settings here.`;

      await fileSystem.mkdir(path.join(homeDir, 'merge'), { recursive: true });
      await fileSystem.mkdir(projectPath, { recursive: true });
      await fileSystem.writeFile(path.join(projectPath, 'CLAUDE.md'), existingClaude);

      // Create project from existing
      await storageManager.createProjectFromExisting(projectName, projectPath);

      // Verify the custom section was preserved
      const projectStorageDir = PathUtils.getProjectStorageDir(projectName);
      const claudeContent = await fileSystem.readFile(path.join(projectStorageDir, 'CLAUDE.md'));
      
      expect(claudeContent).toContain('## Custom Configuration');
      expect(claudeContent).toContain('This is my custom configuration');
    });
  });
});