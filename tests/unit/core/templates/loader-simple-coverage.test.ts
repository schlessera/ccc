import { TemplateLoader } from '../../../../src/core/templates/loader';

describe('TemplateLoader - Simple Coverage Boost', () => {
  let loader: TemplateLoader;

  beforeEach(() => {
    loader = new TemplateLoader();
  });

  it('should handle template operations without complex mocking', async () => {
    // Simple test that just exercises the basic functionality
    // This should provide some additional coverage without complex mocking
    
    const templates = await loader.loadTemplates();
    expect(Array.isArray(templates)).toBe(true);
    
    const template = await loader.getTemplate('nonexistent');
    expect(template).toBe(null);
    
    const projectType = await loader.detectProjectType(process.cwd());
    expect(typeof projectType).toBe('string');
  });
});