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
import { setMainMenuContext, createESCCancellablePromise } from './index';

export async function interactiveMode(): Promise<void> {
  
  // Show key hints for navigation  
  p.log.message(chalk.gray('Press Ctrl+C or ESC to exit • ESC returns to main menu from operations'));
  
  while (true) {
    // Check if current project is CCC-managed
    const isManaged = await PathUtils.isProjectManaged();
    const currentDir = process.cwd().split('/').pop() || 'current directory';
    
    // Build context-aware menu options
    const options = [];
    
    if (isManaged) {
      // Project is managed - show project-specific options only
      p.log.info(chalk.green(`📁 ${currentDir} is CCC-managed`));
      options.push(
        { value: 'status', label: '📊 Show status' },
        { value: 'update', label: '🔄 Update configuration' },
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
          await createESCCancellablePromise(setupCommand({}));
          break;
        case 'status':
          await createESCCancellablePromise(statusCommand({}));
          break;
        case 'list':
          await createESCCancellablePromise(listCommand({ verbose: false }));
          break;
        case 'update':
          await createESCCancellablePromise(updateCommand({}));
          break;
        case 'unlink':
          await createESCCancellablePromise(unlinkCommand({}));
          break;
        case 'add-command':
          await createESCCancellablePromise(addCommandCommand({}));
          break;
        case 'add-agent':
          await createESCCancellablePromise(addAgentCommand({}));
          break;
        case 'add-hook':
          await createESCCancellablePromise(addHookCommand({}));
          break;
        case 'install':
          await createESCCancellablePromise(installCommand({}));
          break;
        case 'cleanup':
          await createESCCancellablePromise(cleanupCommand({ days: '30' }));
          break;
        case 'validate':
          await createESCCancellablePromise(validateCommand({}));
          break;
      }
    } catch (error: any) {
      // Check if this was an ESC-triggered cancellation
      if (error.message === 'ESC_CANCELLED') {
        p.log.info(chalk.yellow('Operation cancelled, returning to main menu'));
      } else {
        console.error(chalk.red(`\nError: ${error.message}`));
      }
      // Continue to menu instead of exiting on error
    }
  }
}