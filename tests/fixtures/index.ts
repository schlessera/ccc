import { Template, Agent } from '../../src/types/template';
import { ProjectInfo } from '../../src/types/config';

/**
 * Test fixtures for generating consistent test data
 */
export class TestFixtures {
  static createTemplate(overrides: Partial<Template> = {}): Template {
    return {
      name: 'test-template',
      path: '/test/templates/test-template',
      meta: {
        displayName: 'Test Template',
        version: '1.0.0',
        description: 'A test template',
        icon: '🧪',
        category: 'test'
      },
      files: [],
      ...overrides
    };
  }

  static createAgent(overrides: Partial<Agent> = {}): Agent {
    return {
      name: 'test-agent',
      description: 'A test agent for testing purposes',
      content: 'You are a helpful test assistant.',
      model: 'claude-3-sonnet-20241022',
      ...overrides
    };
  }

  static createProjectInfo(overrides: Partial<ProjectInfo> = {}): ProjectInfo {
    return {
      projectName: 'test-project',
      projectPath: '/test/project/path',
      projectType: 'test-template',
      templateVersion: '1.0.0',
      setupDate: '2024-01-01T00:00:00.000Z',
      lastUpdate: '2024-01-01T00:00:00.000Z',
      ...overrides
    };
  }

  /**
   * Create a complete project directory structure in memory
   */
  static createProjectFiles(projectName = 'test-project') {
    return {
      [`${projectName}/CLAUDE.md`]: `# ${projectName}\n\nProject guidelines here.`,
      [`${projectName}/.claude/settings.json`]: JSON.stringify({
        permissions: {
          allow: [],
          deny: []
        },
        env: {}
      }, null, 2),
      [`${projectName}/.claude/agents.json`]: JSON.stringify({}, null, 2),
      [`${projectName}/.claude/commands.json`]: JSON.stringify({}, null, 2)
    };
  }

  /**
   * Create template directory structure
   */
  static createTemplateFiles(templateName = 'test-template') {
    return {
      [`templates/${templateName}/CLAUDE.md`]: `# ${templateName}\n\nTemplate guidelines.`,
      [`templates/${templateName}/.claude/settings.json`]: JSON.stringify({
        permissions: {
          allow: ['read', 'write'],
          deny: []
        },
        env: {
          NODE_ENV: 'development'
        }
      }, null, 2),
      [`templates/${templateName}/package.json`]: JSON.stringify({
        name: templateName,
        version: '1.0.0',
        description: 'Test template'
      }, null, 2),
      [`templates/${templateName}/template.json`]: JSON.stringify({
        name: templateName,
        version: '1.0.0',
        description: 'A test template',
        icon: '🧪',
        tags: ['test']
      }, null, 2)
    };
  }

  /**
   * Create user config directory structure
   */
  static createUserConfigFiles() {
    return {
      '.ccc/config.json': JSON.stringify({
        defaultTemplate: 'javascript',
        autoUpdate: true
      }, null, 2),
      '.ccc/agents/test-agent/agent.md': `---
name: test-agent
description: A test agent for testing purposes
instructions: You are a helpful test assistant.
modelOverrides:
  provider: anthropic
  model: claude-3-sonnet-20241022
---`,
      '.ccc/commands/test-command/command.md': `# Test Command

A test command that prints hello.

\`\`\`bash
echo "Hello {$ARGUMENTS}"
\`\`\``,
      '.ccc/hooks/test-hook/settings.json': JSON.stringify({
        name: 'test-hook',
        description: 'A test hook',
        eventType: 'PreToolUse',
        command: 'echo "Test hook triggered"'
      }, null, 2)
    };
  }

  /**
   * Generate random project name for tests
   */
  static randomProjectName(): string {
    return `test-project-${Math.random().toString(36).substring(7)}`;
  }

  /**
   * Generate random template name for tests
   */
  static randomTemplateName(): string {
    return `test-template-${Math.random().toString(36).substring(7)}`;
  }
}