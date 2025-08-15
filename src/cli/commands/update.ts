import * as p from '@clack/prompts';
import chalk from 'chalk';
import { StorageManager } from '../../core/storage/manager';
import { TemplateLoader } from '../../core/templates/loader';
import { PathUtils } from '../../utils/paths';

interface UpdateOptions {
  all?: boolean;
  project?: string;
  force?: boolean;
  preview?: boolean;
}

export async function updateCommand(options: UpdateOptions): Promise<void> {
  try {
    const currentPath = process.cwd();
    const isManaged = await PathUtils.isProjectManaged(currentPath);
    const storageManager = new StorageManager();
    const templateLoader = new TemplateLoader();

    if (options.all) {
      await updateAllProjects(storageManager, templateLoader, options);
    } else if (options.project) {
      await updateSpecificProject(options.project, storageManager, templateLoader, options);
    } else if (isManaged) {
      await updateCurrentProject(currentPath, storageManager, templateLoader, options);
    } else {
      p.cancel('Current directory is not CCC-managed. Use --project or --all flags.');
      process.exit(1);
    }

  } catch (error: any) {
    p.cancel(chalk.red(error.message));
    process.exit(1);
  }
}

async function updateCurrentProject(
  projectPath: string,
  storageManager: StorageManager,
  templateLoader: TemplateLoader,
  options: UpdateOptions
): Promise<void> {
  const projectName = await getProjectNameFromPath(projectPath, storageManager);
  
  if (!projectName) {
    p.cancel('Could not determine project name from current directory');
    process.exit(1);
  }

  const projectInfo = await storageManager.getProjectInfo(projectName);
  if (!projectInfo) {
    p.cancel(`Project info not found for: ${projectName}`);
    process.exit(1);
  }

  const template = await templateLoader.getTemplate(projectInfo.projectType);
  if (!template) {
    p.cancel(`Template not found: ${projectInfo.projectType}`);
    process.exit(1);
  }

  if (options.preview) {
    await previewUpdate(projectName, projectInfo, template);
    return;
  }

  if (!options.force) {
    const proceed = await p.confirm({
      message: `Update ${chalk.cyan(projectName)} from ${projectInfo.templateVersion} to ${template.meta.version}?`,
      initialValue: true
    });

    if (!proceed || p.isCancel(proceed)) {
      p.outro('Update cancelled');
      return;
    }
  }

  await performUpdate(projectName, projectInfo, template, storageManager);
}

async function updateAllProjects(
  storageManager: StorageManager,
  templateLoader: TemplateLoader,
  options: UpdateOptions
): Promise<void> {
  const projects = await storageManager.listProjects();
  
  if (projects.length === 0) {
    p.note('No projects to update', '📋 Empty Project List');
    return;
  }

  const updates = [];
  for (const project of projects) {
    const info = await storageManager.getProjectInfo(project);
    if (!info) continue;
    
    const template = await templateLoader.getTemplate(info.projectType);
    if (!template) continue;
    
    if (info.templateVersion !== template.meta.version) {
      updates.push({ project, info, template });
    }
  }

  if (updates.length === 0) {
    p.note('All projects are up to date', '✅ No Updates Needed');
    return;
  }

  if (options.preview) {
    for (const update of updates) {
      await previewUpdate(update.project, update.info, update.template);
    }
    return;
  }

  if (!options.force) {
    const proceed = await p.confirm({
      message: `Update ${updates.length} projects?`,
      initialValue: true
    });

    if (!proceed || p.isCancel(proceed)) {
      p.outro('Update cancelled');
      return;
    }
  }

  for (const update of updates) {
    await performUpdate(update.project, update.info, update.template, storageManager);
  }
}

async function updateSpecificProject(
  projectName: string,
  storageManager: StorageManager,
  templateLoader: TemplateLoader,
  options: UpdateOptions
): Promise<void> {
  const projectInfo = await storageManager.getProjectInfo(projectName);
  if (!projectInfo) {
    p.cancel(`Project not found: ${projectName}`);
    process.exit(1);
  }

  const template = await templateLoader.getTemplate(projectInfo.projectType);
  if (!template) {
    p.cancel(`Template not found: ${projectInfo.projectType}`);
    process.exit(1);
  }

  if (options.preview) {
    await previewUpdate(projectName, projectInfo, template);
    return;
  }

  if (!options.force) {
    const proceed = await p.confirm({
      message: `Update ${chalk.cyan(projectName)} from ${projectInfo.templateVersion} to ${template.meta.version}?`,
      initialValue: true
    });

    if (!proceed || p.isCancel(proceed)) {
      p.outro('Update cancelled');
      return;
    }
  }

  await performUpdate(projectName, projectInfo, template, storageManager);
}

async function previewUpdate(projectName: string, info: any, template: any): Promise<void> {
  const changes = [
    `Project: ${chalk.cyan(projectName)}`,
    `Current: ${info.templateVersion}`,
    `New: ${template.meta.version}`,
    `Template: ${template.name}`
  ];
  
  p.note(changes.join('\n'), '🔍 Preview Update');
}

async function performUpdate(
  projectName: string,
  _info: any,
  template: any,
  storageManager: StorageManager
): Promise<void> {
  const spinner = p.spinner();
  
  try {
    spinner.start(`Updating ${projectName}`);
    
    // Create backup before update
    await storageManager.createBackup(projectName);
    
    // Update template files (this would need to be implemented in StorageManager)
    await storageManager.updateProject(projectName, template);
    
    spinner.stop(`Updated ${projectName} to ${template.meta.version}`);
    
  } catch (error: any) {
    spinner.stop('Update failed');
    throw error;
  }
}

async function getProjectNameFromPath(projectPath: string, storageManager: StorageManager): Promise<string | null> {
  const projects = await storageManager.listProjects();
  
  for (const project of projects) {
    const info = await storageManager.getProjectInfo(project);
    if (info?.projectPath === projectPath) {
      return project;
    }
  }
  
  return null;
}