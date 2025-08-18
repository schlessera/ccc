import * as fs from 'fs-extra';
import * as path from 'path';
import { Logger } from '../../utils/logger';
import { UserConfigManager } from '../config/user-manager';

export interface Command {
  name: string;
  description?: string;
  allowedTools?: string;
  argumentHint?: string;
  content: string; // The actual markdown content with {$ARGUMENTS} placeholder
}

export class CommandLoader {
  private commandsCache: Map<string, Command> = new Map();
  private projectCommandsCache: Map<string, Command> = new Map();
  private systemCommandsCache: Map<string, Command> = new Map();

  async loadCommands(): Promise<Command[]> {
    const userConfig = UserConfigManager.getInstance();
    const combinedCommands = await userConfig.getCombinedCommands();
    
    const commands: Command[] = [];
    
    // Load commands from combined sources (user takes precedence over system)
    for (const commandItem of combinedCommands) {
      const command = await this.loadCommandItem(commandItem.name, commandItem.path);
      if (command) {
        // Add source information to command for debugging
        (command as any).source = commandItem.source;
        commands.push(command);
      }
    }
    
    // Cache commands
    commands.forEach(command => {
      this.commandsCache.set(command.name, command);
    });
    
    const systemCount = combinedCommands.filter(c => c.source === 'system').length;
    const userCount = combinedCommands.filter(c => c.source === 'user').length;
    Logger.debug(`Loaded ${commands.length} commands (${systemCount} system, ${userCount} user)`);
    
    return commands;
  }

  async loadProjectCommands(): Promise<Command[]> {
    const userConfig = UserConfigManager.getInstance();
    const combinedCommands = await userConfig.getCombinedProjectCommands();
    
    const commands: Command[] = [];
    
    // Load commands from combined sources (user takes precedence over system)
    for (const commandItem of combinedCommands) {
      const command = await this.loadCommandItem(commandItem.name, commandItem.path);
      if (command) {
        // Add source information to command for debugging
        (command as any).source = commandItem.source;
        commands.push(command);
      }
    }
    
    // Cache project commands
    commands.forEach(command => {
      this.projectCommandsCache.set(command.name, command);
    });
    
    const systemCount = combinedCommands.filter(c => c.source === 'system').length;
    const userCount = combinedCommands.filter(c => c.source === 'user').length;
    Logger.debug(`Loaded ${commands.length} project commands (${systemCount} system, ${userCount} user)`);
    
    return commands;
  }

  async loadSystemCommands(): Promise<Command[]> {
    const userConfig = UserConfigManager.getInstance();
    const combinedCommands = await userConfig.getCombinedSystemCommands();
    
    const commands: Command[] = [];
    
    // Load commands from combined sources (user takes precedence over system)
    for (const commandItem of combinedCommands) {
      const command = await this.loadCommandItem(commandItem.name, commandItem.path);
      if (command) {
        // Add source information to command for debugging
        (command as any).source = commandItem.source;
        commands.push(command);
      }
    }
    
    // Cache system commands
    commands.forEach(command => {
      this.systemCommandsCache.set(command.name, command);
    });
    
    const systemCount = combinedCommands.filter(c => c.source === 'system').length;
    const userCount = combinedCommands.filter(c => c.source === 'user').length;
    Logger.debug(`Loaded ${commands.length} system commands (${systemCount} system, ${userCount} user)`);
    
    return commands;
  }

  async getCommand(name: string): Promise<Command | null> {
    if (!this.commandsCache.has(name)) {
      await this.loadCommands();
    }
    
    return this.commandsCache.get(name) || null;
  }

  async listAvailableCommands(): Promise<string[]> {
    const commands = await this.loadCommands();
    return commands.map(command => command.name);
  }

  private async loadCommandItem(name: string, itemPath: string): Promise<Command | null> {
    try {
      const stat = await fs.stat(itemPath);
      
      if (stat.isFile() && itemPath.endsWith('.md')) {
        // Handle direct markdown file
        return this.loadCommandFromFile(name, itemPath);
      } else if (stat.isDirectory()) {
        // Handle directory with markdown files
        return this.loadCommand(name, itemPath);
      }
      
      return null;
    } catch (error) {
      Logger.error(`Failed to load command item ${name}: ${error}`);
      return null;
    }
  }

  private async loadCommandFromFile(name: string, filePath: string): Promise<Command | null> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      return this.parseCommandContent(name, content);
    } catch (error) {
      Logger.error(`Failed to load command file ${name}: ${error}`);
      return null;
    }
  }

  private async loadCommand(name: string, commandPath: string): Promise<Command | null> {
    // Look for markdown files in the command directory
    let markdownFile: string | null = null;
    
    try {
      const entries = await fs.readdir(commandPath);
      const mdFiles = entries.filter(entry => entry.endsWith('.md'));
      
      if (mdFiles.length === 0) {
        Logger.warn(`Command ${name} has no markdown files`);
        return null;
      }
      
      // Use the first markdown file found, or prefer one named after the command
      markdownFile = mdFiles.find(file => file === `${name}.md`) || mdFiles[0];
      
      const filePath = path.join(commandPath, markdownFile);
      const content = await fs.readFile(filePath, 'utf-8');
      
      return this.parseCommandContent(name, content);
    } catch (error) {
      Logger.error(`Failed to load command ${name}: ${error}`);
      return null;
    }
  }

  private parseCommandContent(name: string, content: string): Command {
    // Parse frontmatter if present
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
    
    let frontmatter: any = {};
    let markdownContent = content;
    
    if (frontmatterMatch) {
      try {
        // Parse YAML frontmatter
        const yaml = frontmatterMatch[1];
        frontmatter = this.parseYamlFrontmatter(yaml);
        markdownContent = frontmatterMatch[2];
      } catch (error) {
        Logger.warn(`Failed to parse frontmatter for command ${name}: ${error}`);
      }
    }
    
    return {
      name,
      description: frontmatter.description,
      allowedTools: frontmatter['allowed-tools'],
      argumentHint: frontmatter['argument-hint'],
      content: markdownContent.trim()
    };
  }

  private parseYamlFrontmatter(yaml: string): any {
    const result: any = {};
    const lines = yaml.split('\n');
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine || trimmedLine.startsWith('#')) continue;
      
      const colonIndex = trimmedLine.indexOf(':');
      if (colonIndex === -1) continue;
      
      const key = trimmedLine.substring(0, colonIndex).trim();
      const value = trimmedLine.substring(colonIndex + 1).trim();
      
      result[key] = value;
    }
    
    return result;
  }
}