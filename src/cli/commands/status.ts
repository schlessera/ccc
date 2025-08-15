import * as path from 'path';
import chalk from 'chalk';
import * as p from '@clack/prompts';
import { PathUtils } from '../../utils/paths';
import { SymlinkManager } from '../../core/symlinks/manager';
import { StorageManager } from '../../core/storage/manager';

interface StatusOptions {
  project?: string;
}

export async function statusCommand(options: StatusOptions): Promise<void> {
  if (options.project) {
    await showProjectStatus(options.project);
  } else {
    await showCurrentDirectoryStatus();
  }
}

async function showCurrentDirectoryStatus(): Promise<void> {
  const currentPath = process.cwd();
  const projectName = path.basename(currentPath);
  const isManaged = await PathUtils.isProjectManaged();
  
  if (isManaged) {
    // Check symlink health
    const symlinkManager = new SymlinkManager();
    const symlinkValid = await symlinkManager.validateSymlinks(currentPath);
    
    // Show symlink targets
    const claudeDir = path.join(currentPath, '.claude');
    const claudeFile = path.join(currentPath, 'CLAUDE.md');
    
    const claudeDirTarget = await symlinkManager.getSymlinkTarget(claudeDir);
    const claudeFileTarget = await symlinkManager.getSymlinkTarget(claudeFile);
    
    const statusInfo = [
      `${chalk.bold('Project:')} ${projectName}`,
      `${chalk.bold('Path:')} ${chalk.gray(currentPath)}`,
      `${chalk.bold('Status:')} ${chalk.green('✓ CCC-managed')}`,
      `${chalk.bold('Symlinks:')} ${symlinkValid ? chalk.green('✓ Valid') : chalk.red('✗ Invalid or broken')}`
    ];
    
    if (claudeDirTarget || claudeFileTarget) {
      statusInfo.push('', chalk.bold('Symlink Targets:'));
      if (claudeDirTarget) {
        statusInfo.push(`  ${chalk.cyan('.claude')} → ${chalk.gray(claudeDirTarget)}`);
      }
      if (claudeFileTarget) {
        statusInfo.push(`  ${chalk.cyan('CLAUDE.md')} → ${chalk.gray(claudeFileTarget)}`);
      }
    }
    
    p.log.message(statusInfo.join('\n'));
    
  } else {
    const statusInfo = [
      `${chalk.bold('Project:')} ${projectName}`,
      `${chalk.bold('Path:')} ${chalk.gray(currentPath)}`,
      `${chalk.bold('Status:')} ${chalk.yellow('Not CCC-managed')}`,
      '',
      chalk.gray('💡 Run "ccc setup" to manage this project with CCC')
    ];
    
    p.log.message(statusInfo.join('\n'));
  }
}

async function showProjectStatus(projectName: string): Promise<void> {
  try {
    const storageManager = new StorageManager();
    const projectInfo = await storageManager.getProjectInfo(projectName);
    
    if (!projectInfo) {
      p.cancel(`Project not found: ${projectName}`);
      process.exit(1);
    }

    const projectPath = projectInfo.projectPath;
    const symlinkManager = new SymlinkManager();
    
    // Check if project path exists
    if (!await PathUtils.exists(projectPath)) {
      const statusInfo = [
        `${chalk.bold('Project:')} ${projectName}`,
        `${chalk.bold('Path:')} ${chalk.gray(projectPath)} ${chalk.red('(not found)')}`,
        `${chalk.bold('Status:')} ${chalk.red('✗ Path missing')}`,
        '',
        chalk.gray('💡 The project directory no longer exists')
      ];
      
      p.log.message(statusInfo.join('\n'));
      return;
    }

    // Check if still managed (symlinks exist)
    const isManaged = await PathUtils.isProjectManaged(projectPath);
    
    if (!isManaged) {
      const statusInfo = [
        `${chalk.bold('Project:')} ${projectName}`,
        `${chalk.bold('Path:')} ${chalk.gray(projectPath)}`,
        `${chalk.bold('Status:')} ${chalk.yellow('Not currently linked')}`,
        '',
        chalk.gray('💡 Storage exists but symlinks are missing. Run "ccc setup" in the project directory to re-link.')
      ];
      
      p.log.message(statusInfo.join('\n'));
      return;
    }

    // Check symlink health
    const symlinkValid = await symlinkManager.validateSymlinks(projectPath);
    
    // Show symlink targets
    const claudeDir = path.join(projectPath, '.claude');
    const claudeFile = path.join(projectPath, 'CLAUDE.md');
    
    const claudeDirTarget = await symlinkManager.getSymlinkTarget(claudeDir);
    const claudeFileTarget = await symlinkManager.getSymlinkTarget(claudeFile);
    
    const statusInfo = [
      `${chalk.bold('Project:')} ${projectName}`,
      `${chalk.bold('Path:')} ${chalk.gray(projectPath)}`,
      `${chalk.bold('Status:')} ${chalk.green('✓ CCC-managed')}`,
      `${chalk.bold('Symlinks:')} ${symlinkValid ? chalk.green('✓ Valid') : chalk.red('✗ Invalid or broken')}`
    ];
    
    // Add template information if available
    if (projectInfo.projectType && projectInfo.projectType !== 'unknown') {
      statusInfo.push(`${chalk.bold('Template:')} ${projectInfo.projectType} v${projectInfo.templateVersion || 'N/A'}`);
    }
    
    // Add dates if available
    if (projectInfo.setupDate) {
      statusInfo.push(`${chalk.bold('Setup:')} ${formatDate(projectInfo.setupDate)}`);
    }
    
    if (claudeDirTarget || claudeFileTarget) {
      statusInfo.push('', chalk.bold('Symlink Targets:'));
      if (claudeDirTarget) {
        statusInfo.push(`  ${chalk.cyan('.claude')} → ${chalk.gray(claudeDirTarget)}`);
      }
      if (claudeFileTarget) {
        statusInfo.push(`  ${chalk.cyan('CLAUDE.md')} → ${chalk.gray(claudeFileTarget)}`);
      }
    }
    
    p.log.message(statusInfo.join('\n'));
    
  } catch (error: any) {
    p.cancel(chalk.red(`Error checking project status: ${error.message}`));
    process.exit(1);
  }
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  
  if (days === 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days} days ago`;
  
  return date.toLocaleDateString();
}