import * as fs from 'fs-extra';
import * as path from 'path';
import { Agent } from '../../types/template';
import { Logger } from '../../utils/logger';
import { UserConfigManager } from '../config/user-manager';

export class AgentLoader {
  private agentsCache: Map<string, Agent> = new Map();

  async loadAgents(): Promise<Agent[]> {
    const userConfig = UserConfigManager.getInstance();
    const combinedAgents = await userConfig.getCombinedAgents();
    
    const agents: Agent[] = [];
    
    // Load agents from combined sources (user takes precedence over system)
    for (const agentItem of combinedAgents) {
      const agent = await this.loadAgentItem(agentItem.name, agentItem.path);
      if (agent) {
        // Add source information to agent for debugging
        (agent as any).source = agentItem.source;
        agents.push(agent);
      }
    }
    
    // Cache agents
    agents.forEach(agent => {
      this.agentsCache.set(agent.name, agent);
    });
    
    const systemCount = combinedAgents.filter(a => a.source === 'system').length;
    const userCount = combinedAgents.filter(a => a.source === 'user').length;
    Logger.debug(`Loaded ${agents.length} agents (${systemCount} system, ${userCount} user)`);
    
    return agents;
  }

  async getAgent(name: string): Promise<Agent | null> {
    if (!this.agentsCache.has(name)) {
      await this.loadAgents();
    }
    
    return this.agentsCache.get(name) || null;
  }

  async listAvailableAgents(): Promise<string[]> {
    const agents = await this.loadAgents();
    return agents.map(agent => agent.name);
  }

  private async loadAgentItem(name: string, itemPath: string): Promise<Agent | null> {
    try {
      const stat = await fs.stat(itemPath);
      
      if (stat.isFile() && itemPath.endsWith('.md')) {
        // Handle direct markdown file
        return this.loadAgentFromFile(name, itemPath);
      } else if (stat.isDirectory()) {
        // Handle directory with markdown files (legacy support)
        return this.loadAgent(name, itemPath);
      }
      
      return null;
    } catch (error) {
      Logger.error(`Failed to load agent item ${name}: ${error}`);
      return null;
    }
  }

  private async loadAgentFromFile(name: string, filePath: string): Promise<Agent | null> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      return this.parseAgentContent(name, content);
    } catch (error) {
      Logger.error(`Failed to load agent file ${name}: ${error}`);
      return null;
    }
  }

  private async loadAgent(name: string, agentPath: string): Promise<Agent | null> {
    // Look for markdown files in the agent directory
    try {
      const entries = await fs.readdir(agentPath);
      const mdFiles = entries.filter(entry => entry.endsWith('.md'));
      
      if (mdFiles.length === 0) {
        Logger.warn(`Agent ${name} has no markdown files`);
        return null;
      }
      
      // Use the first markdown file found, or prefer one named after the agent
      const markdownFile = mdFiles.find(file => file === `${name}.md`) || mdFiles[0];
      const filePath = path.join(agentPath, markdownFile);
      const content = await fs.readFile(filePath, 'utf-8');
      
      return this.parseAgentContent(name, content);
    } catch (error) {
      Logger.error(`Failed to load agent ${name}: ${error}`);
      return null;
    }
  }

  private parseAgentContent(name: string, content: string): Agent {
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
        Logger.warn(`Failed to parse frontmatter for agent ${name}: ${error}`);
      }
    }
    
    return {
      name: frontmatter.name || name,
      description: frontmatter.description || '',
      model: frontmatter.model,
      color: frontmatter.color,
      tools: frontmatter.tools,
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