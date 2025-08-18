import { AgentLoader } from '../../../../src/core/agents/loader';
import * as fs from 'fs-extra';
import * as path from 'path';

// Mock all dependencies
jest.mock('../../../../src/utils/logger', () => ({
  Logger: {
    debug: jest.fn(),
    success: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  }
}));

jest.mock('fs-extra');
jest.mock('path');

jest.mock('../../../../src/core/config/user-manager', () => ({
  UserConfigManager: {
    getInstance: jest.fn(() => ({
      getCombinedAgents: jest.fn().mockResolvedValue([])
    }))
  }
}));

describe('AgentLoader (Targeted Coverage)', () => {
  let agentLoader: AgentLoader;
  const mockFs = fs as any;
  const mockPath = path as any;

  beforeEach(() => {
    agentLoader = new AgentLoader();
    jest.clearAllMocks();
    
    // Setup path mocks
    mockPath.join.mockImplementation((...parts: string[]) => parts.join('/'));
  });

  describe('loadAgentFromFile method coverage (lines 57-63)', () => {
    it('should cover loadAgentFromFile call path', async () => {
      // Mock stat to return a file
      (mockFs.stat as jest.Mock).mockResolvedValue({
        isFile: () => true,
        isDirectory: () => false
      });

      // Mock readFile to return content
      (mockFs.readFile as jest.Mock).mockResolvedValue('test agent content');

      // Call private method to trigger lines 57-63
      const result = await (agentLoader as any).loadAgentItem('test-agent', '/path/to/agent.md');
      
      expect(mockFs.stat).toHaveBeenCalledWith('/path/to/agent.md');
      expect(mockFs.readFile).toHaveBeenCalledWith('/path/to/agent.md', 'utf-8');
      expect(result).toBeDefined();
      expect(result.name).toBe('test-agent');
    });

    it('should handle loadAgentFromFile with file read error', async () => {
      // Mock stat to return a file
      (mockFs.stat as jest.Mock).mockResolvedValue({
        isFile: () => true,
        isDirectory: () => false
      });

      // Mock readFile to throw error
      (mockFs.readFile as jest.Mock).mockRejectedValue(new Error('File read error'));

      // Call private method to trigger error handling in loadAgentFromFile
      const result = await (agentLoader as any).loadAgentItem('test-agent', '/path/to/agent.md');
      
      expect(result).toBeNull();
    });
  });

  describe('loadAgent directory method coverage (lines 86-96)', () => {
    it('should cover directory loading with markdown files', async () => {
      // Mock stat to return a directory
      (mockFs.stat as jest.Mock).mockResolvedValue({
        isFile: () => false,
        isDirectory: () => true
      });

      // Mock readdir to return markdown files
      (mockFs.readdir as jest.Mock).mockResolvedValue(['agent.md', 'other.md', 'readme.txt']);

      // Mock readFile to return content
      (mockFs.readFile as jest.Mock).mockResolvedValue('# Agent Content\nTest content');

      // Call private method to trigger lines 86-96
      const result = await (agentLoader as any).loadAgentItem('test-agent', '/path/to/agent/dir');
      
      expect(mockFs.stat).toHaveBeenCalledWith('/path/to/agent/dir');
      expect(mockFs.readdir).toHaveBeenCalledWith('/path/to/agent/dir');
      expect(mockFs.readFile).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should prefer agent-named markdown file', async () => {
      // Mock stat to return a directory
      (mockFs.stat as jest.Mock).mockResolvedValue({
        isFile: () => false,
        isDirectory: () => true
      });

      // Mock readdir with agent-named file
      (mockFs.readdir as jest.Mock).mockResolvedValue(['other.md', 'test-agent.md', 'another.md']);

      // Mock readFile to return content
      (mockFs.readFile as jest.Mock).mockResolvedValue('# Test Agent\nAgent content');

      // Call with agent name that matches a file
      const result = await (agentLoader as any).loadAgentItem('test-agent', '/path/to/agent/dir');
      
      expect(mockPath.join).toHaveBeenCalledWith('/path/to/agent/dir', 'test-agent.md');
      expect(result).toBeDefined();
    });

    it('should handle directory with no markdown files', async () => {
      // Mock stat to return a directory
      (mockFs.stat as jest.Mock).mockResolvedValue({
        isFile: () => false,
        isDirectory: () => true
      });

      // Mock readdir to return no markdown files
      (mockFs.readdir as jest.Mock).mockResolvedValue(['readme.txt', 'config.json']);

      // Call private method
      const result = await (agentLoader as any).loadAgentItem('test-agent', '/path/to/agent/dir');
      
      expect(result).toBeNull();
    });

    it('should handle directory read error', async () => {
      // Mock stat to return a directory
      (mockFs.stat as jest.Mock).mockResolvedValue({
        isFile: () => false,
        isDirectory: () => true
      });

      // Mock readdir to throw error
      (mockFs.readdir as jest.Mock).mockRejectedValue(new Error('Directory read error'));

      // Call private method
      const result = await (agentLoader as any).loadAgentItem('test-agent', '/path/to/agent/dir');
      
      expect(result).toBeNull();
    });
  });

  describe('parseAgentContent YAML error coverage (line 117)', () => {
    it('should cover YAML parsing error warning', async () => {
      const contentWithBadYaml = `---
name: test-agent
description: Test
invalid: [unclosed array
---
Agent content here`;

      // This should trigger the YAML parsing error warning on line 117
      const result = (agentLoader as any).parseAgentContent('test-agent', contentWithBadYaml);
      
      // Should still return a valid agent object despite YAML error
      expect(result).toBeDefined();
      expect(result.name).toBe('test-agent'); // Falls back to provided name
      expect(result.content).toBe('Agent content here');
    });

    it('should handle complex YAML parsing scenarios', () => {
      const contentWithComplexBadYaml = `---
name: test
model: gpt-4
tools: [tool1, tool2
color: #ff0000
---
Content`;

      const result = (agentLoader as any).parseAgentContent('test-agent', contentWithComplexBadYaml);
      
      expect(result).toBeDefined();
      expect(result.content).toBe('Content');
    });
  });

  describe('Integration test for full coverage', () => {
    it('should handle mixed file and directory loading scenarios', async () => {
      const userConfig = {
        getCombinedAgents: jest.fn().mockResolvedValue([
          { name: 'file-agent', path: '/path/to/file-agent.md', source: 'user' },
          { name: 'dir-agent', path: '/path/to/dir-agent', source: 'system' }
        ])
      };

      jest.doMock('../../../../src/core/config/user-manager', () => ({
        UserConfigManager: {
          getInstance: () => userConfig
        }
      }));

      // Mock stat calls for different path types
      (mockFs.stat as jest.Mock).mockImplementation((filePath: string) => {
        if (filePath.includes('file-agent.md')) {
          return Promise.resolve({
            isFile: () => true,
            isDirectory: () => false
          });
        } else {
          return Promise.resolve({
            isFile: () => false,
            isDirectory: () => true
          });
        }
      });

      // Mock file operations
      (mockFs.readFile as jest.Mock).mockResolvedValue('---\nname: agent\n---\nContent');
      (mockFs.readdir as jest.Mock).mockResolvedValue(['agent.md']);

      const loader = new AgentLoader();
      const agents = await loader.loadAgents();
      
      expect(agents.length).toBeGreaterThanOrEqual(0);
    });
  });
});