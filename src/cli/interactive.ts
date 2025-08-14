import * as p from '@clack/prompts';
import chalk from 'chalk';
import { setupCommand } from './commands/setup';
import { listCommand } from './commands/list';
import { updateCommand } from './commands/update';
import { unlinkCommand } from './commands/unlink';
import { addAgentCommand } from './commands/add-agent';
import { addCommandCommand } from './commands/add-command';
import { installCommand } from './commands/install';
import { cleanupCommand } from './commands/cleanup';
import { validateCommand } from './commands/validate';

export async function interactiveMode(): Promise<void> {
  while (true) {
    const action = await p.select({
      message: 'What would you like to do?',
      options: [
        { value: 'setup', label: '🚀 Setup current project' },
        { value: 'list', label: '📋 List managed projects' },
        { value: 'update', label: '🔄 Update project configuration' },
        { value: 'unlink', label: '🔗 Unlink project' },
        { value: 'add-command', label: '➕ Add command to project' },
        { value: 'add-agent', label: '🤖 Add agent to project' },
        { value: 'install', label: '📦 Install global commands' },
        { value: 'cleanup', label: '🧹 Cleanup old backups' },
        { value: 'validate', label: '✅ Validate setup' },
        { value: 'help', label: '❓ Help' },
        { value: 'exit', label: '🚪 Exit' },
      ],
    });

    if (p.isCancel(action)) {
      p.outro(chalk.gray('Goodbye! 👋'));
      process.exit(0);
    }

    try {
      switch (action) {
        case 'setup':
          await setupCommand({});
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
        case 'install':
          await installCommand({});
          break;
        case 'cleanup':
          await cleanupCommand({ days: '30' });
          break;
        case 'validate':
          await validateCommand({});
          break;
        case 'help':
          showHelp();
          break;
        case 'exit':
          p.outro(chalk.cyan('Goodbye! 👋'));
          process.exit(0);
      }
    } catch (error: any) {
      console.error(chalk.red(`\nError: ${error.message}`));
      // Continue to menu instead of exiting on error
    }
  }
}

function showHelp(): void {
  const helpText = [
    '',
    chalk.cyan.bold('Commands:'),
    `  ${chalk.green('setup')}          Setup current project with central management`,
    `  ${chalk.green('list')}           List all managed projects`,
    `  ${chalk.green('update')}         Update project templates`,
    `  ${chalk.green('unlink')}         Remove central management from project`,
    `  ${chalk.green('add-agent')}      Add AI agent to current project`,
    `  ${chalk.green('add-command')}    Add custom command to current project`,
    `  ${chalk.green('install')}        Install global management commands`,
    `  ${chalk.green('cleanup')}        Clean up old backups`,
    `  ${chalk.green('validate')}       Validate system integrity`,
    `  ${chalk.green('status')}         Check current project status`,
    '',
    chalk.cyan.bold('Usage:'),
    `  ${chalk.gray('$')} npx ccc ${chalk.green('[command] [options]')}`,
    `  ${chalk.gray('$')} npx ccc ${chalk.gray('# Interactive mode')}`,
    '',
    chalk.cyan.bold('Examples:'),
    `  ${chalk.gray('$')} npx ccc setup --template=web-dev`,
    `  ${chalk.gray('$')} npx ccc list --verbose`,
    `  ${chalk.gray('$')} npx ccc update --all`,
    `  ${chalk.gray('$')} npx ccc cleanup --days=30`,
    '',
    chalk.cyan.bold('Learn more:'),
    `  Documentation: ${chalk.blue('https://github.com/schlessera/ccc')}`,
    `  Issues: ${chalk.blue('https://github.com/schlessera/ccc/issues')}`,
    ''
  ];

  p.log.message(helpText.join('\n'));
}