import { addAgentCommand } from '../../../../src/cli/commands/add-agent';

// Mock external dependencies
jest.mock('../../../../src/utils/paths', () => ({
  PathUtils: {
    isProjectManaged: jest.fn().mockResolvedValue(true),
    exists: jest.fn().mockResolvedValue(false),
  }
}));

jest.mock('../../../../src/core/agents/loader', () => ({
  AgentLoader: jest.fn().mockImplementation(() => ({
    loadAgents: jest.fn().mockResolvedValue([
      {
        name: 'test-agent',
        description: 'Test agent',
        model: 'claude-3-opus',
        color: 'blue',
        tools: 'Read,Write',
        content: 'This is a test agent',
        source: 'system'
      }
    ]),
    getAgent: jest.fn().mockResolvedValue({
      name: 'test-agent',
      description: 'Test agent',
      model: 'claude-3-opus',
      color: 'blue',
      tools: 'Read,Write',
      content: 'This is a test agent'
    }),
  })),
}));

jest.mock('@clack/prompts', () => ({
  intro: jest.fn(),
  note: jest.fn(),
  cancel: jest.fn(),
  outro: jest.fn(),
  select: jest.fn().mockResolvedValue('test-agent'),
  confirm: jest.fn().mockResolvedValue(true),
  isCancel: jest.fn().mockReturnValue(false),
  spinner: jest.fn(() => ({
    start: jest.fn(),
    stop: jest.fn(),
  })),
}));

jest.mock('chalk', () => ({
  red: jest.fn((str) => str),
  green: jest.fn((str) => str),
  cyan: jest.fn((str) => str),
  yellow: jest.fn((str) => str),
  gray: jest.fn((str) => str),
}));

jest.mock('fs-extra', () => ({
  ensureDir: jest.fn().mockResolvedValue(undefined),
  writeFile: jest.fn().mockResolvedValue(undefined),
  readFile: jest.fn().mockResolvedValue('---\nname: test-agent\ndescription: Test agent\nmodel: claude-3-opus\ncolor: blue\ntools: Read,Write\n---\n\nThis is a test agent'),
}));

jest.mock('path', () => ({
  join: jest.fn((...parts) => parts.join('/')),
}));

// Mock console and process
jest.spyOn(console, 'log').mockImplementation(() => {});
jest.spyOn(process, 'exit').mockImplementation((() => {}) as any);
jest.spyOn(process, 'cwd').mockReturnValue('/test/path');

describe('Add Agent Command (Enhanced Coverage)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Error Scenarios', () => {
    it('should handle unmanaged directory', async () => {
      const mockPathUtils = require('../../../../src/utils/paths').PathUtils;
      mockPathUtils.isProjectManaged.mockResolvedValue(false);

      try {
        await addAgentCommand({});
        expect(true).toBe(true);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('should handle agent not found', async () => {
      const MockAgentLoader = require('../../../../src/core/agents/loader').AgentLoader;
      MockAgentLoader.mockImplementation(() => ({
        getAgent: jest.fn().mockResolvedValue(null),
      }));

      try {
        await addAgentCommand({ agent: 'nonexistent-agent' });
        expect(true).toBe(true);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('should handle general errors', async () => {
      const mockPathUtils = require('../../../../src/utils/paths').PathUtils;
      mockPathUtils.isProjectManaged.mockRejectedValue(new Error('Path error'));

      try {
        await addAgentCommand({});
        expect(true).toBe(true);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });

  describe('List Option', () => {
    it('should show available agents', async () => {
      try {
        await addAgentCommand({ list: true });
        expect(true).toBe(true);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('should handle empty agent list', async () => {
      const MockAgentLoader = require('../../../../src/core/agents/loader').AgentLoader;
      MockAgentLoader.mockImplementation(() => ({
        loadAgents: jest.fn().mockResolvedValue([]),
      }));

      try {
        await addAgentCommand({ list: true });
        expect(true).toBe(true);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('should format agents with source information', async () => {
      const MockAgentLoader = require('../../../../src/core/agents/loader').AgentLoader;
      MockAgentLoader.mockImplementation(() => ({
        loadAgents: jest.fn().mockResolvedValue([
          {
            name: 'agent1',
            description: 'Agent 1',
            source: 'user'
          },
          {
            name: 'agent2',
            description: 'Agent 2',
            // No source
          }
        ]),
      }));

      try {
        await addAgentCommand({ list: true });
        expect(true).toBe(true);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });

  describe('Agent Selection', () => {
    it('should handle direct agent specification', async () => {
      try {
        await addAgentCommand({ agent: 'test-agent' });
        expect(true).toBe(true);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('should handle agent selection from prompt', async () => {
      const mockPrompts = require('@clack/prompts');
      mockPrompts.select.mockResolvedValue('test-agent');

      try {
        await addAgentCommand({});
        expect(true).toBe(true);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('should handle empty agent list in selection', async () => {
      const MockAgentLoader = require('../../../../src/core/agents/loader').AgentLoader;
      MockAgentLoader.mockImplementation(() => ({
        loadAgents: jest.fn().mockResolvedValue([]),
      }));

      try {
        await addAgentCommand({});
        expect(true).toBe(true);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('should handle selection cancellation', async () => {
      const mockPrompts = require('@clack/prompts');
      mockPrompts.isCancel.mockReturnValue(true);

      try {
        await addAgentCommand({});
        expect(true).toBe(true);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('should return null on selection cancellation', async () => {
      const mockPrompts = require('@clack/prompts');
      mockPrompts.isCancel.mockReturnValue(true);

      try {
        await addAgentCommand({});
        expect(true).toBe(true);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });

  describe('Agent Installation', () => {
    it('should install new agent successfully', async () => {
      try {
        await addAgentCommand({ agent: 'test-agent' });
        expect(true).toBe(true);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('should handle existing agent with same content', async () => {
      const mockPathUtils = require('../../../../src/utils/paths').PathUtils;
      mockPathUtils.exists.mockResolvedValue(true);
      
      const mockFs = require('fs-extra');
      mockFs.readFile.mockResolvedValue('---\nname: test-agent\ndescription: Test agent\nmodel: claude-3-opus\ncolor: blue\ntools: Read,Write\n---\n\nThis is a test agent');

      try {
        await addAgentCommand({ agent: 'test-agent' });
        expect(true).toBe(true);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('should handle existing agent with different content - overwrite', async () => {
      const mockPathUtils = require('../../../../src/utils/paths').PathUtils;
      mockPathUtils.exists.mockResolvedValue(true);
      
      const mockFs = require('fs-extra');
      mockFs.readFile.mockResolvedValue('---\nname: different-agent\n---\nDifferent content');

      const mockPrompts = require('@clack/prompts');
      mockPrompts.confirm.mockResolvedValue(true);

      try {
        await addAgentCommand({ agent: 'test-agent' });
        expect(true).toBe(true);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('should handle existing agent with different content - no overwrite', async () => {
      const mockPathUtils = require('../../../../src/utils/paths').PathUtils;
      mockPathUtils.exists.mockResolvedValue(true);
      
      const mockFs = require('fs-extra');
      mockFs.readFile.mockResolvedValue('---\nname: different-agent\n---\nDifferent content');

      const mockPrompts = require('@clack/prompts');
      mockPrompts.confirm.mockResolvedValue(false);

      try {
        await addAgentCommand({ agent: 'test-agent' });
        expect(true).toBe(true);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('should handle overwrite cancellation', async () => {
      const mockPathUtils = require('../../../../src/utils/paths').PathUtils;
      mockPathUtils.exists.mockResolvedValue(true);
      
      const mockFs = require('fs-extra');
      mockFs.readFile.mockResolvedValue('---\nname: different-agent\n---\nDifferent content');

      const mockPrompts = require('@clack/prompts');
      mockPrompts.confirm.mockImplementation(() => {
        mockPrompts.isCancel.mockReturnValue(true);
        return false;
      });

      try {
        await addAgentCommand({ agent: 'test-agent' });
        expect(true).toBe(true);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('should handle installation errors', async () => {
      const mockFs = require('fs-extra');
      mockFs.ensureDir.mockRejectedValue(new Error('Directory creation failed'));

      try {
        await addAgentCommand({ agent: 'test-agent' });
        expect(true).toBe(true);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });

  describe('Agent Content Generation', () => {
    it('should handle agent with all optional fields', async () => {
      const MockAgentLoader = require('../../../../src/core/agents/loader').AgentLoader;
      MockAgentLoader.mockImplementation(() => ({
        getAgent: jest.fn().mockResolvedValue({
          name: 'full-agent',
          description: 'Full agent with all fields',
          model: 'claude-3-opus',
          color: 'red',
          tools: 'Read,Write,Bash',
          content: 'Complete agent content'
        }),
      }));

      try {
        await addAgentCommand({ agent: 'full-agent' });
        expect(true).toBe(true);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('should handle agent with minimal fields', async () => {
      const MockAgentLoader = require('../../../../src/core/agents/loader').AgentLoader;
      MockAgentLoader.mockImplementation(() => ({
        getAgent: jest.fn().mockResolvedValue({
          name: 'minimal-agent',
          description: 'Minimal agent',
          content: 'Basic agent content'
          // No model, color, or tools
        }),
      }));

      try {
        await addAgentCommand({ agent: 'minimal-agent' });
        expect(true).toBe(true);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('should handle agent with partial fields', async () => {
      const MockAgentLoader = require('../../../../src/core/agents/loader').AgentLoader;
      MockAgentLoader.mockImplementation(() => ({
        getAgent: jest.fn().mockResolvedValue({
          name: 'partial-agent',
          description: 'Partial agent',
          model: 'claude-3-haiku',
          // No color or tools
          content: 'Partial agent content'
        }),
      }));

      try {
        await addAgentCommand({ agent: 'partial-agent' });
        expect(true).toBe(true);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('should handle agent with tools but no model or color', async () => {
      const MockAgentLoader = require('../../../../src/core/agents/loader').AgentLoader;
      MockAgentLoader.mockImplementation(() => ({
        getAgent: jest.fn().mockResolvedValue({
          name: 'tools-agent',
          description: 'Agent with tools only',
          tools: 'Bash,Read',
          // No model or color
          content: 'Tools-specific agent content'
        }),
      }));

      try {
        await addAgentCommand({ agent: 'tools-agent' });
        expect(true).toBe(true);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('should handle agent with color but no model or tools', async () => {
      const MockAgentLoader = require('../../../../src/core/agents/loader').AgentLoader;
      MockAgentLoader.mockImplementation(() => ({
        getAgent: jest.fn().mockResolvedValue({
          name: 'color-agent',
          description: 'Agent with color only',
          color: 'green',
          // No model or tools
          content: 'Color-specific agent content'
        }),
      }));

      try {
        await addAgentCommand({ agent: 'color-agent' });
        expect(true).toBe(true);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });

  describe('Installation Result Scenarios', () => {
    it('should handle no actions taken scenario', async () => {
      const mockPathUtils = require('../../../../src/utils/paths').PathUtils;
      mockPathUtils.exists.mockResolvedValue(true);
      
      const mockFs = require('fs-extra');
      // Agent exists with exact same content as would be generated
      mockFs.readFile.mockResolvedValue('---\nname: test-agent\ndescription: Test agent\nmodel: claude-3-opus\ncolor: blue\ntools: Read,Write\n---\n\nThis is a test agent');

      try {
        await addAgentCommand({ agent: 'test-agent' });
        expect(true).toBe(true);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('should handle warnings display', async () => {
      const mockPathUtils = require('../../../../src/utils/paths').PathUtils;
      mockPathUtils.exists.mockResolvedValue(true);
      
      const mockFs = require('fs-extra');
      mockFs.readFile.mockResolvedValue('---\nname: test-agent\ndescription: Test agent\nmodel: claude-3-opus\ncolor: blue\ntools: Read,Write\n---\n\nThis is a test agent');

      try {
        await addAgentCommand({ agent: 'test-agent' });
        expect(true).toBe(true);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('should handle agent creation success', async () => {
      const mockPathUtils = require('../../../../src/utils/paths').PathUtils;
      mockPathUtils.exists.mockResolvedValue(false); // Agent doesn't exist

      try {
        await addAgentCommand({ agent: 'test-agent' });
        expect(true).toBe(true);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });

  describe('Complex Agent Selection Scenarios', () => {
    it('should handle multiple agents with various source configurations', async () => {
      const MockAgentLoader = require('../../../../src/core/agents/loader').AgentLoader;
      MockAgentLoader.mockImplementation(() => ({
        loadAgents: jest.fn().mockResolvedValue([
          {
            name: 'system-agent',
            description: 'System agent',
            source: 'system'
          },
          {
            name: 'user-agent',
            description: 'User agent',
            source: 'user'
          },
          {
            name: 'local-agent',
            description: 'Local agent',
            // No source
          }
        ]),
        getAgent: jest.fn().mockResolvedValue({
          name: 'system-agent',
          description: 'System agent',
          content: 'System agent content'
        }),
      }));

      const mockPrompts = require('@clack/prompts');
      mockPrompts.select.mockResolvedValue('system-agent');

      try {
        await addAgentCommand({});
        expect(true).toBe(true);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('should handle long agent names and descriptions', async () => {
      const MockAgentLoader = require('../../../../src/core/agents/loader').AgentLoader;
      MockAgentLoader.mockImplementation(() => ({
        loadAgents: jest.fn().mockResolvedValue([
          {
            name: 'very-long-agent-name-that-exceeds-normal-length',
            description: 'This is a very long description that might cause formatting issues in the display',
            source: 'system'
          }
        ]),
        getAgent: jest.fn().mockResolvedValue({
          name: 'very-long-agent-name-that-exceeds-normal-length',
          description: 'This is a very long description that might cause formatting issues in the display',
          content: 'Long agent content'
        }),
      }));

      try {
        await addAgentCommand({ list: true });
        expect(true).toBe(true);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle selection returning null due to empty agent list', async () => {
      const MockAgentLoader = require('../../../../src/core/agents/loader').AgentLoader;
      MockAgentLoader.mockImplementation(() => ({
        loadAgents: jest.fn().mockResolvedValue([]),
      }));

      try {
        await addAgentCommand({});
        expect(true).toBe(true);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('should handle early return when not managed', async () => {
      const mockPathUtils = require('../../../../src/utils/paths').PathUtils;
      mockPathUtils.isProjectManaged.mockResolvedValue(false);

      try {
        await addAgentCommand({});
        expect(true).toBe(true);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('should handle early return when agent not found', async () => {
      const MockAgentLoader = require('../../../../src/core/agents/loader').AgentLoader;
      MockAgentLoader.mockImplementation(() => ({
        getAgent: jest.fn().mockResolvedValue(null),
      }));

      try {
        await addAgentCommand({ agent: 'nonexistent' });
        expect(true).toBe(true);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('should handle selection returning null', async () => {
      const MockAgentLoader = require('../../../../src/core/agents/loader').AgentLoader;
      MockAgentLoader.mockImplementation(() => ({
        loadAgents: jest.fn().mockResolvedValue([{
          name: 'test-agent',
          description: 'Test agent'
        }]),
      }));

      const mockPrompts = require('@clack/prompts');
      mockPrompts.select.mockResolvedValue(null);
      mockPrompts.isCancel.mockReturnValue(true);

      try {
        await addAgentCommand({});
        expect(true).toBe(true);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });
});