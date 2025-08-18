#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import * as p from '@clack/prompts';
import updateNotifier from 'update-notifier';
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
import { interactiveMode } from './interactive';
import { version } from '../../package.json';

// Global state for ESC key handling (currently disabled)
// @ts-ignore - kept for compatibility with existing calls
let isInMainMenu = false;

// ESC key handling using readline keypress events
function setupGlobalESCHandler(): void {
  // For now, disable global ESC handling due to environment limitations
  // In WSL and similar environments, TTY support is limited and clack prompts
  // take exclusive control of stdin, making global keypress handling unreliable
  
  // Future improvement: Could explore integrating with clack's internal key handling
  // or using a different approach for ESC detection that works better with prompts
  
  console.log('INFO: ESC key handling is limited in this environment. Use Ctrl+C for cancellation.');
}

// Context management functions (currently disabled but kept for compatibility)
export function setMainMenuContext(inMenu: boolean): void {
  isInMainMenu = inMenu;
}


// Check for updates
const pkg = require('../../package.json');
updateNotifier({ pkg }).notify();

const program = new Command();

program
  .name('ccc')
  .description('Claude Code Central - Centralized AI Configuration Manager')
  .version(version)
  .option('--debug', 'Debug output')
  .option('--quiet', 'Minimal output')
  .option('--no-color', 'Disable colors')
  .option('--dry-run', 'Preview changes without applying');

// Setup command
program
  .command('setup')
  .description('Setup current project with central management')
  .option('-t, --template <template>', 'Template to use')
  .option('-n, --name <name>', 'Project name')
  .option('-f, --force', 'Force setup without confirmation')
  .action(setupCommand);

// List command
program
  .command('list')
  .alias('ls')
  .description('List all managed projects')
  .option('-v, --verbose', 'Show detailed information')
  .option('--json', 'Output as JSON')
  .action((options) => listCommand(options));

// Update command
program
  .command('update')
  .description('Update project templates')
  .option('-a, --all', 'Update all projects')
  .option('-p, --project <name>', 'Update specific project')
  .option('-f, --force', 'Force update without confirmation')
  .option('--preview', 'Preview changes without applying')
  .action(updateCommand);

// Unlink command
program
  .command('unlink')
  .description('Remove central management from project')
  .option('-k, --keep-storage', 'Keep storage (only remove symlinks)')
  .option('-m, --migrate', 'Copy configurations back to project')
  .option('-f, --force', 'Force unlink without confirmation')
  .action(unlinkCommand);

// Add agent command
program
  .command('add-agent')
  .description('Add AI agent to current project')
  .option('-a, --agent <name>', 'Agent name to add')
  .option('--list', 'List available agents')
  .action(addAgentCommand);

// Add command command
program
  .command('add-command')
  .description('Add custom command to current project')
  .option('-c, --command <name>', 'Command name to add')
  .option('--list', 'List available commands')
  .action(addCommandCommand);

// Add hook command
program
  .command('add-hook')
  .description('Add custom hook to current project')
  .option('-h, --hook <name>', 'Hook name to add')
  .option('--list', 'List available hooks')
  .action(addHookCommand);

// Install command
program
  .command('install')
  .description('Install global management commands')
  .option('--prefix <path>', 'Installation prefix')
  .action(installCommand);

// Cleanup command
program
  .command('cleanup')
  .description('Clean up old backups')
  .option('-d, --days <days>', 'Remove backups older than N days', '30')
  .option('-k, --keep <count>', 'Keep last N backups')
  .option('-p, --project <name>', 'Target specific project')
  .option('--dry-run', 'Preview what would be deleted')
  .action(cleanupCommand);

// Validate command
program
  .command('validate')
  .description('Validate system integrity')
  .option('-p, --project <name>', 'Validate specific project')
  .option('--fix', 'Attempt to fix issues')
  .action(validateCommand);

// Status command
program
  .command('status')
  .description('Check current project status')
  .option('-p, --project <name>', 'Check specific project status')
  .action(statusCommand);

// Error handling
program.exitOverride();

// Parse arguments and handle interactive mode
(async () => {
  try {
    // Set up global ESC key handling
    setupGlobalESCHandler();
    
    // Show interactive mode if no arguments
    if (!process.argv.slice(2).length) {
      // Show welcome header with Clack intro
      p.intro(chalk.cyan.bold('🌟 Claude Code Central'));
      p.log.message(chalk.gray('Centralized AI Configuration Manager'));
      await interactiveMode();
    } else {
      program.parse(process.argv);
    }
  } catch (error: any) {
    if (error.code === 'commander.help') {
      process.exit(0);
    }
    console.error(chalk.red(`Error: ${error.message}`));
    process.exit(1);
  }
})();