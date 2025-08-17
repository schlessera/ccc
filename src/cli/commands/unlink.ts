import * as p from '@clack/prompts';
import chalk from 'chalk';
import * as fs from 'fs-extra';
import * as path from 'path';
import { StorageManager } from '../../core/storage/manager';
import { SymlinkManager } from '../../core/symlinks/manager';
import { PathUtils } from '../../utils/paths';
import { getService, ServiceKeys } from '../../core/container';

interface UnlinkOptions {
  keepStorage?: boolean;
  migrate?: boolean;
  force?: boolean;
}

export async function unlinkCommand(options: UnlinkOptions): Promise<void> {
  try {
    const currentPath = process.cwd();
    const isManaged = await PathUtils.isProjectManaged(currentPath);
    
    if (!isManaged) {
      p.cancel('Current directory is not CCC-managed');
      process.exit(1);
    }

    const storageManager = getService<StorageManager>(ServiceKeys.StorageManager);
    const symlinkManager = getService<SymlinkManager>(ServiceKeys.SymlinkManager);
    
    // Get project name
    const projectName = await getProjectNameFromPath(currentPath, storageManager);
    if (!projectName) {
      p.cancel('Could not determine project name from current directory');
      process.exit(1);
    }

    // Show current status
    p.note(
      [
        `Project: ${chalk.cyan(projectName)}`,
        `Path: ${chalk.gray(currentPath)}`,
        `Storage: ${chalk.gray(PathUtils.getProjectStorageDir(projectName))}`
      ].join('\n'),
      '🔗 Unlink Project'
    );

    // Confirmation and options
    if (!options.force) {
      const action = await p.select({
        message: 'How would you like to unlink this project?',
        options: [
          {
            value: 'migrate',
            label: '📂 Migrate configurations back to project',
            hint: 'Copy .claude/ and CLAUDE.md back to project directory'
          },
          {
            value: 'remove-symlinks',
            label: '🔗 Remove symlinks only',
            hint: 'Keep storage intact, remove symlinks'
          },
          {
            value: 'full-unlink',
            label: '🗑️ Complete removal',
            hint: 'Remove symlinks and delete storage'
          },
          {
            value: 'cancel',
            label: '❌ Cancel'
          }
        ]
      });

      if (p.isCancel(action) || action === 'cancel') {
        p.outro('Unlink cancelled');
        return;
      }

      // Execute based on choice
      switch (action) {
        case 'migrate':
          await migrateAndUnlink(currentPath, projectName, storageManager, symlinkManager);
          break;
        case 'remove-symlinks':
          await removeSymlinkOnly(currentPath, projectName, symlinkManager);
          break;
        case 'full-unlink':
          await fullUnlink(currentPath, projectName, storageManager, symlinkManager);
          break;
      }
    } else {
      // Use command line options
      if (options.migrate) {
        await migrateAndUnlink(currentPath, projectName, storageManager, symlinkManager);
      } else if (options.keepStorage) {
        await removeSymlinkOnly(currentPath, projectName, symlinkManager);
      } else {
        await fullUnlink(currentPath, projectName, storageManager, symlinkManager);
      }
    }

  } catch (error: any) {
    p.cancel(chalk.red(error.message));
    process.exit(1);
  }
}

async function migrateAndUnlink(
  projectPath: string,
  projectName: string,
  storageManager: StorageManager,
  symlinkManager: SymlinkManager
): Promise<void> {
  const spinner = p.spinner();
  
  try {
    spinner.start('Migrating configurations back to project');
    
    const storageDir = PathUtils.getProjectStorageDir(projectName);
    const claudeDir = path.join(projectPath, '.claude');
    const claudeFile = path.join(projectPath, 'CLAUDE.md');
    
    // Remove existing symlinks first
    await symlinkManager.removeProjectSymlinks(projectPath);
    
    // Copy storage contents back to project
    if (await PathUtils.exists(storageDir)) {
      await fs.copy(storageDir, claudeDir, { overwrite: true });
    }
    
    // Copy CLAUDE.md back
    const storageClaude = path.join(storageDir, 'CLAUDE.md');
    if (await PathUtils.exists(storageClaude)) {
      await fs.copy(storageClaude, claudeFile, { overwrite: true });
    }
    
    // Remove from central storage
    await storageManager.removeProject(projectName);
    
    spinner.stop('Migration completed');
    
    p.note(
      [
        '✅ Configurations migrated back to project',
        '✅ Symlinks removed',
        '✅ Central storage cleaned up',
        '',
        'Your project now has local .claude/ directory and CLAUDE.md file'
      ].join('\n'),
      chalk.green('🎉 Unlink Complete')
    );
    
  } catch (error: any) {
    spinner.stop('Migration failed');
    throw error;
  }
}

async function removeSymlinkOnly(
  projectPath: string,
  projectName: string,
  symlinkManager: SymlinkManager
): Promise<void> {
  const spinner = p.spinner();
  
  try {
    spinner.start('Removing symlinks');
    
    await symlinkManager.removeProjectSymlinks(projectPath);
    
    spinner.stop('Symlinks removed');
    
    p.note(
      [
        '✅ Symlinks removed',
        '📂 Storage preserved in central location',
        '',
        `Storage location: ${chalk.gray(PathUtils.getProjectStorageDir(projectName))}`,
        'Run setup again to re-link this project'
      ].join('\n'),
      chalk.green('🔗 Symlinks Removed')
    );
    
  } catch (error: any) {
    spinner.stop('Failed to remove symlinks');
    throw error;
  }
}

async function fullUnlink(
  projectPath: string,
  projectName: string,
  storageManager: StorageManager,
  symlinkManager: SymlinkManager
): Promise<void> {
  const spinner = p.spinner();
  
  try {
    spinner.start('Completely removing project from CCC');
    
    // Remove symlinks
    await symlinkManager.removeProjectSymlinks(projectPath);
    
    // Remove from central storage
    await storageManager.removeProject(projectName);
    
    spinner.stop('Project removed');
    
    p.note(
      [
        '✅ Symlinks removed',
        '✅ Central storage deleted',
        '⚠️  All configurations lost',
        '',
        'Project is no longer managed by CCC'
      ].join('\n'),
      chalk.green('🗑️ Complete Removal')
    );
    
  } catch (error: any) {
    spinner.stop('Failed to remove project');
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