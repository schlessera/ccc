import * as p from '@clack/prompts';
import chalk from 'chalk';
import * as fs from 'fs-extra';
import * as path from 'path';
import { StorageManager } from '../../core/storage/manager';
import { SymlinkManager } from '../../core/symlinks/manager';
import { PathUtils } from '../../utils/paths';

interface ValidateOptions {
  project?: string;
  fix?: boolean;
}

interface ValidationIssue {
  type: 'error' | 'warning' | 'info';
  category: 'symlink' | 'storage' | 'template' | 'permission';
  message: string;
  path?: string;
  fixable?: boolean;
}

export async function validateCommand(options: ValidateOptions): Promise<void> {
  try {
    const storageManager = new StorageManager();
    const symlinkManager = new SymlinkManager();

    if (options.project) {
      await validateSpecificProject(options.project, storageManager, symlinkManager, options);
    } else {
      const currentPath = process.cwd();
      const isManaged = await PathUtils.isProjectManaged(currentPath);
      
      if (isManaged) {
        await validateCurrentProject(currentPath, storageManager, symlinkManager, options);
      } else {
        await validateAllProjects(storageManager, symlinkManager, options);
      }
    }

  } catch (error: any) {
    p.cancel(chalk.red(error.message));
    process.exit(1);
  }
}

async function validateCurrentProject(
  projectPath: string,
  storageManager: StorageManager,
  symlinkManager: SymlinkManager,
  options: ValidateOptions
): Promise<void> {
  const projectName = await getProjectNameFromPath(projectPath, storageManager);
  
  if (!projectName) {
    p.cancel('Could not determine project name from current directory');
    process.exit(1);
  }

  const issues = await validateSingleProject(projectName, projectPath, storageManager, symlinkManager);
  await displayValidationResults([{ name: projectName, path: projectPath, issues }], options);
}

async function validateSpecificProject(
  projectName: string,
  storageManager: StorageManager,
  symlinkManager: SymlinkManager,
  options: ValidateOptions
): Promise<void> {
  const projectInfo = await storageManager.getProjectInfo(projectName);
  if (!projectInfo) {
    p.cancel(`Project not found: ${projectName}`);
    process.exit(1);
  }

  const issues = await validateSingleProject(projectName, projectInfo.projectPath, storageManager, symlinkManager);
  await displayValidationResults([{ name: projectName, path: projectInfo.projectPath, issues }], options);
}

async function validateAllProjects(
  storageManager: StorageManager,
  symlinkManager: SymlinkManager,
  options: ValidateOptions
): Promise<void> {
  const projects = await storageManager.listProjects();
  
  if (projects.length === 0) {
    p.note('No projects to validate', '📋 Empty Project List');
    return;
  }

  const results = [];
  const spinner = p.spinner();
  
  for (const project of projects) {
    spinner.start(`Validating ${project}`);
    
    const projectInfo = await storageManager.getProjectInfo(project);
    if (!projectInfo) {
      // Project exists in storage but has no project info - this is an issue
      const issues: ValidationIssue[] = [{
        type: 'error',
        category: 'storage',
        message: 'Missing .project-info file',
        path: PathUtils.getProjectStorageDir(project),
        fixable: false
      }];
      
      results.push({ name: project, path: 'Unknown', issues });
      spinner.stop(`Validated ${project} (storage issues found)`);
      continue;
    }
    
    const issues = await validateSingleProject(project, projectInfo.projectPath, storageManager, symlinkManager);
    results.push({ name: project, path: projectInfo.projectPath, issues });
    
    spinner.stop(`Validated ${project}`);
  }

  await displayValidationResults(results, options);
}

async function validateSingleProject(
  projectName: string,
  projectPath: string,
  _storageManager: StorageManager,
  symlinkManager: SymlinkManager
): Promise<ValidationIssue[]> {
  const issues: ValidationIssue[] = [];
  
  // Check if project path exists
  if (!await PathUtils.exists(projectPath)) {
    issues.push({
      type: 'error',
      category: 'storage',
      message: 'Project path does not exist',
      path: projectPath,
      fixable: false
    });
    return issues; // Can't continue without project path
  }

  // Check storage directory
  const storageDir = PathUtils.getProjectStorageDir(projectName);
  if (!await PathUtils.exists(storageDir)) {
    issues.push({
      type: 'error',
      category: 'storage',
      message: 'Storage directory missing',
      path: storageDir,
      fixable: true
    });
  }

  // Check symlinks
  const claudeDir = path.join(projectPath, '.claude');
  const claudeFile = path.join(projectPath, 'CLAUDE.md');

  // Check .claude directory symlink
  if (!await PathUtils.exists(claudeDir)) {
    issues.push({
      type: 'error',
      category: 'symlink',
      message: '.claude directory missing',
      path: claudeDir,
      fixable: true
    });
  } else {
    const symlinkValid = await symlinkManager.validateSymlinks(projectPath);
    if (!symlinkValid) {
      issues.push({
        type: 'error',
        category: 'symlink',
        message: '.claude symlink is broken or invalid',
        path: claudeDir,
        fixable: true
      });
    }
  }

  // Check CLAUDE.md symlink
  if (!await PathUtils.exists(claudeFile)) {
    issues.push({
      type: 'error',
      category: 'symlink',
      message: 'CLAUDE.md file missing',
      path: claudeFile,
      fixable: true
    });
  }

  // Check essential files in storage
  const essentialFiles = ['settings.json'];
  for (const file of essentialFiles) {
    const filePath = path.join(storageDir, file);
    if (!await PathUtils.exists(filePath)) {
      issues.push({
        type: 'warning',
        category: 'template',
        message: `Essential file missing: ${file}`,
        path: filePath,
        fixable: true
      });
    }
  }

  // Check permissions
  try {
    await fs.access(storageDir, fs.constants.R_OK | fs.constants.W_OK);
  } catch {
    issues.push({
      type: 'error',
      category: 'permission',
      message: 'No read/write access to storage directory',
      path: storageDir,
      fixable: false
    });
  }

  return issues;
}

async function displayValidationResults(
  results: Array<{ name: string; path: string; issues: ValidationIssue[] }>,
  options: ValidateOptions
): Promise<void> {
  let totalIssues = 0;
  let fixableIssues = 0;
  
  for (const result of results) {
    totalIssues += result.issues.length;
    fixableIssues += result.issues.filter(i => i.fixable).length;

    if (result.issues.length === 0) {
      p.note(`${chalk.green('✅')} All checks passed`, chalk.cyan(result.name));
    } else {
      const issueLines = result.issues.map(issue => {
        const icon = issue.type === 'error' ? '❌' : issue.type === 'warning' ? '⚠️' : 'ℹ️';
        const fixable = issue.fixable ? chalk.gray(' (fixable)') : '';
        return `${icon} ${issue.message}${fixable}`;
      });
      
      p.note(issueLines.join('\n'), `${chalk.red('Issues:')} ${result.name}`);
    }
  }

  // Summary
  const summaryLines = [
    `Projects validated: ${results.length}`,
    `Total issues: ${totalIssues}`,
    `Fixable issues: ${fixableIssues}`
  ];

  if (totalIssues === 0) {
    p.note(summaryLines.join('\n'), chalk.green('✅ Validation Complete'));
  } else {
    p.note(summaryLines.join('\n'), chalk.yellow('⚠️ Validation Summary'));
    
    if (fixableIssues > 0 && options.fix) {
      const fix = await p.confirm({
        message: `Attempt to fix ${fixableIssues} fixable issues?`,
        initialValue: true
      });

      if (fix && !p.isCancel(fix)) {
        await fixIssues(results);
      }
    } else if (fixableIssues > 0) {
      p.note(`Run with --fix flag to attempt automatic repairs`, '💡 Tip');
    }
  }
}

async function fixIssues(results: Array<{ name: string; path: string; issues: ValidationIssue[] }>): Promise<void> {
  const spinner = p.spinner();
  let fixed = 0;

  for (const result of results) {
    const fixableIssues = result.issues.filter(i => i.fixable);
    
    for (const issue of fixableIssues) {
      spinner.start(`Fixing: ${issue.message}`);
      
      try {
        // Implement specific fixes based on issue type
        switch (issue.category) {
          case 'symlink':
            await fixSymlinkIssue(result.name, result.path, issue);
            break;
          case 'storage':
            await fixStorageIssue(result.name, issue);
            break;
          case 'template':
            await fixTemplateIssue(result.name, issue);
            break;
        }
        
        fixed++;
        spinner.stop(`Fixed: ${issue.message}`);
        
      } catch (error: any) {
        spinner.stop(`Failed to fix: ${issue.message}`);
      }
    }
  }

  p.note(`Fixed ${fixed} issues`, chalk.green('🔧 Repair Complete'));
}

async function fixSymlinkIssue(projectName: string, projectPath: string, issue: ValidationIssue): Promise<void> {
  const symlinkManager = new SymlinkManager();
  
  if (issue.message.includes('.claude') || issue.message.includes('CLAUDE.md')) {
    // Recreate symlinks
    await symlinkManager.createProjectSymlinks(projectPath, projectName);
  }
}

async function fixStorageIssue(projectName: string, issue: ValidationIssue): Promise<void> {
  const storageDir = PathUtils.getProjectStorageDir(projectName);
  
  if (issue.message.includes('missing')) {
    await PathUtils.ensureDir(storageDir);
  }
}

async function fixTemplateIssue(projectName: string, issue: ValidationIssue): Promise<void> {
  const storageDir = PathUtils.getProjectStorageDir(projectName);
  
  if (issue.message.includes('settings.json')) {
    const settingsPath = path.join(storageDir, 'settings.json');
    const defaultSettings = {
      version: "1.0.0",
      created: new Date().toISOString()
    };
    
    await fs.writeJSON(settingsPath, defaultSettings, { spaces: 2 });
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