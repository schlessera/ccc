import * as fs from 'fs-extra';
import * as path from 'path';
import { PathUtils } from '../../utils/paths';
import { Logger } from '../../utils/logger';
import { ProjectInfo } from '../../types/config';
import { Template } from '../../types/template';

export class StorageManager {
  async createProject(projectName: string, template: Template): Promise<void> {
    const storageDir = PathUtils.getProjectStorageDir(projectName);
    
    Logger.debug(`Creating storage for project: ${projectName}`);
    
    // Ensure storage directory exists
    await PathUtils.ensureDir(storageDir);
    
    // Copy template files
    await this.copyTemplateFiles(template.path, storageDir);
    
    // Create project info
    await this.createProjectInfo(projectName, template);
    
    Logger.success(`Created storage directory for ${projectName}`);
  }

  async createProjectFromExisting(projectName: string, projectPath: string): Promise<void> {
    const storageDir = PathUtils.getProjectStorageDir(projectName);
    
    Logger.debug(`Creating storage from existing project: ${projectName}`);
    
    // Ensure storage directory exists
    await PathUtils.ensureDir(storageDir);
    
    // Check for existing .claude directory and CLAUDE.md
    const existingClaudeDir = path.join(projectPath, '.claude');
    const existingClaudeFile = path.join(projectPath, 'CLAUDE.md');
    
    // Copy existing .claude directory if it exists
    if (await PathUtils.exists(existingClaudeDir)) {
      await fs.copy(existingClaudeDir, storageDir, {
        overwrite: false,
        errorOnExist: false,
      });
    } else {
      // Create minimal default files if no .claude exists
      await this.createMinimalDefaults(storageDir);
    }
    
    // Copy existing CLAUDE.md if it exists
    if (await PathUtils.exists(existingClaudeFile)) {
      await fs.copy(existingClaudeFile, path.join(storageDir, 'CLAUDE.md'));
    } else if (!await PathUtils.exists(path.join(storageDir, 'CLAUDE.md'))) {
      // Create minimal CLAUDE.md if none exists
      await fs.writeFile(
        path.join(storageDir, 'CLAUDE.md'),
        '# Project Guidelines\n\n## Overview\n\nThis project uses its existing configuration.\n\n## Custom Configuration\n\nAdd your project-specific guidelines here.\n'
      );
    }
    
    // Create project info
    await this.createProjectInfoForExisting(projectName, projectPath);
    
    Logger.success(`Created storage directory for ${projectName} with existing configuration`);
  }

  private async createMinimalDefaults(storageDir: string): Promise<void> {
    // Create minimal settings.json
    const settingsPath = path.join(storageDir, 'settings.json');
    if (!await PathUtils.exists(settingsPath)) {
      await fs.writeJSON(settingsPath, {
        permissions: {
          allow: [],
          deny: []
        },
        env: {}
      }, { spaces: 2 });
    }
  }

  private async createProjectInfoForExisting(projectName: string, projectPath: string): Promise<void> {
    const infoPath = path.join(
      PathUtils.getProjectStorageDir(projectName),
      '.project-info'
    );
    
    const info = [
      `PROJECT_NAME=${projectName}`,
      `PROJECT_PATH=${projectPath}`,
      `PROJECT_TYPE=existing`,
      `TEMPLATE_VERSION=none`,
      `SETUP_DATE=${new Date().toISOString()}`,
      `LAST_UPDATE=${new Date().toISOString()}`,
    ].join('\n');
    
    await fs.writeFile(infoPath, info);
  }

  async updateProject(projectName: string, template: Template): Promise<void> {
    const storageDir = PathUtils.getProjectStorageDir(projectName);
    
    // Create backup before updating
    await this.createBackup(projectName);
    
    // Update template files
    await this.updateTemplateFiles(template.path, storageDir);
    
    // Update project info
    await this.updateProjectInfo(projectName, template);
    
    Logger.success(`Updated project ${projectName}`);
  }

  async deleteProject(projectName: string): Promise<void> {
    const storageDir = PathUtils.getProjectStorageDir(projectName);
    
    if (await PathUtils.exists(storageDir)) {
      await fs.remove(storageDir);
      Logger.success(`Removed storage for ${projectName}`);
    }
  }

  // Alias for deleteProject
  async removeProject(projectName: string): Promise<void> {
    return this.deleteProject(projectName);
  }

  async listProjects(): Promise<string[]> {
    const storageDir = PathUtils.getStorageDir();
    
    if (!await PathUtils.exists(storageDir)) {
      return [];
    }
    
    const entries = await fs.readdir(storageDir);
    const projects: string[] = [];
    
    for (const entry of entries) {
      const fullPath = path.join(storageDir, entry);
      const stat = await fs.stat(fullPath);
      
      if (stat.isDirectory()) {
        projects.push(entry);
      }
    }
    
    return projects;
  }

  async getProjectInfo(projectName: string): Promise<ProjectInfo | null> {
    const infoPath = path.join(
      PathUtils.getProjectStorageDir(projectName),
      '.project-info'
    );
    
    if (!await PathUtils.exists(infoPath)) {
      return null;
    }
    
    const content = await fs.readFile(infoPath, 'utf-8');
    const info: ProjectInfo = this.parseProjectInfo(content);
    
    return info;
  }

  private async copyTemplateFiles(templatePath: string, targetPath: string): Promise<void> {
    await fs.copy(templatePath, targetPath, {
      overwrite: false,
      errorOnExist: false,
    });
  }

  private async updateTemplateFiles(templatePath: string, targetPath: string): Promise<void> {
    // Smart update that preserves custom content
    const templateFiles = await this.getTemplateFiles(templatePath);
    
    for (const file of templateFiles) {
      const sourcePath = path.join(templatePath, file);
      const targetFile = path.join(targetPath, file);
      
      if (file === 'CLAUDE.md') {
        await this.mergeClaudeFile(sourcePath, targetFile);
      } else {
        await fs.copy(sourcePath, targetFile, { overwrite: true });
      }
    }
  }

  private async mergeClaudeFile(sourcePath: string, targetPath: string): Promise<void> {
    if (!await PathUtils.exists(targetPath)) {
      await fs.copy(sourcePath, targetPath);
      return;
    }
    
    const sourceContent = await fs.readFile(sourcePath, 'utf-8');
    const targetContent = await fs.readFile(targetPath, 'utf-8');
    
    // Preserve custom sections
    const customSection = this.extractCustomSection(targetContent);
    const mergedContent = customSection 
      ? `${sourceContent}\n\n${customSection}`
      : sourceContent;
    
    await fs.writeFile(targetPath, mergedContent);
  }

  private extractCustomSection(content: string): string | null {
    const customMarkers = [
      '## Project-Specific',
      '# Custom',
      '## Custom Configuration'
    ];
    
    for (const marker of customMarkers) {
      const index = content.indexOf(marker);
      if (index !== -1) {
        return content.substring(index);
      }
    }
    
    return null;
  }

  private async getTemplateFiles(templatePath: string): Promise<string[]> {
    const files: string[] = [];
    
    const walk = async (dir: string, base = ''): Promise<void> => {
      const entries = await fs.readdir(dir);
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry);
        const relativePath = path.join(base, entry);
        const stat = await fs.stat(fullPath);
        
        if (stat.isDirectory()) {
          await walk(fullPath, relativePath);
        } else {
          files.push(relativePath);
        }
      }
    };
    
    await walk(templatePath);
    return files;
  }

  private async createProjectInfo(projectName: string, template: Template): Promise<void> {
    const infoPath = path.join(
      PathUtils.getProjectStorageDir(projectName),
      '.project-info'
    );
    
    const info = [
      `PROJECT_NAME=${projectName}`,
      `PROJECT_PATH=${process.cwd()}`,
      `PROJECT_TYPE=${template.name}`,
      `TEMPLATE_VERSION=${template.meta.version}`,
      `SETUP_DATE=${new Date().toISOString()}`,
      `LAST_UPDATE=${new Date().toISOString()}`,
    ].join('\n');
    
    await fs.writeFile(infoPath, info);
  }

  private async updateProjectInfo(projectName: string, template: Template): Promise<void> {
    const infoPath = path.join(
      PathUtils.getProjectStorageDir(projectName),
      '.project-info'
    );
    
    const existing = await this.getProjectInfo(projectName);
    
    if (existing) {
      existing.templateVersion = template.meta.version;
      existing.lastUpdate = new Date().toISOString();
      
      const info = [
        `PROJECT_NAME=${existing.projectName}`,
        `PROJECT_PATH=${existing.projectPath}`,
        `PROJECT_TYPE=${existing.projectType}`,
        `TEMPLATE_VERSION=${existing.templateVersion}`,
        `SETUP_DATE=${existing.setupDate}`,
        `LAST_UPDATE=${existing.lastUpdate}`,
      ].join('\n');
      
      await fs.writeFile(infoPath, info);
    }
  }

  private parseProjectInfo(content: string): ProjectInfo {
    const lines = content.split('\n');
    const info: any = {};
    
    for (const line of lines) {
      const [key, value] = line.split('=');
      if (key && value) {
        const camelKey = key.toLowerCase().replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
        info[camelKey] = value;
      }
    }
    
    return info as ProjectInfo;
  }

  async createBackup(projectName: string): Promise<string> {
    const storageDir = PathUtils.getProjectStorageDir(projectName);
    const backupsDir = PathUtils.getProjectBackupsDir(projectName);
    const timestamp = new Date().toISOString().replace(/[:.-]/g, '');
    const backupName = `backup-${timestamp}`;
    const backupPath = path.join(backupsDir, backupName);
    
    await PathUtils.ensureDir(backupsDir);
    await fs.copy(storageDir, backupPath, {
      filter: (src) => !src.includes('.backups'),
    });
    
    Logger.success(`Created backup: ${backupName}`);
    return backupPath;
  }
}