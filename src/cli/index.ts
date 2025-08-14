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
import { installCommand } from './commands/install';
import { cleanupCommand } from './commands/cleanup';
import { validateCommand } from './commands/validate';
import { statusCommand } from './commands/status';
import { interactiveMode } from './interactive';
import { version } from '../../package.json';

// Check for updates
const pkg = require('../../package.json');
updateNotifier({ pkg }).notify();

const program = new Command();

program
  .name('ccc')
  .description('Claude Code Central - Centralized AI Configuration Manager')
  .version(version)
  .option('--verbose', 'Verbose output')
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
  .action(listCommand);

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