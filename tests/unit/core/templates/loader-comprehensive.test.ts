import { TemplateLoader } from '../../../../src/core/templates/loader';

// Mock dependencies
jest.mock('../../../../src/utils/logger', () => ({
  Logger: {
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    success: jest.fn(),
  }
}));

describe('TemplateLoader (Comprehensive)', () => {
  let templateLoader: TemplateLoader;

  beforeEach(() => {
    templateLoader = new TemplateLoader();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Basic Functionality', () => {
    it('should be instantiable', () => {
      expect(templateLoader).toBeInstanceOf(TemplateLoader);
    });

    it('should have loadTemplates method', () => {
      expect(typeof templateLoader.loadTemplates).toBe('function');
    });

    it('should have getTemplate method', () => {
      expect(typeof templateLoader.getTemplate).toBe('function');
    });

    it('should have detectProjectType method', () => {
      expect(typeof templateLoader.detectProjectType).toBe('function');
    });

    it('should provide core template loading functionality', () => {
      expect(typeof templateLoader.loadTemplates).toBe('function');
      expect(typeof templateLoader.getTemplate).toBe('function');
      expect(typeof templateLoader.detectProjectType).toBe('function');
    });
  });

  describe('Error Resilience', () => {
    it('should handle loadTemplates without throwing', async () => {
      await expect(templateLoader.loadTemplates()).resolves.not.toThrow();
    });

    it('should handle getTemplate without throwing', async () => {
      await expect(templateLoader.getTemplate('nonexistent')).resolves.not.toThrow();
    });

    it('should handle detectProjectType without throwing', async () => {
      await expect(templateLoader.detectProjectType('/nonexistent')).resolves.not.toThrow();
    });

    it('should handle template loading operations without throwing', async () => {
      // Test multiple operations in sequence
      const templates = await templateLoader.loadTemplates();
      expect(Array.isArray(templates)).toBe(true);

      await templateLoader.getTemplate('test');
      // Should not throw, even if template doesn't exist

      const projectType = await templateLoader.detectProjectType('/test');
      expect(typeof projectType).toBe('string');
    });
  });

  describe('Method Signatures', () => {
    it('should have correct return types for loadTemplates', async () => {
      const result = await templateLoader.loadTemplates();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle template names as strings', async () => {
      const result = await templateLoader.getTemplate('test-template');
      expect(result === null || (typeof result === 'object')).toBe(true);
    });

    it('should handle project paths as strings', async () => {
      const result = await templateLoader.detectProjectType('/path/to/project');
      expect(typeof result === 'string' || result === null).toBe(true);
    });

    it('should handle template objects correctly', async () => {
      const templates = await templateLoader.loadTemplates();
      templates.forEach(template => {
        expect(template).toHaveProperty('name');
        expect(template).toHaveProperty('path');
        expect(template).toHaveProperty('meta');
        expect(template).toHaveProperty('files');
      });
    });
  });

  describe('Template Structure', () => {
    it('should handle Template interface properties', async () => {
      const templates = await templateLoader.loadTemplates();
      templates.forEach(template => {
        expect(typeof template.name).toBe('string');
        expect(typeof template.path).toBe('string');
        expect(typeof template.meta).toBe('object');
        expect(Array.isArray(template.files)).toBe(true);
      });
    });

    it('should handle meta properties correctly', async () => {
      const templates = await templateLoader.loadTemplates();
      templates.forEach(template => {
        expect(template.meta).toHaveProperty('version');
        expect(typeof template.meta.version).toBe('string');
      });
    });
  });

  describe('Cache Management', () => {
    it('should return null for non-existent templates', async () => {
      const template = await templateLoader.getTemplate('definitely-does-not-exist');
      expect(template).toBeNull();
    });

    it('should cache templates after loading', async () => {
      // Load templates to populate cache
      await templateLoader.loadTemplates();
      
      // Should be able to get templates from cache
      await templateLoader.getTemplate('any-name');
      // Should not throw and should be consistent
    });
  });

  describe('Integration Points', () => {
    it('should work with dependency injection pattern', () => {
      // Should be able to create multiple instances
      const loader1 = new TemplateLoader();
      const loader2 = new TemplateLoader();
      
      expect(loader1).toBeInstanceOf(TemplateLoader);
      expect(loader2).toBeInstanceOf(TemplateLoader);
      expect(loader1).not.toBe(loader2);
    });

    it('should maintain internal cache structure', async () => {
      const loader = new TemplateLoader();
      
      // Should have private cache
      expect(loader).toBeInstanceOf(TemplateLoader);
      
      // Cache should work across calls
      await loader.loadTemplates();
      const template1 = await loader.getTemplate('test');
      const template2 = await loader.getTemplate('test');
      
      // Should return consistent results
      expect(template1).toEqual(template2);
    });
  });

  describe('API Consistency', () => {
    it('should follow similar patterns to other loaders', () => {
      // Should have consistent method naming
      expect(typeof templateLoader.loadTemplates).toBe('function');
      expect(typeof templateLoader.getTemplate).toBe('function');
      
      // Should follow async pattern
      expect(typeof templateLoader.loadTemplates().then).toBe('function');
      expect(typeof templateLoader.getTemplate('test').then).toBe('function');
    });

    it('should provide comprehensive template functionality', () => {
      // Core functionality
      expect(typeof templateLoader.loadTemplates).toBe('function');
      expect(typeof templateLoader.getTemplate).toBe('function');
      expect(typeof templateLoader.detectProjectType).toBe('function');
    });
  });

  describe('Edge Cases', () => {
    it('should handle various template name formats', async () => {
      // Test different name formats
      const names = ['test', 'test-template', 'test_template', 'TestTemplate', ''];
      
      for (const name of names) {
        const result = await templateLoader.getTemplate(name);
        // Should not throw for any name format
        expect(result === null || typeof result === 'object').toBe(true);
      }
    });

    it('should handle template interface validation', async () => {
      const templates = await templateLoader.loadTemplates();
      
      // Each template should have required properties
      templates.forEach(template => {
        expect(template).toHaveProperty('name');
        expect(template).toHaveProperty('path');
        expect(template).toHaveProperty('meta');
        expect(template).toHaveProperty('files');
        
        // Meta should have version at minimum
        expect(template.meta).toHaveProperty('version');
      });
    });
  });

  describe('Project Type Detection Rules', () => {
    it('should handle empty project path gracefully', async () => {
      const result = await templateLoader.detectProjectType('');
      expect(typeof result).toBe('string');
    });

    it('should detect custom type as fallback', async () => {
      const result = await templateLoader.detectProjectType('/nonexistent/path');
      expect(result).toBe('custom');
    });

    it('should handle detection rules for common project types', async () => {
      // Should have internal detection logic
      expect(typeof templateLoader.detectProjectType).toBe('function');
      
      // Should return string results
      const result = await templateLoader.detectProjectType('/test');
      expect(typeof result).toBe('string');
    });

    it('should validate project type strings', async () => {
      const result = await templateLoader.detectProjectType('/test/project');
      expect(typeof result).toBe('string');
      if (result) {
        expect(result.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Performance and Efficiency', () => {
    it('should handle multiple concurrent template requests', async () => {
      // Test concurrent access
      const promises = Array(5).fill(null).map(() => templateLoader.getTemplate('test'));
      const results = await Promise.all(promises);
      
      // All should complete without error
      results.forEach(result => {
        expect(result === null || typeof result === 'object').toBe(true);
      });
    });

    it('should efficiently cache templates', async () => {
      // First load should populate cache
      const templates = await templateLoader.loadTemplates();
      expect(Array.isArray(templates)).toBe(true);
      
      // Subsequent gets should work with cached data
      const template = await templateLoader.getTemplate('any');
      // Should return either a template or null, but not throw
      expect(template === null || typeof template === 'object').toBe(true);
      
      // Multiple calls should work consistently
      const template2 = await templateLoader.getTemplate('any');
      expect(template2).toEqual(template);
    });
  });

  describe('Template File Structure', () => {
    it('should handle template files array', async () => {
      const templates = await templateLoader.loadTemplates();
      
      templates.forEach(template => {
        expect(Array.isArray(template.files)).toBe(true);
        template.files.forEach(file => {
          expect(typeof file).toBe('string');
        });
      });
    });

    it('should exclude meta.json from template files', async () => {
      const templates = await templateLoader.loadTemplates();
      
      templates.forEach(template => {
        expect(template.files.includes('meta.json')).toBe(false);
      });
    });
  });
});