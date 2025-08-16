import mockFs = require('mock-fs');
import * as path from 'path';
import * as os from 'os';

/**
 * Fluent API for setting up filesystem mocks in tests
 */
export class FileSystemMockBuilder {
  private mockConfig: { [path: string]: any } = {};

  /**
   * Add a file with content to the mock filesystem
   */
  addFile(filePath: string, content: string): this {
    this.mockConfig[filePath] = content;
    return this;
  }

  /**
   * Add multiple files from an object
   */
  addFiles(files: { [path: string]: string }): this {
    Object.assign(this.mockConfig, files);
    return this;
  }

  /**
   * Add an empty directory to the mock filesystem
   */
  addDirectory(dirPath: string): this {
    this.mockConfig[dirPath] = {};
    return this;
  }

  /**
   * Add CCC home directory structure
   */
  addCCCHome(): this {
    const homeDir = os.homedir();
    this.addDirectory(path.join(homeDir, '.ccc'))
      .addDirectory(path.join(homeDir, '.ccc', 'storage'))
      .addDirectory(path.join(homeDir, '.ccc', 'templates'))
      .addDirectory(path.join(homeDir, '.ccc', 'agents'))
      .addDirectory(path.join(homeDir, '.ccc', 'commands'))
      .addDirectory(path.join(homeDir, '.ccc', 'hooks'));
    return this;
  }

  /**
   * Add a project directory with basic structure
   */
  addProject(projectName: string, projectPath?: string): this {
    const basePath = projectPath || `/tmp/${projectName}`;
    
    this.addFile(path.join(basePath, 'CLAUDE.md'), `# ${projectName}\n\nProject guidelines.`)
      .addFile(path.join(basePath, '.claude', 'settings.json'), JSON.stringify({
        permissions: { allow: [], deny: [] },
        env: {}
      }, null, 2))
      .addDirectory(path.join(basePath, '.claude', 'agents'))
      .addDirectory(path.join(basePath, '.claude', 'commands'))
      .addDirectory(path.join(basePath, '.claude', 'hooks'));

    return this;
  }

  /**
   * Add a template directory with structure
   */
  addTemplate(templateName: string, templatePath?: string): this {
    const homeDir = os.homedir();
    const basePath = templatePath || path.join(homeDir, '.ccc', 'templates', templateName);
    
    this.addFile(path.join(basePath, 'CLAUDE.md'), `# ${templateName}\n\nTemplate guidelines.`)
      .addFile(path.join(basePath, '.claude', 'settings.json'), JSON.stringify({
        permissions: { allow: ['read', 'write'], deny: [] },
        env: { NODE_ENV: 'development' }
      }, null, 2))
      .addFile(path.join(basePath, 'template.json'), JSON.stringify({
        name: templateName,
        version: '1.0.0',
        description: `${templateName} template`,
        icon: '🧪',
        tags: ['test']
      }, null, 2));

    return this;
  }

  /**
   * Add a stored project in CCC storage
   */
  addStoredProject(projectName: string): this {
    const homeDir = os.homedir();
    const storagePath = path.join(homeDir, '.ccc', 'storage', projectName);
    
    this.addFile(path.join(storagePath, 'CLAUDE.md'), `# ${projectName}\n\nProject guidelines.`)
      .addFile(path.join(storagePath, '.project-info'), [
        `PROJECT_NAME=${projectName}`,
        `PROJECT_PATH=/test/projects/${projectName}`,
        `PROJECT_TYPE=test-template`,
        `TEMPLATE_VERSION=1.0.0`,
        `SETUP_DATE=2024-01-01T00:00:00.000Z`,
        `LAST_UPDATE=2024-01-01T00:00:00.000Z`
      ].join('\n'))
      .addFile(path.join(storagePath, 'settings.json'), JSON.stringify({
        permissions: { allow: [], deny: [] },
        env: {}
      }, null, 2));

    return this;
  }

  /**
   * Add agent files to user directory
   */
  addAgent(agentName: string, instructions?: string): this {
    const homeDir = os.homedir();
    const agentPath = path.join(homeDir, '.ccc', 'agents', agentName);
    
    this.addFile(path.join(agentPath, 'agent.md'), `---
name: ${agentName}
description: ${instructions || `${agentName} agent`}
instructions: ${instructions || `You are ${agentName}.`}
modelOverrides:
  provider: anthropic
  model: claude-3-sonnet-20241022
---`);
    
    return this;
  }

  /**
   * Add command files to user directory
   */
  addCommand(commandName: string, command?: string): this {
    const homeDir = os.homedir();
    const commandPath = path.join(homeDir, '.ccc', 'commands', commandName);
    
    this.addFile(path.join(commandPath, 'command.md'), 
      `# ${commandName}\n\n${command || `echo "Hello {$ARGUMENTS}"`}`);
    
    return this;
  }

  /**
   * Build and apply the mock filesystem
   */
  build(): void {
    mockFs(this.mockConfig);
  }

  /**
   * Get the current mock configuration (useful for debugging)
   */
  getConfig(): { [path: string]: any } {
    return { ...this.mockConfig };
  }
}

/**
 * Utility functions for filesystem testing
 */
export class FileSystemTestUtils {
  /**
   * Create a new mock filesystem builder
   */
  static builder(): FileSystemMockBuilder {
    return new FileSystemMockBuilder();
  }

  /**
   * Setup a basic CCC environment with common directories
   */
  static setupBasicCCCEnvironment(): FileSystemMockBuilder {
    return new FileSystemMockBuilder()
      .addCCCHome()
      .addTemplate('javascript')
      .addTemplate('typescript')
      .addTemplate('python');
  }

  /**
   * Restore the real filesystem
   */
  static restore(): void {
    mockFs.restore();
  }

  /**
   * Create a temporary project for testing
   */
  static createTempProject(projectName?: string): string {
    const name = projectName || `test-project-${Date.now()}`;
    const projectPath = path.join(os.tmpdir(), name);
    
    new FileSystemMockBuilder()
      .addProject(name, projectPath)
      .build();
      
    return projectPath;
  }
}