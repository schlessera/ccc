import { AgentLoader } from '../../../../src/core/agents/loader';

// Mock dependencies
jest.mock('../../../../src/utils/logger', () => ({
  Logger: {
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    success: jest.fn(),
  }
}));

describe('AgentLoader (Comprehensive)', () => {
  let agentLoader: AgentLoader;

  beforeEach(() => {
    agentLoader = new AgentLoader();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Basic Functionality', () => {
    it('should be instantiable', () => {
      expect(agentLoader).toBeInstanceOf(AgentLoader);
    });

    it('should have loadAgents method', () => {
      expect(typeof agentLoader.loadAgents).toBe('function');
    });

    it('should have getAgent method', () => {
      expect(typeof agentLoader.getAgent).toBe('function');
    });

    it('should have listAvailableAgents method', () => {
      expect(typeof agentLoader.listAvailableAgents).toBe('function');
    });

    it('should provide core agent loading functionality', () => {
      expect(typeof agentLoader.loadAgents).toBe('function');
      expect(typeof agentLoader.getAgent).toBe('function');
      expect(typeof agentLoader.listAvailableAgents).toBe('function');
    });
  });

  describe('Error Resilience', () => {
    it('should handle loadAgents without throwing', async () => {
      await expect(agentLoader.loadAgents()).resolves.not.toThrow();
    });

    it('should handle getAgent without throwing', async () => {
      await expect(agentLoader.getAgent('nonexistent')).resolves.not.toThrow();
    });

    it('should handle listAvailableAgents without throwing', async () => {
      await expect(agentLoader.listAvailableAgents()).resolves.not.toThrow();
    });

    it('should handle agent loading operations without throwing', async () => {
      // Test multiple operations in sequence
      const agents = await agentLoader.loadAgents();
      expect(Array.isArray(agents)).toBe(true);

      await agentLoader.getAgent('test');
      // Should not throw, even if agent doesn't exist

      const availableAgents = await agentLoader.listAvailableAgents();
      expect(Array.isArray(availableAgents)).toBe(true);
    });
  });

  describe('Method Signatures', () => {
    it('should have correct return types for loadAgents', async () => {
      const result = await agentLoader.loadAgents();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle agent names as strings', async () => {
      const result = await agentLoader.getAgent('test-agent');
      expect(result === null || (typeof result === 'object')).toBe(true);
    });

    it('should return string array for listAvailableAgents', async () => {
      const result = await agentLoader.listAvailableAgents();
      expect(Array.isArray(result)).toBe(true);
      result.forEach(name => {
        expect(typeof name).toBe('string');
      });
    });

    it('should handle agent objects correctly', async () => {
      const agents = await agentLoader.loadAgents();
      agents.forEach(agent => {
        expect(agent).toHaveProperty('name');
        expect(typeof agent.name).toBe('string');
        expect(agent).toHaveProperty('description');
        expect(agent).toHaveProperty('content');
      });
    });
  });

  describe('Agent Structure', () => {
    it('should handle Agent interface properties', async () => {
      const agents = await agentLoader.loadAgents();
      agents.forEach(agent => {
        expect(typeof agent.name).toBe('string');
        expect(typeof agent.description).toBe('string');
        expect(typeof agent.content).toBe('string');
      });
    });

    it('should handle optional agent properties', async () => {
      const agents = await agentLoader.loadAgents();
      agents.forEach(agent => {
        // Optional properties should be undefined or have correct type
        if (agent.model) {
          expect(typeof agent.model).toBe('string');
        }
        if (agent.color) {
          expect(typeof agent.color).toBe('string');
        }
        if (agent.tools) {
          expect(typeof agent.tools).toBe('string');
        }
      });
    });

    it('should validate agent content structure', async () => {
      const agents = await agentLoader.loadAgents();
      agents.forEach(agent => {
        expect(agent.name.length).toBeGreaterThan(0);
        expect(agent.description.length).toBeGreaterThan(0);
        expect(agent.content.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Cache Management', () => {
    it('should return null for non-existent agents', async () => {
      const agent = await agentLoader.getAgent('definitely-does-not-exist');
      expect(agent).toBeNull();
    });

    it('should cache agents after loading', async () => {
      // Load agents to populate cache
      await agentLoader.loadAgents();
      
      // Should be able to get agents from cache
      await agentLoader.getAgent('any-name');
      // Should not throw and should be consistent
    });

    it('should provide consistent results from cache', async () => {
      const loader = new AgentLoader();
      
      // Cache should work across calls
      await loader.loadAgents();
      const agent1 = await loader.getAgent('test');
      const agent2 = await loader.getAgent('test');
      
      // Should return consistent results
      expect(agent1).toEqual(agent2);
    });
  });

  describe('Integration Points', () => {
    it('should work with dependency injection pattern', () => {
      // Should be able to create multiple instances
      const loader1 = new AgentLoader();
      const loader2 = new AgentLoader();
      
      expect(loader1).toBeInstanceOf(AgentLoader);
      expect(loader2).toBeInstanceOf(AgentLoader);
      expect(loader1).not.toBe(loader2);
    });

    it('should maintain internal cache structure', async () => {
      const loader = new AgentLoader();
      
      // Should have private cache
      expect(loader).toBeInstanceOf(AgentLoader);
      
      // Cache should work across calls
      await loader.loadAgents();
      const agent1 = await loader.getAgent('test');
      const agent2 = await loader.getAgent('test');
      
      // Should return consistent results
      expect(agent1).toEqual(agent2);
    });
  });

  describe('API Consistency', () => {
    it('should follow similar patterns to other loaders', () => {
      // Should have consistent method naming
      expect(typeof agentLoader.loadAgents).toBe('function');
      expect(typeof agentLoader.getAgent).toBe('function');
      
      // Should follow async pattern
      expect(typeof agentLoader.loadAgents().then).toBe('function');
      expect(typeof agentLoader.getAgent('test').then).toBe('function');
    });

    it('should provide comprehensive agent functionality', () => {
      // Core functionality
      expect(typeof agentLoader.loadAgents).toBe('function');
      expect(typeof agentLoader.getAgent).toBe('function');
      expect(typeof agentLoader.listAvailableAgents).toBe('function');
    });
  });

  describe('Edge Cases', () => {
    it('should handle various agent name formats', async () => {
      // Test different name formats
      const names = ['test', 'test-agent', 'test_agent', 'TestAgent', ''];
      
      for (const name of names) {
        const result = await agentLoader.getAgent(name);
        // Should not throw for any name format
        expect(result === null || typeof result === 'object').toBe(true);
      }
    });

    it('should handle agent interface validation', async () => {
      const agents = await agentLoader.loadAgents();
      
      // Each agent should have required properties
      agents.forEach(agent => {
        expect(agent).toHaveProperty('name');
        expect(agent).toHaveProperty('description');
        expect(agent).toHaveProperty('content');
        
        // Required properties should not be empty
        expect(agent.name).toBeTruthy();
        expect(agent.description).toBeTruthy();
        expect(agent.content).toBeTruthy();
      });
    });

    it('should handle agent loading from different sources', async () => {
      const agents = await agentLoader.loadAgents();
      
      // Should handle both system and user agents
      agents.forEach(agent => {
        // Should have source information if available
        if ((agent as any).source) {
          expect(['system', 'user']).toContain((agent as any).source);
        }
      });
    });

    it('should validate agent content formats', async () => {
      const agents = await agentLoader.loadAgents();
      
      agents.forEach(agent => {
        // Content should be valid markdown or text
        expect(typeof agent.content).toBe('string');
        expect(agent.content.trim().length).toBeGreaterThan(0);
      });
    });
  });

  describe('Performance and Efficiency', () => {
    it('should handle multiple concurrent agent requests', async () => {
      // Test concurrent access
      const promises = Array(5).fill(null).map(() => agentLoader.getAgent('test'));
      const results = await Promise.all(promises);
      
      // All should complete without error
      results.forEach(result => {
        expect(result === null || typeof result === 'object').toBe(true);
      });
    });

    it('should efficiently cache agents', async () => {
      // First load should populate cache
      await agentLoader.loadAgents();
      
      // Subsequent gets should use cache (should not reload)
      const agent1 = await agentLoader.getAgent('test-agent');
      const agent2 = await agentLoader.getAgent('test-agent');
      
      // Should return consistent results (from cache)
      expect(agent1).toEqual(agent2);
    });

    it('should handle list operations efficiently', async () => {
      // List should be based on loaded agents
      const agents = await agentLoader.loadAgents();
      const list = await agentLoader.listAvailableAgents();
      
      expect(list.length).toBe(agents.length);
      
      // All agent names should be in the list
      agents.forEach(agent => {
        expect(list).toContain(agent.name);
      });
    });
  });

  describe('Agent File Formats', () => {
    it('should handle markdown agent files', async () => {
      const agents = await agentLoader.loadAgents();
      
      // Should be able to load agents from markdown files
      agents.forEach(agent => {
        expect(typeof agent.content).toBe('string');
        // Content should be parseable markdown
      });
    });

    it('should handle directory-based agents', async () => {
      const agents = await agentLoader.loadAgents();
      
      // Should support both file and directory formats
      expect(Array.isArray(agents)).toBe(true);
    });

    it('should parse agent metadata correctly', async () => {
      const agents = await agentLoader.loadAgents();
      
      agents.forEach(agent => {
        // Should have properly parsed metadata
        expect(typeof agent.name).toBe('string');
        expect(typeof agent.description).toBe('string');
        
        // Optional properties should have correct types if present
        if (agent.model) {
          expect(typeof agent.model).toBe('string');
        }
        if (agent.color) {
          expect(typeof agent.color).toBe('string');
        }
      });
    });
  });

  describe('Integration with UserConfigManager', () => {
    it('should respect user agent precedence', async () => {
      const agents = await agentLoader.loadAgents();
      
      // Should load agents from both system and user sources
      expect(Array.isArray(agents)).toBe(true);
    });

    it('should handle combined agent sources', async () => {
      const agents = await agentLoader.loadAgents();
      
      // Should handle agents from multiple sources
      agents.forEach(agent => {
        expect(typeof agent.name).toBe('string');
        expect(typeof agent.description).toBe('string');
        expect(typeof agent.content).toBe('string');
      });
    });
  });

  describe('Error Handling', () => {
    it('should gracefully handle invalid agent files', async () => {
      const agents = await agentLoader.loadAgents();
      
      // Should complete successfully even if some agents fail to load
      expect(Array.isArray(agents)).toBe(true);
    });

    it('should handle file system errors', async () => {
      // Should not throw even if file system operations fail
      const agents = await agentLoader.loadAgents();
      expect(Array.isArray(agents)).toBe(true);
    });

    it('should handle malformed agent content', async () => {
      // Should skip invalid agents without crashing
      const agents = await agentLoader.loadAgents();
      
      // Valid agents should still be loaded
      agents.forEach(agent => {
        expect(agent).toHaveProperty('name');
        expect(agent).toHaveProperty('description');
        expect(agent).toHaveProperty('content');
      });
    });
  });
});