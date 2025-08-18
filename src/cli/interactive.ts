import * as p from '@clack/prompts';
import chalk from 'chalk';
import { setupCommand } from './commands/setup';
import { listCommand } from './commands/list';
import { updateCommand } from './commands/update';
import { unlinkCommand } from './commands/unlink';
import { addAgentCommand } from './commands/add-agent';
import { addCommandCommand } from './commands/add-command';
import { addHookCommand } from './commands/add-hook';
import { installCommand } from './commands/install';
import { cleanupCommand } from './commands/cleanup';
import { validateCommand } from './commands/validate';
import { statusCommand } from './commands/status';
import { PathUtils } from '../utils/paths';
import { setMainMenuContext } from './index';
import { getService, ServiceKeys } from '../core/container';
import { StorageManager } from '../core/storage/manager';

export async function interactiveMode(maxIterations?: number): Promise<void> {
  
  // Show key hints for navigation  
  p.log.message(chalk.gray('Press Ctrl+C to exit/cancel operations'));
  
  // In test mode, default to 1 iteration to prevent infinite loops
  const isTestMode = process.env.CCC_TEST_MODE === 'true' || process.env.NODE_ENV === 'test';
  const iterationLimit = maxIterations ?? (isTestMode ? 1 : Infinity);
  
  let iterations = 0;
  while (iterations < iterationLimit) {
    iterations++;
    // Check if current project is CCC-managed
    const isManaged = await PathUtils.isProjectManaged();
    const currentDir = process.cwd().split('/').pop() || 'current directory';
    
    // Build context-aware menu options
    const options = [];
    
    if (isManaged) {
      // Project is managed - show project-specific options only
      p.log.info(chalk.green(`📁 ${currentDir} is CCC-managed`));
      
      // Check if this project uses a template that can be updated
      let canUpdate = true; // Default to true to show update option
      try {
        const storageManager = getService<StorageManager>(ServiceKeys.StorageManager);
        const projectName = await getProjectNameFromCurrentPath(storageManager);
        const projectInfo = projectName ? await storageManager.getProjectInfo(projectName) : null;
        canUpdate = !projectInfo || projectInfo.projectType !== 'existing';
      } catch (error) {
        // In test environment or when services aren't available, default to showing update option
        canUpdate = true;
      }
      
      options.push(
        { value: 'status', label: '📊 Show status' }
      );
      
      if (canUpdate) {
        options.push({ value: 'update', label: '🔄 Update configuration' });
      }
      
      options.push(
        { value: 'add-command', label: '➕ Add command' },
        { value: 'add-agent', label: '🤖 Add agent' },
        { value: 'add-hook', label: '🎣 Add hook' },
        { value: 'unlink', label: '🔗 Unlink project' }
      );
    } else {
      // Project is not managed - show setup and global management options
      p.log.info(chalk.yellow(`📁 ${currentDir} is not CCC-managed`));
      options.push(
        { value: 'setup', label: '🚀 Setup current project' },
        { value: 'list', label: '📋 List managed projects' },
        { value: 'validate', label: '✅ Validate setup' },
        { value: 'install', label: '📦 Install global commands' },
        { value: 'cleanup', label: '🧹 Cleanup old backups' }
      );
    }
    
    // Set context: we're in main menu
    setMainMenuContext(true);
    
    const action = await p.select({
      message: 'What would you like to do?',
      options,
    });

    if (p.isCancel(action)) {
      p.outro(chalk.gray('Goodbye! 👋'));
      process.exit(0);
    }

    try {
      // Set context: we're no longer in main menu  
      setMainMenuContext(false);
      
      switch (action) {
        case 'setup':
          await setupCommand({});
          break;
        case 'status':
          await statusCommand({});
          break;
        case 'list':
          await listCommand({ verbose: false });
          break;
        case 'update':
          await updateCommand({});
          break;
        case 'unlink':
          await unlinkCommand({});
          break;
        case 'add-command':
          await addCommandCommand({});
          break;
        case 'add-agent':
          await addAgentCommand({});
          break;
        case 'add-hook':
          await addHookCommand({});
          break;
        case 'install':
          await installCommand({});
          break;
        case 'cleanup':
          await cleanupCommand({ days: '30' });
          break;
        case 'validate':
          await validateCommand({});
          break;
      }
    } catch (error: any) {
      // Handle errors gracefully and continue to main menu
      console.error(chalk.red(`\nError: ${error.message}`));
      // Continue to menu instead of exiting on error
    }
  }
}

async function getProjectNameFromCurrentPath(storageManager: StorageManager): Promise<string | null> {
  const currentPath = process.cwd();
  const projects = await storageManager.listProjects();
  
  for (const project of projects) {
    const info = await storageManager.getProjectInfo(project);
    if (info?.projectPath === currentPath) {
      return project;
    }
  }
  
  return null;
}