export interface Settings {
  permissions?: {
    allow?: string[];
    deny?: string[];
  };
  env?: Record<string, string>;
}

export interface MCP {
  mcpServers?: Record<string, {
    command: string;
    args?: string[];
    env?: Record<string, string>;
  }>;
}

export interface ProjectInfo {
  projectName: string;
  projectPath: string;
  projectType: string;
  templateVersion: string;
  setupDate: string;
  lastUpdate: string;
}

export interface Config {
  settings: Settings;
  mcp?: MCP;
  projectInfo: ProjectInfo;
}