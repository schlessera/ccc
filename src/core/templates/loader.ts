import * as fs from 'fs-extra';
import * as path from 'path';
import { PathUtils } from '../../utils/paths';
import { Template, TemplateMeta } from '../../types/template';
import { Logger } from '../../utils/logger';

export class TemplateLoader {
  private templatesCache: Map<string, Template> = new Map();

  async loadTemplates(): Promise<Template[]> {
    const templates: Template[] = [];
    
    // Load from built-in templates directory
    const builtInDir = path.join(__dirname, '../../../templates');
    if (await PathUtils.exists(builtInDir)) {
      const builtInTemplates = await this.loadTemplatesFromDir(builtInDir);
      templates.push(...builtInTemplates);
    }
    
    // Load from user templates directory
    const userDir = PathUtils.getTemplatesDir();
    if (await PathUtils.exists(userDir)) {
      const userTemplates = await this.loadTemplatesFromDir(userDir);
      templates.push(...userTemplates);
    }
    
    // Cache templates
    templates.forEach(template => {
      this.templatesCache.set(template.name, template);
    });
    
    Logger.debug(`Loaded ${templates.length} templates`);
    return templates;
  }

  async getTemplate(name: string): Promise<Template | null> {
    if (!this.templatesCache.has(name)) {
      await this.loadTemplates();
    }
    
    return this.templatesCache.get(name) || null;
  }

  async detectProjectType(projectPath: string): Promise<string | null> {
    const detectionRules = [
      {
        files: ['package.json', 'tsconfig.json'],
        hasAny: ['react', 'vue', 'angular'],
        template: 'web-dev'
      },
      {
        files: ['package.json'],
        hasAny: ['express', 'fastify', 'koa'],
        template: 'engineering'
      },
      {
        files: ['requirements.txt', 'setup.py', 'pyproject.toml'],
        template: 'data-science'
      },
      {
        files: ['Dockerfile', 'docker-compose.yml', 'kubernetes.yml'],
        template: 'devops'
      },
      {
        files: ['Gemfile', 'Rakefile'],
        template: 'engineering'
      },
      {
        files: ['go.mod', 'go.sum'],
        template: 'engineering'
      },
      {
        files: ['Cargo.toml'],
        template: 'engineering'
      }
    ];
    
    for (const rule of detectionRules) {
      const hasRequiredFiles = await this.hasFiles(projectPath, rule.files);
      
      if (hasRequiredFiles) {
        if (rule.hasAny) {
          const packageJson = path.join(projectPath, 'package.json');
          if (await PathUtils.exists(packageJson)) {
            const content = await fs.readFile(packageJson, 'utf-8');
            const hasPackage = rule.hasAny.some(pkg => content.includes(pkg));
            if (hasPackage) {
              return rule.template;
            }
          }
        } else {
          return rule.template;
        }
      }
    }
    
    // Default to custom template
    return 'custom';
  }

  private async loadTemplatesFromDir(dir: string): Promise<Template[]> {
    const templates: Template[] = [];
    const entries = await fs.readdir(dir);
    
    for (const entry of entries) {
      const templatePath = path.join(dir, entry);
      const stat = await fs.stat(templatePath);
      
      if (stat.isDirectory()) {
        const template = await this.loadTemplate(entry, templatePath);
        if (template) {
          templates.push(template);
        }
      }
    }
    
    return templates;
  }

  private async loadTemplate(name: string, templatePath: string): Promise<Template | null> {
    const metaPath = path.join(templatePath, 'meta.json');
    
    if (!await PathUtils.exists(metaPath)) {
      Logger.warn(`Template ${name} missing meta.json`);
      return null;
    }
    
    try {
      const metaContent = await fs.readFile(metaPath, 'utf-8');
      const meta: TemplateMeta = JSON.parse(metaContent);
      
      const files = await this.getTemplateFiles(templatePath);
      
      return {
        name,
        path: templatePath,
        meta,
        files
      };
    } catch (error) {
      Logger.error(`Failed to load template ${name}: ${error}`);
      return null;
    }
  }

  private async getTemplateFiles(templatePath: string): Promise<string[]> {
    const files: string[] = [];
    
    const walk = async (dir: string, base = ''): Promise<void> => {
      const entries = await fs.readdir(dir);
      
      for (const entry of entries) {
        if (entry === 'meta.json') continue;
        
        const fullPath = path.join(dir, entry);
        const relativePath = path.join(base, entry);
        const stat = await fs.stat(fullPath);
        
        if (stat.isDirectory()) {
          await walk(fullPath, relativePath);
        } else {
          files.push(relativePath);
        }
      }
    };
    
    await walk(templatePath);
    return files;
  }

  private async hasFiles(projectPath: string, files: string[]): Promise<boolean> {
    for (const file of files) {
      const filePath = path.join(projectPath, file);
      if (await PathUtils.exists(filePath)) {
        return true;
      }
    }
    
    return false;
  }
}