import { addAgentCommand } from '../../../../src/cli/commands/add-agent';

// Mock all dependencies
jest.mock('@clack/prompts', () => ({
  cancel: jest.fn(),
  note: jest.fn(),
  select: jest.fn(),
  confirm: jest.fn(),
  spinner: jest.fn(() => ({
    start: jest.fn(),
    stop: jest.fn(),
  })),
  isCancel: jest.fn(),
  outro: jest.fn(),
}));

jest.mock('chalk', () => {
  const mockChalk = {
    red: jest.fn((text) => `[RED]${text}[/RED]`),
    cyan: jest.fn((text) => `[CYAN]${text}[/CYAN]`),
    gray: jest.fn((text) => `[GRAY]${text}[/GRAY]`),
    green: jest.fn((text) => `[GREEN]${text}[/GREEN]`),
    yellow: jest.fn((text) => `[YELLOW]${text}[/YELLOW]`),
  };
  return {
    __esModule: true,
    default: mockChalk
  };
});

jest.mock('fs-extra', () => ({
  ensureDir: jest.fn(),
  readFile: jest.fn(),
  writeFile: jest.fn(),
}));

jest.mock('path', () => ({
  join: jest.fn((...args) => args.join('/')),
}));

jest.mock('../../../../src/utils/paths', () => ({
  PathUtils: {
    isProjectManaged: jest.fn(),
    exists: jest.fn(),
  }
}));

jest.mock('../../../../src/core/agents/loader', () => ({
  AgentLoader: jest.fn().mockImplementation(() => ({
    loadAgents: jest.fn(),
    getAgent: jest.fn(),
  }))
}));

import * as p from '@clack/prompts';
import * as fs from 'fs-extra';
import { PathUtils } from '../../../../src/utils/paths';
import { AgentLoader } from '../../../../src/core/agents/loader';

describe('addAgentCommand', () => {
  let mockProcess: any;
  let mockAgentLoader: any;

  beforeEach(() => {
    // Mock process.cwd and process.exit
    mockProcess = {
      cwd: jest.fn(() => '/test/project'),
      exit: jest.fn(),
    };
    Object.defineProperty(global, 'process', {
      value: mockProcess,
      writable: true,
    });

    // Setup mock AgentLoader
    mockAgentLoader = {
      loadAgents: jest.fn(),
      getAgent: jest.fn(),
    };
    (AgentLoader as jest.Mock).mockImplementation(() => mockAgentLoader);

    // Reset all mocks
    jest.clearAllMocks();

    // Setup default fs mocks
    (fs.ensureDir as unknown as jest.Mock).mockResolvedValue(undefined);
    (fs.writeFile as unknown as jest.Mock).mockResolvedValue(undefined);
    (fs.readFile as unknown as jest.Mock).mockResolvedValue('');
    
    // Setup default prompt mocks
    (p.isCancel as unknown as jest.Mock).mockReturnValue(false);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Basic functionality', () => {
    it('should check if project is managed', async () => {
      (PathUtils.isProjectManaged as jest.Mock).mockResolvedValue(false);

      await addAgentCommand({});

      expect(PathUtils.isProjectManaged).toHaveBeenCalledWith('/test/project');
      expect(p.cancel).toHaveBeenCalledWith('Current directory is not CCC-managed. Run "ccc setup" first.');
      expect(mockProcess.exit).toHaveBeenCalledWith(1);
    });

    it('should create AgentLoader instance', async () => {
      (PathUtils.isProjectManaged as jest.Mock).mockResolvedValue(true);
      mockAgentLoader.loadAgents.mockResolvedValue([]);
      (p.select as jest.Mock).mockResolvedValue('test-agent');
      mockAgentLoader.getAgent.mockResolvedValue(null);

      await addAgentCommand({});

      expect(AgentLoader).toHaveBeenCalled();
    });
  });

  describe('List option', () => {
    it('should show available agents when list option is true', async () => {
      (PathUtils.isProjectManaged as jest.Mock).mockResolvedValue(true);
      const mockAgents = [
        { name: 'agent1', description: 'Test agent 1' },
        { name: 'agent2', description: 'Test agent 2', source: 'user' }
      ];
      mockAgentLoader.loadAgents.mockResolvedValue(mockAgents);

      await addAgentCommand({ list: true });

      expect(mockAgentLoader.loadAgents).toHaveBeenCalled();
      expect(p.note).toHaveBeenCalledWith(
        expect.stringContaining('agent1'),
        '🤖 Available Agents'
      );
    });

    it('should handle empty agents list', async () => {
      (PathUtils.isProjectManaged as jest.Mock).mockResolvedValue(true);
      mockAgentLoader.loadAgents.mockResolvedValue([]);

      await addAgentCommand({ list: true });

      expect(p.note).toHaveBeenCalledWith(
        'No agents available. Add agents to ~/.ccc/agents or system agents directory.',
        '🤖 Available Agents'
      );
    });
  });

  describe('Agent selection', () => {
    it('should use provided agent option', async () => {
      (PathUtils.isProjectManaged as jest.Mock).mockResolvedValue(true);
      const mockAgent = { name: 'test-agent', description: 'Test agent', content: 'Agent content' };
      mockAgentLoader.getAgent.mockResolvedValue(mockAgent);
      (PathUtils.exists as jest.Mock).mockResolvedValue(false);

      await addAgentCommand({ agent: 'test-agent' });

      expect(mockAgentLoader.getAgent).toHaveBeenCalledWith('test-agent');
    });

    it('should prompt for agent selection when not provided', async () => {
      (PathUtils.isProjectManaged as jest.Mock).mockResolvedValue(true);
      const mockAgents = [
        { name: 'agent1', description: 'Test agent 1' },
        { name: 'agent2', description: 'Test agent 2' }
      ];
      mockAgentLoader.loadAgents.mockResolvedValue(mockAgents);
      (p.select as jest.Mock).mockResolvedValue('agent1');
      mockAgentLoader.getAgent.mockResolvedValue(mockAgents[0]);
      (PathUtils.exists as jest.Mock).mockResolvedValue(false);

      await addAgentCommand({});

      expect(p.select).toHaveBeenCalledWith({
        message: 'Select an agent to add',
        options: expect.arrayContaining([
          expect.objectContaining({
            value: 'agent1',
            label: '🤖 agent1'
          })
        ])
      });
    });

    it('should handle agent not found', async () => {
      (PathUtils.isProjectManaged as jest.Mock).mockResolvedValue(true);
      mockAgentLoader.getAgent.mockResolvedValue(null);

      await addAgentCommand({ agent: 'nonexistent-agent' });

      expect(p.cancel).toHaveBeenCalledWith('Agent not found: nonexistent-agent');
      expect(mockProcess.exit).toHaveBeenCalledWith(1);
    });

    it('should handle cancelled selection', async () => {
      (PathUtils.isProjectManaged as jest.Mock).mockResolvedValue(true);
      mockAgentLoader.loadAgents.mockResolvedValue([
        { name: 'agent1', description: 'Test agent 1' }
      ]);
      (p.select as jest.Mock).mockResolvedValue('agent1');
      (p.isCancel as unknown as jest.Mock).mockReturnValue(true);

      await addAgentCommand({});

      expect(p.outro).toHaveBeenCalledWith('Agent installation cancelled');
    });

    it('should handle empty agents list during selection', async () => {
      (PathUtils.isProjectManaged as jest.Mock).mockResolvedValue(true);
      mockAgentLoader.loadAgents.mockResolvedValue([]);

      await addAgentCommand({});

      expect(p.cancel).toHaveBeenCalledWith('No agents available. Add agents to ~/.ccc/agents or system agents directory.');
    });
  });

  describe('Agent installation', () => {
    const mockAgent = {
      name: 'test-agent',
      description: 'Test agent description',
      content: 'Agent content here',
      model: 'gpt-4',
      tools: 'all'
    };

    it('should install new agent successfully', async () => {
      (PathUtils.isProjectManaged as jest.Mock).mockResolvedValue(true);
      mockAgentLoader.getAgent.mockResolvedValue(mockAgent);
      (PathUtils.exists as jest.Mock).mockResolvedValue(false);

      await addAgentCommand({ agent: 'test-agent' });

      expect(fs.ensureDir).toHaveBeenCalledWith('/test/project/.claude/agents');
      expect(fs.writeFile).toHaveBeenCalledWith(
        '/test/project/.claude/agents/test-agent.md',
        expect.stringContaining('name: test-agent'),
        'utf-8'
      );
      expect(p.note).toHaveBeenCalledWith(
        expect.stringContaining('Agent: [CYAN]test-agent[/CYAN]'),
        '[GREEN]🎉 Agent Installation Complete[/GREEN]'
      );
    });

    it('should handle existing agent with same content', async () => {
      (PathUtils.isProjectManaged as jest.Mock).mockResolvedValue(true);
      mockAgentLoader.getAgent.mockResolvedValue(mockAgent);
      (PathUtils.exists as jest.Mock).mockResolvedValue(true);
      
      const expectedContent = `---\nname: test-agent\ndescription: Test agent description\nmodel: gpt-4\ntools: all\n---\n\nAgent content here`;
      (fs.readFile as unknown as jest.Mock).mockResolvedValue(expectedContent);

      await addAgentCommand({ agent: 'test-agent' });

      expect(fs.writeFile).not.toHaveBeenCalled();
      expect(p.note).toHaveBeenCalledWith(
        expect.stringContaining('⚠️  Agent test-agent.md already exists with correct content'),
        '[YELLOW]Warnings[/YELLOW]'
      );
    });

    it('should handle existing agent with different content', async () => {
      (PathUtils.isProjectManaged as jest.Mock).mockResolvedValue(true);
      mockAgentLoader.getAgent.mockResolvedValue(mockAgent);
      (PathUtils.exists as jest.Mock).mockResolvedValue(true);
      (fs.readFile as unknown as jest.Mock).mockResolvedValue('different content');
      (p.confirm as jest.Mock).mockResolvedValue(true);
      (p.isCancel as unknown as jest.Mock).mockReturnValue(false);

      await addAgentCommand({ agent: 'test-agent' });

      expect(p.confirm).toHaveBeenCalledWith({
        message: expect.stringContaining('Agent file test-agent.md already exists'),
        initialValue: false
      });
      expect(fs.writeFile).toHaveBeenCalled();
    });

    it('should handle user declining to overwrite existing agent', async () => {
      (PathUtils.isProjectManaged as jest.Mock).mockResolvedValue(true);
      mockAgentLoader.getAgent.mockResolvedValue(mockAgent);
      (PathUtils.exists as jest.Mock).mockResolvedValue(true);
      (fs.readFile as unknown as jest.Mock).mockResolvedValue('different content');
      (p.confirm as jest.Mock).mockResolvedValue(false);

      await addAgentCommand({ agent: 'test-agent' });

      expect(fs.writeFile).not.toHaveBeenCalled();
      expect(p.note).toHaveBeenCalledWith(
        expect.stringContaining('Using existing agent file'),
        '[YELLOW]Warnings[/YELLOW]'
      );
    });

    it('should generate correct frontmatter for agent with all properties', async () => {
      (PathUtils.isProjectManaged as jest.Mock).mockResolvedValue(true);
      mockAgentLoader.getAgent.mockResolvedValue(mockAgent);
      (PathUtils.exists as jest.Mock).mockResolvedValue(false);

      await addAgentCommand({ agent: 'test-agent' });

      const writeCall = (fs.writeFile as unknown as jest.Mock).mock.calls[0];
      const content = writeCall[1];
      
      expect(content).toContain('name: test-agent');
      expect(content).toContain('description: Test agent description');
      expect(content).toContain('model: gpt-4');
      expect(content).toContain('tools: all');
      expect(content).toContain('Agent content here');
    });

    it('should generate minimal frontmatter for agent with only required properties', async () => {
      const minimalAgent = {
        name: 'minimal-agent',
        description: 'Minimal description',
        content: 'Minimal content'
      };
      
      (PathUtils.isProjectManaged as jest.Mock).mockResolvedValue(true);
      mockAgentLoader.getAgent.mockResolvedValue(minimalAgent);
      (PathUtils.exists as jest.Mock).mockResolvedValue(false);

      await addAgentCommand({ agent: 'minimal-agent' });

      const writeCall = (fs.writeFile as unknown as jest.Mock).mock.calls[0];
      const content = writeCall[1];
      
      expect(content).toContain('name: minimal-agent');
      expect(content).toContain('description: Minimal description');
      expect(content).not.toContain('model:');
      expect(content).not.toContain('tools:');
      expect(content).toContain('Minimal content');
    });
  });

  describe('Error handling', () => {
    it('should handle installation errors', async () => {
      (PathUtils.isProjectManaged as jest.Mock).mockResolvedValue(true);
      const mockAgent = { name: 'test-agent', description: 'Test', content: 'Content' };
      mockAgentLoader.getAgent.mockResolvedValue(mockAgent);
      (fs.ensureDir as jest.Mock).mockRejectedValue(new Error('Permission denied'));

      await addAgentCommand({ agent: 'test-agent' });

      expect(p.cancel).toHaveBeenCalledWith('[RED]Permission denied[/RED]');
      expect(mockProcess.exit).toHaveBeenCalledWith(1);
    });

    it('should handle cancelled confirmation', async () => {
      (PathUtils.isProjectManaged as jest.Mock).mockResolvedValue(true);
      const mockAgent = { name: 'test-agent', description: 'Test', content: 'Content' };
      mockAgentLoader.getAgent.mockResolvedValue(mockAgent);
      (PathUtils.exists as jest.Mock).mockResolvedValue(true);
      (fs.readFile as unknown as jest.Mock).mockResolvedValue('different content');
      (p.confirm as jest.Mock).mockResolvedValue(false);
      (p.isCancel as unknown as jest.Mock).mockReturnValue(false);

      await addAgentCommand({ agent: 'test-agent' });

      expect(p.note).toHaveBeenCalledWith(
        expect.stringContaining('⚠️  Using existing agent file test-agent.md'),
        '[YELLOW]Warnings[/YELLOW]'
      );
    });
  });

  describe('Edge cases', () => {
    it('should handle agent with special characters in name', async () => {
      const specialAgent = {
        name: 'special-agent_name',
        description: 'Special chars test',
        content: 'Content'
      };
      
      (PathUtils.isProjectManaged as jest.Mock).mockResolvedValue(true);
      mockAgentLoader.getAgent.mockResolvedValue(specialAgent);
      (PathUtils.exists as jest.Mock).mockResolvedValue(false);
      (fs.ensureDir as unknown as jest.Mock).mockResolvedValue(undefined);
      (fs.writeFile as unknown as jest.Mock).mockResolvedValue(undefined);

      await addAgentCommand({ agent: 'special-agent_name' });

      expect(fs.writeFile).toHaveBeenCalledWith(
        '/test/project/.claude/agents/special-agent_name.md',
        expect.any(String),
        'utf-8'
      );
    });

    it('should handle agent with multiline content', async () => {
      const multilineAgent = {
        name: 'multiline-agent',
        description: 'Multiline test',
        content: 'Line 1\nLine 2\nLine 3'
      };
      
      (PathUtils.isProjectManaged as jest.Mock).mockResolvedValue(true);
      mockAgentLoader.getAgent.mockResolvedValue(multilineAgent);
      (PathUtils.exists as jest.Mock).mockResolvedValue(false);

      await addAgentCommand({ agent: 'multiline-agent' });

      expect(fs.writeFile).toHaveBeenCalled();
      const writeCall = (fs.writeFile as unknown as jest.Mock).mock.calls[0];
      const content = writeCall[1];
      expect(content).toContain('Line 1\nLine 2\nLine 3');
    });

    it('should handle empty agent description', async () => {
      const emptyDescAgent = {
        name: 'empty-desc',
        description: '',
        content: 'Content'
      };
      
      (PathUtils.isProjectManaged as jest.Mock).mockResolvedValue(true);
      mockAgentLoader.getAgent.mockResolvedValue(emptyDescAgent);
      (PathUtils.exists as jest.Mock).mockResolvedValue(false);

      await addAgentCommand({ agent: 'empty-desc' });

      expect(fs.writeFile).toHaveBeenCalled();
      const writeCall = (fs.writeFile as unknown as jest.Mock).mock.calls[0];
      const content = writeCall[1];
      expect(content).toContain('description: ');
    });
  });
});