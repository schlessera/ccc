import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs-extra';

export class PathUtils {
  private static cccDir = path.join(os.homedir(), '.ccc');

  static getStorageDir(): string {
    return path.join(this.cccDir, 'storage');
  }

  static getTemplatesDir(): string {
    return path.join(this.cccDir, 'templates');
  }

  static getCommandsDir(): string {
    return path.join(this.cccDir, 'commands');
  }

  static getAgentsDir(): string {
    return path.join(this.cccDir, 'agents');
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
}