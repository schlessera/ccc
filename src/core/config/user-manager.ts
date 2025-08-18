import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs-extra';
import { PathUtils } from '../../utils/paths';

export class UserConfigManager {
  private static instance: UserConfigManager;
  private configDir: string;

  private constructor() {
    // Allow override via environment variable
    this.configDir = process.env.CCC_CONFIG_DIR || path.join(os.homedir(), '.ccc');
  }

  static getInstance(): UserConfigManager {
    if (!UserConfigManager.instance) {
      UserConfigManager.instance = new UserConfigManager();
    }
    return UserConfigManager.instance;
  }

  getConfigDir(): string {
    return this.configDir;
  }

  getUserTemplatesDir(): string {
    return path.join(this.configDir, 'templates');
  }

  getUserAgentsDir(): string {
    return path.join(this.configDir, 'agents');
  }

  getUserCommandsDir(): string {
    return path.join(this.configDir, 'commands');
  }

  getUserHooksDir(): string {
    return path.join(this.configDir, 'hooks');
  }

  getSystemTemplatesDir(): string {
    return path.join(__dirname, '../../../templates');
  }

  getSystemAgentsDir(): string {
    return path.join(__dirname, '../../../agents');
  }

  getSystemCommandsDir(): string {
    return path.join(__dirname, '../../../commands');
  }

  getSystemHooksDir(): string {
    return path.join(__dirname, '../../../hooks');
  }

  async ensureUserConfigDir(): Promise<void> {
    await PathUtils.ensureDir(this.configDir);
    await PathUtils.ensureDir(this.getUserTemplatesDir());
    await PathUtils.ensureDir(this.getUserAgentsDir());
    await PathUtils.ensureDir(this.getUserCommandsDir());
    await PathUtils.ensureDir(this.getUserHooksDir());
  }

  /**
   * Get combined list of items from system and user directories
   * User items take precedence over system items with the same name
   * Supports both directories and markdown files for commands
   */
  async getCombinedItems(
    systemDir: string, 
    userDir: string,
    supportFiles = false, // For commands that can be markdown files
    excludePattern?: string // Pattern to exclude (e.g., 'ccc' to exclude ccc subdirectory)
  ): Promise<Array<{ name: string; path: string; source: 'system' | 'user' }>> {
    const items = new Map<string, { name: string; path: string; source: 'system' | 'user' }>();

    // Load system items first
    if (await PathUtils.exists(systemDir)) {
      const systemEntries = await fs.readdir(systemDir);
      for (const entry of systemEntries) {
        // Skip excluded patterns
        if (excludePattern && entry === excludePattern) {
          continue;
        }
        
        const itemPath = path.join(systemDir, entry);
        const stat = await fs.stat(itemPath);
        
        if (stat.isDirectory()) {
          items.set(entry, { name: entry, path: itemPath, source: 'system' });
        } else if (supportFiles && entry.endsWith('.md')) {
          const name = path.basename(entry, '.md');
          items.set(name, { name, path: itemPath, source: 'system' });
        }
      }
    }

    // Load user items (overwrite system items with same name)
    if (await PathUtils.exists(userDir)) {
      const userEntries = await fs.readdir(userDir);
      for (const entry of userEntries) {
        // Skip excluded patterns
        if (excludePattern && entry === excludePattern) {
          continue;
        }
        
        const itemPath = path.join(userDir, entry);
        const stat = await fs.stat(itemPath);
        
        if (stat.isDirectory()) {
          items.set(entry, { name: entry, path: itemPath, source: 'user' });
        } else if (supportFiles && entry.endsWith('.md')) {
          const name = path.basename(entry, '.md');
          items.set(name, { name, path: itemPath, source: 'user' });
        }
      }
    }

    return Array.from(items.values());
  }

  /**
   * Get combined items from a specific subdirectory (e.g., 'ccc' for system commands)
   */
  async getCombinedItemsFromSubdir(
    systemDir: string,
    userDir: string,
    subdirName: string,
    supportFiles = false
  ): Promise<Array<{ name: string; path: string; source: 'system' | 'user' }>> {
    const items = new Map<string, { name: string; path: string; source: 'system' | 'user' }>();

    // Load system items from subdirectory
    const systemSubdir = path.join(systemDir, subdirName);
    if (await PathUtils.exists(systemSubdir)) {
      const systemEntries = await fs.readdir(systemSubdir);
      for (const entry of systemEntries) {
        const itemPath = path.join(systemSubdir, entry);
        const stat = await fs.stat(itemPath);
        
        if (stat.isDirectory()) {
          items.set(entry, { name: entry, path: itemPath, source: 'system' });
        } else if (supportFiles && entry.endsWith('.md')) {
          const name = path.basename(entry, '.md');
          items.set(name, { name, path: itemPath, source: 'system' });
        }
      }
    }

    // Load user items from subdirectory (overwrite system items with same name)
    const userSubdir = path.join(userDir, subdirName);
    if (await PathUtils.exists(userSubdir)) {
      const userEntries = await fs.readdir(userSubdir);
      for (const entry of userEntries) {
        const itemPath = path.join(userSubdir, entry);
        const stat = await fs.stat(itemPath);
        
        if (stat.isDirectory()) {
          items.set(entry, { name: entry, path: itemPath, source: 'user' });
        } else if (supportFiles && entry.endsWith('.md')) {
          const name = path.basename(entry, '.md');
          items.set(name, { name, path: itemPath, source: 'user' });
        }
      }
    }

    return Array.from(items.values());
  }

  async getCombinedTemplates(): Promise<Array<{ name: string; path: string; source: 'system' | 'user' }>> {
    return this.getCombinedItems(this.getSystemTemplatesDir(), this.getUserTemplatesDir());
  }

  async getCombinedAgents(): Promise<Array<{ name: string; path: string; source: 'system' | 'user' }>> {
    return this.getCombinedItems(this.getSystemAgentsDir(), this.getUserAgentsDir(), true);
  }

  async getCombinedCommands(): Promise<Array<{ name: string; path: string; source: 'system' | 'user' }>> {
    return this.getCombinedItems(this.getSystemCommandsDir(), this.getUserCommandsDir(), true);
  }

  async getCombinedProjectCommands(): Promise<Array<{ name: string; path: string; source: 'system' | 'user' }>> {
    return this.getCombinedItems(this.getSystemCommandsDir(), this.getUserCommandsDir(), true, 'ccc');
  }

  async getCombinedSystemCommands(): Promise<Array<{ name: string; path: string; source: 'system' | 'user' }>> {
    return this.getCombinedItemsFromSubdir(this.getSystemCommandsDir(), this.getUserCommandsDir(), 'ccc', true);
  }

  async getCombinedHooks(): Promise<Array<{ name: string; path: string; source: 'system' | 'user' }>> {
    return this.getCombinedItems(this.getSystemHooksDir(), this.getUserHooksDir());
  }
}