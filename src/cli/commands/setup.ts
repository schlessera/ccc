import * as p from '@clack/prompts';
import chalk from 'chalk';
import { StorageManager } from '../../core/storage/manager';
import { SymlinkManager } from '../../core/symlinks/manager';
import { TemplateLoader } from '../../core/templates/loader';
import { PathUtils } from '../../utils/paths';
import { getService, ServiceKeys } from '../../core/container';

interface SetupOptions {
  template?: string;
  name?: string;
  force?: boolean;
}

export async function setupCommand(options: SetupOptions): Promise<void> {
  // Start with a nice intro
  p.intro(chalk.cyan('🚀 Project Setup'));

  try {
    const projectPath = PathUtils.resolveProjectPath();
    const templateLoader = getService<TemplateLoader>(ServiceKeys.TemplateLoader);
    const storageManager = getService<StorageManager>(ServiceKeys.StorageManager);
    const symlinkManager = new SymlinkManager();

    // Step 1: Analyze project
    const s = p.spinner();
    s.start('Analyzing current project');
    
    const detectedType = await templateLoader.detectProjectType(projectPath);
    const templates = await templateLoader.loadTemplates();
    
    s.stop('Project analyzed');

    // Show project info as a note
    p.note(
      `Directory: ${chalk.blue(projectPath)}\nType: ${chalk.green(detectedType || 'Unknown')}`,
      'Project Details'
    );

    if (templates.length === 0) {
      p.cancel('No templates found. Please ensure templates are installed.');
      process.exit(1);
    }

    // Step 2: Template selection
    let selectedTemplate = options.template;
    let preserveExisting = false;
    
    if (!selectedTemplate) {
      const templateOptions = [
        ...templates.map(t => ({
          value: t.name,
          label: `${t.meta.icon} ${t.name}`,
          hint: t.meta.description,
        })),
        {
          value: 'preserve',
          label: '📌 Keep existing configuration',
          hint: 'Use current project setup without a template',
        },
      ];

      const templateChoice = await p.select({
        message: 'Select a template or keep existing',
        options: templateOptions,
        initialValue: detectedType,
      });

      if (p.isCancel(templateChoice)) {
        p.cancel('Setup cancelled');
        process.exit(0);
      }
      
      if (templateChoice === 'preserve') {
        preserveExisting = true;
        // Create a minimal template for existing projects
        selectedTemplate = 'custom';
      } else {
        selectedTemplate = templateChoice as string;
      }
    }

    const template = await templateLoader.getTemplate(selectedTemplate!);
    
    if (!template && !preserveExisting) {
      p.cancel(`Template not found: ${selectedTemplate}`);
      process.exit(1);
    }

    // Step 3: Project naming
    let projectName = options.name;
    
    if (!projectName) {
      const defaultName = projectPath.split('/').pop() || 'my-project';
      const nameInput = await p.text({
        message: 'Project name',
        placeholder: defaultName,
        defaultValue: defaultName,
        validate: (value) => {
          if (!value) return 'Project name is required';
          if (!/^[a-z0-9-]+$/.test(value)) {
            return 'Use lowercase letters, numbers, and hyphens only';
          }
          return undefined;
        },
      });

      if (p.isCancel(nameInput)) {
        p.cancel('Setup cancelled');
        process.exit(0);
      }
      
      projectName = nameInput as string;
    }

    // Step 4: Handle existing configuration
    const claudePath = `${projectPath}/.claude`;
    const claudeFilePath = `${projectPath}/CLAUDE.md`;
    const hasExisting = await PathUtils.exists(claudePath) || await PathUtils.exists(claudeFilePath);

    if (hasExisting && !options.force) {
      p.note(
        'Found existing configuration files.\nYour current setup will be affected.',
        chalk.yellow('⚠️  Existing Configuration')
      );
      
      const proceed = await p.select({
        message: 'How would you like to proceed?',
        options: [
          { 
            value: 'merge', 
            label: 'Smart merge',
            hint: 'Preserve your custom sections'
          },
          { 
            value: 'replace', 
            label: 'Backup and replace',
            hint: 'Save current config as backup'
          },
          { 
            value: 'cancel', 
            label: 'Cancel setup'
          },
        ],
      });

      if (p.isCancel(proceed) || proceed === 'cancel') {
        p.cancel('Setup cancelled');
        process.exit(0);
      }

      if (proceed === 'replace') {
        const backupSpinner = p.spinner();
        backupSpinner.start('Creating backup');
        await storageManager.createBackup(projectName!);
        backupSpinner.stop('Backup created');
      }
    }

    // Step 5: Setup project with a group of tasks
    const setupSpinner = p.spinner();
    
    setupSpinner.start('Creating storage directory');
    
    if (preserveExisting) {
      // Create storage with existing project files
      await storageManager.createProjectFromExisting(projectName!, projectPath);
    } else if (template) {
      // Create storage from template
      await storageManager.createProject(projectName!, template);
    }
    
    setupSpinner.stop('Storage created');
    
    setupSpinner.start('Creating symlinks');
    await symlinkManager.createProjectSymlinks(projectPath, projectName!);
    setupSpinner.stop('Symlinks created');

    // Success message with details
    const templateInfo = preserveExisting 
      ? 'Existing configuration preserved' 
      : `${template?.meta.icon} ${template?.name} v${template?.meta.version}`;
    
    p.note(
      [
        `Project: ${chalk.bold(projectName)}`,
        `Setup: ${templateInfo}`,
        `Storage: ${chalk.gray(PathUtils.getProjectStorageDir(projectName!))}`,
        '',
        'Files created:',
        `  ${chalk.green('✓')} .claude/`,
        `  ${chalk.green('✓')} CLAUDE.md`,
      ].join('\n'),
      chalk.green('✨ Setup Complete!')
    );

    // Next steps
    const nextSteps = [
      `Review ${chalk.cyan('CLAUDE.md')} for project guidelines`,
      `Run ${chalk.cyan('ccc add-agent')} to add AI agents`,
      `Customize ${chalk.cyan('.claude/settings.json')} as needed`,
    ];

    p.note(nextSteps.join('\n'), '💡 Next Steps');
    
    p.outro(chalk.green('Project configured successfully!'));

  } catch (error: any) {
    p.cancel(chalk.red(error.message));
    process.exit(1);
  }
}