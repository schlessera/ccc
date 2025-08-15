import * as fs from 'fs-extra';
import * as path from 'path';
import { PathUtils } from '../../utils/paths';
import { Hook } from '../../types/template';
import { Logger } from '../../utils/logger';
import { UserConfigManager } from '../config/user-manager';

export class HookLoader {
  private hooksCache: Map<string, Hook> = new Map();

  async loadHooks(): Promise<Hook[]> {
    const userConfig = UserConfigManager.getInstance();
    const hooks: Hook[] = [];
    
    // Load hooks from system and user hooks directories
    const systemHooks = await this.loadHooksFromDirectory(userConfig.getSystemHooksDir(), 'system');
    const userHooks = await this.loadHooksFromDirectory(userConfig.getUserHooksDir(), 'user');
    
    // Combine with user precedence
    const allHooks = new Map<string, Hook>();
    
    // Add system hooks first
    systemHooks.forEach(hook => {
      allHooks.set(hook.name, hook);
    });
    
    // Add user hooks (overwrite system hooks with same name)
    userHooks.forEach(hook => {
      allHooks.set(hook.name, hook);
    });
    
    hooks.push(...allHooks.values());
    
    // Cache hooks
    hooks.forEach(hook => {
      this.hooksCache.set(hook.name, hook);
    });
    
    Logger.debug(`Loaded ${hooks.length} hooks (${systemHooks.length} system, ${userHooks.length} user)`);
    
    return hooks;
  }

  async getHook(name: string): Promise<Hook | null> {
    if (!this.hooksCache.has(name)) {
      await this.loadHooks();
    }
    
    return this.hooksCache.get(name) || null;
  }

  async listAvailableHooks(): Promise<string[]> {
    const hooks = await this.loadHooks();
    return hooks.map(hook => hook.name);
  }

  async getHooksByEventType(eventType: Hook['eventType']): Promise<Hook[]> {
    const hooks = await this.loadHooks();
    return hooks.filter(hook => hook.eventType === eventType);
  }

  private async loadHooksFromDirectory(hooksDir: string, source: 'system' | 'user'): Promise<Hook[]> {
    const hooks: Hook[] = [];
    
    if (!await PathUtils.exists(hooksDir)) {
      return hooks;
    }
    
    try {
      const entries = await fs.readdir(hooksDir);
      
      for (const entry of entries) {
        const itemPath = path.join(hooksDir, entry);
        const stat = await fs.stat(itemPath);
        
        if (stat.isDirectory()) {
          // Look for settings.json in the directory
          const settingsPath = path.join(itemPath, 'settings.json');
          if (await PathUtils.exists(settingsPath)) {
            const directoryHooks = await this.loadHooksFromSettings(entry, settingsPath, source);
            hooks.push(...directoryHooks);
          }
        }
      }
    } catch (error) {
      Logger.error(`Failed to load hooks from ${hooksDir}: ${error}`);
    }
    
    return hooks;
  }

  private async loadHooksFromSettings(name: string, settingsPath: string, source: 'system' | 'user'): Promise<Hook[]> {
    const hooks: Hook[] = [];
    
    try {
      const settingsContent = await fs.readFile(settingsPath, 'utf-8');
      const settings = JSON.parse(settingsContent);
      
      if (settings.hooks) {
        for (const [eventType, eventHooks] of Object.entries(settings.hooks)) {
          if (Array.isArray(eventHooks)) {
            // Array format: [{ matcher: "pattern", hooks: [...] }]
            for (let i = 0; i < eventHooks.length; i++) {
              const hookGroup = eventHooks[i];
              if (hookGroup.hooks && Array.isArray(hookGroup.hooks)) {
                for (let j = 0; j < hookGroup.hooks.length; j++) {
                  const hookConfig = hookGroup.hooks[j];
                  if (hookConfig.type === 'command' && hookConfig.command) {
                    hooks.push({
                      name: `${name}-${eventType}-${i}-${j}`,
                      description: hookConfig.description || `${eventType} hook`,
                      eventType: eventType as Hook['eventType'],
                      matcher: hookGroup.matcher,
                      command: hookConfig.command,
                      timeout: hookConfig.timeout,
                      ...(source && { source })
                    } as Hook & { source: string });
                  }
                }
              }
            }
          } else if (typeof eventHooks === 'object') {
            // Simple object format: { "ToolName": "command" }
            if (eventHooks) {
              for (const [toolPattern, command] of Object.entries(eventHooks)) {
                if (typeof command === 'string') {
                  hooks.push({
                    name: `${name}-${eventType}-${toolPattern}`,
                    description: `${eventType} hook for ${toolPattern}`,
                    eventType: eventType as Hook['eventType'],
                    matcher: toolPattern,
                    command,
                    ...(source && { source })
                  } as Hook & { source: string });
                }
              }
            }
          }
        }
      }
    } catch (error) {
      Logger.error(`Failed to parse hooks from ${settingsPath}: ${error}`);
    }
    
    return hooks;
  }
}