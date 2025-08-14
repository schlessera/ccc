import * as fs from 'fs-extra';
import * as path from 'path';
import { PathUtils } from '../../utils/paths';
import { Logger } from '../../utils/logger';

export class SymlinkManager {
  async createProjectSymlinks(projectPath: string, projectName: string): Promise<void> {
    const storageDir = PathUtils.getProjectStorageDir(projectName);
    
    // Create .claude directory symlink
    await this.createSymlink(
      storageDir,
      path.join(projectPath, '.claude'),
      'directory'
    );
    
    // Create CLAUDE.md file symlink
    await this.createSymlink(
      path.join(storageDir, 'CLAUDE.md'),
      path.join(projectPath, 'CLAUDE.md'),
      'file'
    );
    
    Logger.success('Created project symlinks');
  }

  async removeProjectSymlinks(projectPath: string): Promise<void> {
    const claudeDir = path.join(projectPath, '.claude');
    const claudeFile = path.join(projectPath, 'CLAUDE.md');
    
    if (await this.isSymlink(claudeDir)) {
      await fs.unlink(claudeDir);
      Logger.success('Removed .claude symlink');
    }
    
    if (await this.isSymlink(claudeFile)) {
      await fs.unlink(claudeFile);
      Logger.success('Removed CLAUDE.md symlink');
    }
  }

  async validateSymlinks(projectPath: string): Promise<boolean> {
    const claudeDir = path.join(projectPath, '.claude');
    const claudeFile = path.join(projectPath, 'CLAUDE.md');
    
    const dirValid = await this.isValidSymlink(claudeDir);
    const fileValid = await this.isValidSymlink(claudeFile);
    
    return dirValid && fileValid;
  }

  async getSymlinkTarget(symlinkPath: string): Promise<string | null> {
    try {
      if (await this.isSymlink(symlinkPath)) {
        return await fs.readlink(symlinkPath);
      }
    } catch (error) {
      Logger.debug(`Failed to read symlink: ${symlinkPath}`);
    }
    
    return null;
  }

  private async createSymlink(target: string, linkPath: string, type: 'file' | 'directory'): Promise<void> {
    // Check if link already exists
    if (await PathUtils.exists(linkPath)) {
      if (await this.isSymlink(linkPath)) {
        const existingTarget = await fs.readlink(linkPath);
        if (existingTarget === target) {
          Logger.debug(`Symlink already exists: ${linkPath}`);
          return;
        }
        // Remove existing symlink if it points elsewhere
        await fs.unlink(linkPath);
      } else {
        // Backup existing file/directory
        const backupPath = `${linkPath}.backup-${Date.now()}`;
        await fs.move(linkPath, backupPath);
        Logger.warn(`Backed up existing ${type} to ${backupPath}`);
      }
    }
    
    // Create parent directory if needed
    const parentDir = path.dirname(linkPath);
    await PathUtils.ensureDir(parentDir);
    
    // Create relative symlink for better portability
    const relativeTarget = path.relative(path.dirname(linkPath), target);
    
    try {
      await fs.symlink(relativeTarget, linkPath, type === 'directory' ? 'dir' : 'file');
      Logger.debug(`Created symlink: ${linkPath} → ${relativeTarget}`);
    } catch (error: any) {
      if (error.code === 'EACCES' || error.code === 'EPERM') {
        throw new Error(`Permission denied: Cannot create symlink at ${linkPath}. Try running with sudo.`);
      }
      throw error;
    }
  }

  private async isSymlink(filePath: string): Promise<boolean> {
    try {
      const stats = await fs.lstat(filePath);
      return stats.isSymbolicLink();
    } catch {
      return false;
    }
  }

  private async isValidSymlink(symlinkPath: string): Promise<boolean> {
    if (!await this.isSymlink(symlinkPath)) {
      return false;
    }
    
    try {
      const target = await fs.readlink(symlinkPath);
      const resolvedTarget = path.resolve(path.dirname(symlinkPath), target);
      return await PathUtils.exists(resolvedTarget);
    } catch {
      return false;
    }
  }
}