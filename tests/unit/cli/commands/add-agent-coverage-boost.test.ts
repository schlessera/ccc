import { addAgentCommand } from '../../../../src/cli/commands/add-agent';
import { PathUtils } from '../../../../src/utils/paths';
import { AgentLoader } from '../../../../src/core/agents/loader';
import * as p from '@clack/prompts';
import * as fs from 'fs-extra';

// Mock dependencies
jest.mock('../../../../src/utils/paths');
jest.mock('../../../../src/core/agents/loader');
jest.mock('@clack/prompts');
jest.mock('fs-extra');

const mockPathUtils = PathUtils as jest.Mocked<typeof PathUtils>;
const mockAgentLoader = AgentLoader as jest.MockedClass<typeof AgentLoader>;
const mockPrompts = p as jest.Mocked<typeof p>;
const mockFs = fs as jest.Mocked<typeof fs>;

describe('Add Agent Command Coverage Boost', () => {
  let mockLoader: jest.Mocked<AgentLoader>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockLoader = {
      loadAgents: jest.fn(),
      getAgent: jest.fn(),
    } as any;
    
    mockAgentLoader.mockImplementation(() => mockLoader);
    mockPathUtils.isProjectManaged.mockResolvedValue(true);
    mockPathUtils.exists.mockResolvedValue(false);
    (mockFs.ensureDir as any).mockResolvedValue(undefined);
    (mockFs.writeFile as any).mockResolvedValue(undefined);
    mockPrompts.spinner.mockReturnValue({
      start: jest.fn(),
      stop: jest.fn(),
    } as any);
    mockPrompts.note.mockImplementation(() => {});
  });

  describe('Error scenarios', () => {
    it('should handle unmanaged project', async () => {
      mockPathUtils.isProjectManaged.mockResolvedValue(false);
      const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => undefined as never);

      await addAgentCommand({});

      expect(mockPrompts.cancel).toHaveBeenCalledWith('Current directory is not CCC-managed. Run "ccc setup" first.');
      expect(mockExit).toHaveBeenCalledWith(1);
      
      mockExit.mockRestore();
    });

    it('should handle agent not found', async () => {
      mockLoader.getAgent.mockResolvedValue(null);
      const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => undefined as never);

      await addAgentCommand({ agent: 'nonexistent' });

      expect(mockPrompts.cancel).toHaveBeenCalledWith('Agent not found: nonexistent');
      expect(mockExit).toHaveBeenCalledWith(1);
      
      mockExit.mockRestore();
    });

    it('should handle general errors', async () => {
      mockPathUtils.isProjectManaged.mockRejectedValue(new Error('Test error'));
      const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => undefined as never);

      await addAgentCommand({});

      expect(mockPrompts.cancel).toHaveBeenCalledWith(expect.stringContaining('Test error'));
      expect(mockExit).toHaveBeenCalledWith(1);
      
      mockExit.mockRestore();
    });
  });

  describe('List functionality', () => {
    it('should show empty agent list', async () => {
      mockLoader.loadAgents.mockResolvedValue([]);

      await addAgentCommand({ list: true });

      expect(mockPrompts.note).toHaveBeenCalledWith(
        'No agents available. Add agents to ~/.ccc/agents or system agents directory.',
        '🤖 Available Agents'
      );
    });

    it('should show available agents with source', async () => {
      const agents = [
        {
          name: 'test-agent',
          description: 'Test agent',
          content: 'test content',
          source: 'system'
        } as any
      ];
      mockLoader.loadAgents.mockResolvedValue(agents);

      await addAgentCommand({ list: true });

      expect(mockPrompts.note).toHaveBeenCalledWith(
        expect.stringContaining('test-agent'),
        '🤖 Available Agents'
      );
    });
  });

  describe('Agent selection', () => {
    it('should handle no agents available for selection', async () => {
      mockLoader.loadAgents.mockResolvedValue([]);

      await addAgentCommand({});

      expect(mockPrompts.cancel).toHaveBeenCalledWith(
        'No agents available. Add agents to ~/.ccc/agents or system agents directory.'
      );
    });

    it('should handle selection cancellation', async () => {
      const agents = [
        {
          name: 'test-agent',
          description: 'Test agent',
          content: 'test content'
        } as any
      ];
      mockLoader.loadAgents.mockResolvedValue(agents);
      mockPrompts.select.mockResolvedValue(Symbol.for('clack:cancel'));
      mockPrompts.isCancel.mockReturnValue(true);

      await addAgentCommand({});

      expect(mockPrompts.outro).toHaveBeenCalledWith('Agent installation cancelled');
    });

    it('should handle successful agent selection', async () => {
      const agents = [
        {
          name: 'test-agent',
          description: 'Test agent',
          content: 'test content'
        } as any
      ];
      const agent = {
        name: 'test-agent',
        description: 'Test agent',
        content: 'test content',
        model: 'gpt-4',
        color: 'blue',
        tools: 'all'
      };
      
      mockLoader.loadAgents.mockResolvedValue(agents);
      mockLoader.getAgent.mockResolvedValue(agent);
      mockPrompts.select.mockResolvedValue('test-agent');
      mockPrompts.isCancel.mockReturnValue(false);

      await addAgentCommand({});

      expect(mockLoader.getAgent).toHaveBeenCalledWith('test-agent');
    });
  });

  describe('Agent installation', () => {
    const testAgent = {
      name: 'test-agent',
      description: 'Test agent',
      content: 'test content',
      model: 'gpt-4',
      color: 'blue',
      tools: 'all'
    };

    it('should install new agent with all properties', async () => {
      mockLoader.getAgent.mockResolvedValue(testAgent);

      await addAgentCommand({ agent: 'test-agent' });

      expect(mockFs.ensureDir).toHaveBeenCalled();
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('test-agent.md'),
        expect.stringContaining('model: gpt-4'),
        'utf-8'
      );
    });

    it('should handle existing agent with same content', async () => {
      mockLoader.getAgent.mockResolvedValue(testAgent);
      mockPathUtils.exists.mockResolvedValue(true);
      const expectedContent = `---\nname: test-agent\ndescription: Test agent\nmodel: gpt-4\ncolor: blue\ntools: all\n---\n\ntest content`;
      (mockFs.readFile as any).mockResolvedValue(expectedContent);

      await addAgentCommand({ agent: 'test-agent' });

      expect(mockPrompts.note).toHaveBeenCalledWith(
        expect.stringContaining('already exists with correct content'),
        expect.any(String)
      );
    });

    it('should handle existing agent with different content - overwrite', async () => {
      mockLoader.getAgent.mockResolvedValue(testAgent);
      mockPathUtils.exists.mockResolvedValue(true);
      (mockFs.readFile as any).mockResolvedValue('different content');
      mockPrompts.confirm.mockResolvedValue(true);
      mockPrompts.isCancel.mockReturnValue(false);

      await addAgentCommand({ agent: 'test-agent' });

      expect(mockPrompts.confirm).toHaveBeenCalledWith({
        message: expect.stringContaining('already exists with different content'),
        initialValue: false
      });
      expect(mockFs.writeFile).toHaveBeenCalled();
    });

    it('should handle existing agent with different content - no overwrite', async () => {
      mockLoader.getAgent.mockResolvedValue(testAgent);
      mockPathUtils.exists.mockResolvedValue(true);
      (mockFs.readFile as any).mockResolvedValue('different content');
      mockPrompts.confirm.mockResolvedValue(false);
      mockPrompts.isCancel.mockReturnValue(false);

      await addAgentCommand({ agent: 'test-agent' });

      expect(mockPrompts.note).toHaveBeenCalledWith(
        expect.stringContaining('Using existing agent file'),
        expect.any(String)
      );
    });

    it('should handle overwrite cancellation', async () => {
      mockLoader.getAgent.mockResolvedValue(testAgent);
      mockPathUtils.exists.mockResolvedValue(true);
      (mockFs.readFile as any).mockResolvedValue('different content');
      mockPrompts.confirm.mockResolvedValue(Symbol.for('clack:cancel'));
      mockPrompts.isCancel.mockReturnValue(true);

      await addAgentCommand({ agent: 'test-agent' });

      expect(mockPrompts.note).toHaveBeenCalledWith(
        expect.stringContaining('Using existing agent file'),
        expect.any(String)
      );
    });

    it('should handle installation errors', async () => {
      mockLoader.getAgent.mockResolvedValue(testAgent);
      (mockFs.ensureDir as any).mockRejectedValue(new Error('Permission denied'));
      const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => undefined as never);

      await addAgentCommand({ agent: 'test-agent' });

      expect(mockExit).toHaveBeenCalledWith(1);
      mockExit.mockRestore();
    });

    it('should handle agent without optional properties', async () => {
      const minimalAgent = {
        name: 'minimal-agent',
        description: 'Minimal agent',
        content: 'minimal content'
      };
      mockLoader.getAgent.mockResolvedValue(minimalAgent);

      await addAgentCommand({ agent: 'minimal-agent' });

      expect(mockFs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('minimal-agent.md'),
        expect.stringContaining('name: minimal-agent'),
        'utf-8'
      );
    });
  });
});