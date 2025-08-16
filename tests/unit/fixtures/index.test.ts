import { TestFixtures } from '../../fixtures';

describe('TestFixtures', () => {
  describe('createTemplate', () => {
    it('should create a default template', () => {
      const template = TestFixtures.createTemplate();
      
      expect(template).toHaveProperty('name');
      expect(template).toHaveProperty('path');
      expect(template).toHaveProperty('meta');
      expect(template).toHaveProperty('files');
      
      expect(template.name).toBe('test-template');
      expect(template.path).toBe('/test/templates/test-template');
      expect(Array.isArray(template.files)).toBe(true);
    });

    it('should accept overrides', () => {
      const overrides = {
        name: 'custom-template',
        path: '/custom/path',
        meta: {
          displayName: 'Custom Template',
          version: '2.0.0',
          description: 'Custom description',
          icon: '⚡',
          category: 'custom'
        }
      };
      
      const template = TestFixtures.createTemplate(overrides);
      
      expect(template.name).toBe('custom-template');
      expect(template.path).toBe('/custom/path');
      expect(template.meta.displayName).toBe('Custom Template');
      expect(template.meta.version).toBe('2.0.0');
      expect(template.meta.icon).toBe('⚡');
    });

    it('should have valid meta properties', () => {
      const template = TestFixtures.createTemplate();
      
      expect(template.meta).toHaveProperty('displayName');
      expect(template.meta).toHaveProperty('version');
      expect(template.meta).toHaveProperty('description');
      expect(template.meta).toHaveProperty('icon');
      expect(template.meta).toHaveProperty('category');
      
      expect(typeof template.meta.displayName).toBe('string');
      expect(typeof template.meta.version).toBe('string');
      expect(typeof template.meta.description).toBe('string');
      expect(typeof template.meta.icon).toBe('string');
      expect(typeof template.meta.category).toBe('string');
    });

    it('should preserve unoverridden properties', () => {
      const template = TestFixtures.createTemplate({
        name: 'partial-override'
      });
      
      // Should have the overridden property
      expect(template.name).toBe('partial-override');
      
      // Should preserve default properties
      expect(template.path).toBe('/test/templates/test-template');
      expect(template.meta.version).toBe('1.0.0');
      expect(template.meta.icon).toBe('🧪');
    });
  });

  describe('createAgent', () => {
    it('should create a default agent', () => {
      const agent = TestFixtures.createAgent();
      
      expect(agent).toHaveProperty('name');
      expect(agent).toHaveProperty('description');
      expect(agent).toHaveProperty('content');
      expect(agent).toHaveProperty('model');
      
      expect(agent.name).toBe('test-agent');
      expect(agent.model).toBe('claude-3-sonnet-20241022');
      expect(typeof agent.description).toBe('string');
      expect(typeof agent.content).toBe('string');
    });

    it('should accept overrides', () => {
      const overrides = {
        name: 'custom-agent',
        description: 'Custom agent description',
        content: 'Custom agent instructions',
        model: 'claude-3-opus-20240229'
      };
      
      const agent = TestFixtures.createAgent(overrides);
      
      expect(agent.name).toBe('custom-agent');
      expect(agent.description).toBe('Custom agent description');
      expect(agent.content).toBe('Custom agent instructions');
      expect(agent.model).toBe('claude-3-opus-20240229');
    });

    it('should have valid agent properties', () => {
      const agent = TestFixtures.createAgent();
      
      expect(agent.name).toBeTruthy();
      expect(agent.description).toBeTruthy();
      expect(agent.content).toBeTruthy();
      expect(agent.model).toBeTruthy();
      
      expect(agent.content).toContain('assistant');
      expect(agent.model).toMatch(/claude/);
    });
  });

  describe('createProjectInfo', () => {
    it('should create default project info', () => {
      const projectInfo = TestFixtures.createProjectInfo();
      
      expect(projectInfo).toHaveProperty('projectName');
      expect(projectInfo).toHaveProperty('projectPath');
      expect(projectInfo).toHaveProperty('projectType');
      expect(projectInfo).toHaveProperty('templateVersion');
      expect(projectInfo).toHaveProperty('setupDate');
      expect(projectInfo).toHaveProperty('lastUpdate');
      
      expect(projectInfo.projectName).toBe('test-project');
      expect(projectInfo.projectType).toBe('test-template');
      expect(projectInfo.templateVersion).toBe('1.0.0');
    });

    it('should accept overrides', () => {
      const overrides = {
        projectName: 'custom-project',
        projectPath: '/custom/project/path',
        projectType: 'custom-template',
        templateVersion: '2.0.0'
      };
      
      const projectInfo = TestFixtures.createProjectInfo(overrides);
      
      expect(projectInfo.projectName).toBe('custom-project');
      expect(projectInfo.projectPath).toBe('/custom/project/path');
      expect(projectInfo.projectType).toBe('custom-template');
      expect(projectInfo.templateVersion).toBe('2.0.0');
    });

    it('should have valid date formats', () => {
      const projectInfo = TestFixtures.createProjectInfo();
      
      expect(typeof projectInfo.setupDate).toBe('string');
      expect(typeof projectInfo.lastUpdate).toBe('string');
      
      // Should be valid ISO date strings
      expect(new Date(projectInfo.setupDate).toISOString()).toBe(projectInfo.setupDate);
      expect(new Date(projectInfo.lastUpdate).toISOString()).toBe(projectInfo.lastUpdate);
    });
  });

  describe('createProjectFiles', () => {
    it('should create project file structure', () => {
      const files = TestFixtures.createProjectFiles();
      
      expect(typeof files).toBe('object');
      expect(Object.keys(files).length).toBeGreaterThan(0);
      
      // Should have CLAUDE.md
      expect('test-project/CLAUDE.md' in files).toBe(true);
      expect(files['test-project/CLAUDE.md']).toContain('# test-project');
      
      // Should have settings.json
      expect('test-project/.claude/settings.json' in files).toBe(true);
      const settings = JSON.parse(files['test-project/.claude/settings.json']);
      expect(settings).toHaveProperty('permissions');
      expect(settings).toHaveProperty('env');
    });

    it('should accept custom project name', () => {
      const customName = 'my-custom-project';
      const files = TestFixtures.createProjectFiles(customName);
      
      expect(`${customName}/CLAUDE.md` in files).toBe(true);
      expect(`${customName}/.claude/settings.json` in files).toBe(true);
      expect(files[`${customName}/CLAUDE.md`]).toContain(`# ${customName}`);
    });

    it('should create valid JSON files', () => {
      const files = TestFixtures.createProjectFiles();
      
      const jsonFiles = Object.keys(files).filter(key => key.endsWith('.json'));
      
      jsonFiles.forEach(file => {
        expect(() => {
          JSON.parse(files[file]);
        }).not.toThrow();
      });
    });
  });

  describe('createTemplateFiles', () => {
    it('should create template file structure', () => {
      const files = TestFixtures.createTemplateFiles();
      
      expect(typeof files).toBe('object');
      expect(Object.keys(files).length).toBeGreaterThan(0);
      
      // Should have CLAUDE.md
      expect('templates/test-template/CLAUDE.md' in files).toBe(true);
      
      // Should have package.json
      expect('templates/test-template/package.json' in files).toBe(true);
      
      // Should have template.json
      expect('templates/test-template/template.json' in files).toBe(true);
    });

    it('should accept custom template name', () => {
      const customName = 'my-custom-template';
      const files = TestFixtures.createTemplateFiles(customName);
      
      expect(`templates/${customName}/CLAUDE.md` in files).toBe(true);
      expect(`templates/${customName}/package.json` in files).toBe(true);
      
      const packageJson = JSON.parse(files[`templates/${customName}/package.json`]);
      expect(packageJson.name).toBe(customName);
    });

    it('should create valid configuration files', () => {
      const files = TestFixtures.createTemplateFiles();
      
      // Validate settings.json
      const settings = JSON.parse(files['templates/test-template/.claude/settings.json']);
      expect(settings).toHaveProperty('permissions');
      expect(settings.permissions).toHaveProperty('allow');
      expect(settings.permissions).toHaveProperty('deny');
      expect(Array.isArray(settings.permissions.allow)).toBe(true);
      expect(Array.isArray(settings.permissions.deny)).toBe(true);
      
      // Validate template.json
      const template = JSON.parse(files['templates/test-template/template.json']);
      expect(template).toHaveProperty('name');
      expect(template).toHaveProperty('version');
      expect(template).toHaveProperty('description');
    });
  });

  describe('createUserConfigFiles', () => {
    it('should create user config structure', () => {
      const files = TestFixtures.createUserConfigFiles();
      
      expect(typeof files).toBe('object');
      expect(Object.keys(files).length).toBeGreaterThan(0);
      
      // Should have config.json
      expect('.ccc/config.json' in files).toBe(true);
      
      // Should have test fixtures for agents, commands, hooks
      expect('.ccc/agents/test-agent/agent.md' in files).toBe(true);
      expect('.ccc/commands/test-command/command.md' in files).toBe(true);
      expect('.ccc/hooks/test-hook/settings.json' in files).toBe(true);
    });

    it('should create valid configuration files', () => {
      const files = TestFixtures.createUserConfigFiles();
      
      // Validate config.json
      const config = JSON.parse(files['.ccc/config.json']);
      expect(config).toHaveProperty('defaultTemplate');
      expect(config).toHaveProperty('autoUpdate');
      
      // Validate hook settings
      const hookSettings = JSON.parse(files['.ccc/hooks/test-hook/settings.json']);
      expect(hookSettings).toHaveProperty('name');
      expect(hookSettings).toHaveProperty('eventType');
      expect(hookSettings).toHaveProperty('command');
    });

    it('should create markdown files with frontmatter', () => {
      const files = TestFixtures.createUserConfigFiles();
      
      const agentMd = files['.ccc/agents/test-agent/agent.md'];
      expect(agentMd).toContain('---');
      expect(agentMd).toContain('name:');
      expect(agentMd).toContain('description:');
      
      const commandMd = files['.ccc/commands/test-command/command.md'];
      expect(commandMd).toContain('# Test Command');
      expect(commandMd).toContain('{$ARGUMENTS}');
    });
  });

  describe('Utility Methods', () => {
    describe('randomProjectName', () => {
      it('should generate random project names', () => {
        const name1 = TestFixtures.randomProjectName();
        const name2 = TestFixtures.randomProjectName();
        
        expect(typeof name1).toBe('string');
        expect(typeof name2).toBe('string');
        expect(name1).not.toBe(name2);
        expect(name1).toMatch(/^test-project-[a-z0-9]+$/);
        expect(name2).toMatch(/^test-project-[a-z0-9]+$/);
      });

      it('should generate unique names', () => {
        const names = new Set();
        
        for (let i = 0; i < 10; i++) {
          names.add(TestFixtures.randomProjectName());
        }
        
        expect(names.size).toBe(10); // All should be unique
      });
    });

    describe('randomTemplateName', () => {
      it('should generate random template names', () => {
        const name1 = TestFixtures.randomTemplateName();
        const name2 = TestFixtures.randomTemplateName();
        
        expect(typeof name1).toBe('string');
        expect(typeof name2).toBe('string');
        expect(name1).not.toBe(name2);
        expect(name1).toMatch(/^test-template-[a-z0-9]+$/);
        expect(name2).toMatch(/^test-template-[a-z0-9]+$/);
      });

      it('should generate unique names', () => {
        const names = new Set();
        
        for (let i = 0; i < 10; i++) {
          names.add(TestFixtures.randomTemplateName());
        }
        
        expect(names.size).toBe(10); // All should be unique
      });
    });
  });

  describe('Integration', () => {
    it('should work together for complete test setup', () => {
      const projectName = TestFixtures.randomProjectName();
      const templateName = TestFixtures.randomTemplateName();
      
      const template = TestFixtures.createTemplate({
        name: templateName,
        path: `/templates/${templateName}`
      });
      
      const projectInfo = TestFixtures.createProjectInfo({
        projectName: projectName,
        projectType: templateName
      });
      
      const projectFiles = TestFixtures.createProjectFiles(projectName);
      const templateFiles = TestFixtures.createTemplateFiles(templateName);
      
      // All should be consistent
      expect(template.name).toBe(templateName);
      expect(projectInfo.projectName).toBe(projectName);
      expect(projectInfo.projectType).toBe(templateName);
      expect(`${projectName}/CLAUDE.md` in projectFiles).toBe(true);
      expect(`templates/${templateName}/CLAUDE.md` in templateFiles).toBe(true);
    });

    it('should support complex test scenarios', () => {
      const agent = TestFixtures.createAgent({
        name: 'scenario-agent',
        model: 'claude-3-haiku-20240307'
      });
      
      const template = TestFixtures.createTemplate({
        name: 'scenario-template',
        meta: {
          displayName: 'Scenario Template',
          version: '1.5.0',
          description: 'A template for testing scenarios',
          icon: '🎯',
          category: 'testing'
        }
      });
      
      const projectInfo = TestFixtures.createProjectInfo({
        projectName: 'scenario-project',
        projectType: template.name,
        templateVersion: template.meta.version
      });
      
      expect(agent.name).toBe('scenario-agent');
      expect(template.name).toBe('scenario-template');
      expect(projectInfo.projectType).toBe(template.name);
      expect(projectInfo.templateVersion).toBe(template.meta.version);
    });
  });
});