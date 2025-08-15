import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs-extra';
import { UserConfigManager } from '../core/config/user-manager';

export class PathUtils {
  private static getUserConfig(): UserConfigManager {
    return UserConfigManager.getInstance();
  }

  static getStorageDir(): string {
    return path.join(this.getUserConfig().getConfigDir(), 'storage');
  }

  static getTemplatesDir(): string {
    return this.getUserConfig().getUserTemplatesDir();
  }

  static getCommandsDir(): string {
    return this.getUserConfig().getUserCommandsDir();
  }

  static getAgentsDir(): string {
    return this.getUserConfig().getUserAgentsDir();
  }

  static getHooksDir(): string {
    return this.getUserConfig().getUserHooksDir();
  }

  static getProjectStorageDir(projectName: string): string {
    return path.join(this.getStorageDir(), projectName);
  }

  static getProjectBackupsDir(projectName: string): string {
    return path.join(this.getProjectStorageDir(projectName), '.backups');
  }

  static getGlobalCommandsDir(): string {
    return path.join(os.homedir(), '.claude', 'commands');
  }

  static async ensureDir(dirPath: string): Promise<void> {
    await fs.ensureDir(dirPath);
  }

  static async exists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  static resolveProjectPath(projectPath?: string): string {
    return path.resolve(projectPath || process.cwd());
  }

  static getRelativePath(from: string, to: string): string {
    return path.relative(from, to);
  }

  /**
   * Check if current directory is CCC-managed by looking for symlinked .claude and CLAUDE.md
   */
  static async isProjectManaged(projectPath?: string): Promise<boolean> {
    const resolvedPath = this.resolveProjectPath(projectPath);
    const claudeDir = path.join(resolvedPath, '.claude');
    const claudeFile = path.join(resolvedPath, 'CLAUDE.md');
    
    try {
      // Check if both .claude and CLAUDE.md exist as symlinks
      const [claudeDirStats, claudeFileStats] = await Promise.all([
        fs.lstat(claudeDir).catch(() => null),
        fs.lstat(claudeFile).catch(() => null)
      ]);
      
      return !!(claudeDirStats?.isSymbolicLink() && claudeFileStats?.isSymbolicLink());
    } catch {
      return false;
    }
  }
}