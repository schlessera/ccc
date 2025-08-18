import * as p from '@clack/prompts';
import chalk from 'chalk';
import * as fs from 'fs-extra';
import * as path from 'path';
import { PathUtils } from '../../utils/paths';
import { CommandLoader, Command } from '../../core/commands/loader';

interface AddCommandOptions {
  command?: string;
  list?: boolean;
}


export async function addCommandCommand(options: AddCommandOptions): Promise<void> {
  try {
    const currentPath = process.cwd();
    const isManaged = await PathUtils.isProjectManaged(currentPath);
    
    if (!isManaged) {
      p.cancel('Current directory is not CCC-managed. Run "ccc setup" first.');
      process.exit(1);
    }

    const commandLoader = new CommandLoader();

    if (options.list) {
      await showAvailableCommands(commandLoader);
      return;
    }

    let selectedCommand = options.command;
    
    if (!selectedCommand) {
      const choice = await selectCommandOption(commandLoader);
      if (!choice) return;

      if (choice === 'custom') {
        await createCustomCommand(currentPath);
        return;
      } else {
        selectedCommand = choice;
      }
    }

    const command = await commandLoader.getCommand(selectedCommand);
    if (!command) {
      p.cancel(`Command not found: ${selectedCommand}`);
      process.exit(1);
    }

    await installCommand(command, currentPath);

  } catch (error: any) {
    p.cancel(chalk.red(error.message));
    process.exit(1);
  }
}

async function showAvailableCommands(commandLoader: CommandLoader): Promise<void> {
  const commands = await commandLoader.loadProjectCommands();
  
  if (commands.length === 0) {
    p.note('No project commands available. Add commands to ~/.ccc/commands or system commands directory.', '⚡ Available Project Commands');
    return;
  }

  const commandLines = commands.map(cmd => {
    const source = (cmd as any).source ? chalk.gray(`[${(cmd as any).source}]`) : '';
    return `${chalk.cyan(cmd.name.padEnd(15))} ${chalk.gray(cmd.description || 'No description')} ${source}`;
  });

  p.note(commandLines.join('\n'), '⚡ Available Project Commands');
}

async function selectCommandOption(commandLoader: CommandLoader): Promise<string | null> {
  const commands = await commandLoader.loadProjectCommands();
  
  const options = [
    ...commands.map(cmd => ({
      value: cmd.name,
      label: `⚡ ${cmd.name}`,
      hint: `${cmd.description || 'No description'} ${(cmd as any).source ? chalk.gray(`[${(cmd as any).source}]`) : ''}`
    })),
    {
      value: 'custom',
      label: '✨ Create custom command',
      hint: 'Define your own command'
    }
  ];

  const choice = await p.select({
    message: 'Select a project command to add',
    options
  });

  if (p.isCancel(choice)) {
    p.outro('Command installation cancelled');
    return null;
  }

  return choice as string;
}

async function createCustomCommand(projectPath: string): Promise<void> {
  const name = await p.text({
    message: 'Command name',
    placeholder: 'my-command',
    validate: (value) => {
      if (!value) return 'Command name is required';
      if (!/^[a-z0-9-]+$/.test(value)) {
        return 'Use lowercase letters, numbers, and hyphens only';
      }
      return undefined;
    }
  });

  if (p.isCancel(name)) {
    p.outro('Command creation cancelled');
    return;
  }

  const description = await p.text({
    message: 'Command description',
    placeholder: 'What does this command do?'
  });

  if (p.isCancel(description)) {
    p.outro('Command creation cancelled');
    return;
  }

  const allowedTools = await p.text({
    message: 'Allowed tools (optional)',
    placeholder: 'e.g., Bash, Read, Write',
    validate: undefined
  });

  if (p.isCancel(allowedTools)) {
    p.outro('Command creation cancelled');
    return;
  }

  const argumentHint = await p.text({
    message: 'Argument hint (optional)',
    placeholder: 'e.g., "file path"',
    validate: undefined
  });

  if (p.isCancel(argumentHint)) {
    p.outro('Command creation cancelled');
    return;
  }

  const content = await p.text({
    message: 'Command content (supports {$ARGUMENTS})',
    placeholder: 'Run the following command: {$ARGUMENTS}',
    validate: (value) => {
      if (!value) return 'Content is required';
      return undefined;
    }
  });

  if (p.isCancel(content)) {
    p.outro('Command creation cancelled');
    return;
  }

  const customCommand: Command = {
    name: name as string,
    description: (description as string) || undefined,
    allowedTools: (allowedTools as string) || undefined,
    argumentHint: (argumentHint as string) || undefined,
    content: content as string
  };

  await installCommand(customCommand, projectPath);
}

async function installCommand(command: Command, projectPath: string): Promise<void> {
  const spinner = p.spinner();
  const warnings: string[] = [];
  let commandCreated = false;
  
  try {
    spinner.start(`Installing ${command.name} command`);

    // Get the .claude directory path
    const claudeDir = path.join(projectPath, '.claude');
    const commandsDir = path.join(claudeDir, 'commands');
    const commandFile = path.join(commandsDir, `${command.name}.md`);

    // Ensure commands directory exists
    await fs.ensureDir(commandsDir);

    // Create expected markdown content with frontmatter
    let expectedMarkdownContent = '';
    
    // Add frontmatter if any metadata exists
    const frontmatterFields = [];
    if (command.description) frontmatterFields.push(`description: ${command.description}`);
    if (command.allowedTools) frontmatterFields.push(`allowed-tools: ${command.allowedTools}`);
    if (command.argumentHint) frontmatterFields.push(`argument-hint: ${command.argumentHint}`);
    
    if (frontmatterFields.length > 0) {
      expectedMarkdownContent = `---\n${frontmatterFields.join('\n')}\n---\n\n`;
    }
    
    expectedMarkdownContent += command.content;

    // Check if command file already exists
    const commandExists = await PathUtils.exists(commandFile);
    if (commandExists) {
      // Read existing command content
      const existingContent = await fs.readFile(commandFile, 'utf-8');
      
      if (existingContent.trim() === expectedMarkdownContent.trim()) {
        warnings.push(`Command ${command.name}.md already exists with correct content`);
      } else {
        warnings.push(`Command ${command.name}.md already exists with different content`);
        
        // Ask user if they want to overwrite
        spinner.stop('Command file conflict');
        const overwrite = await p.confirm({
          message: `Command file ${command.name}.md already exists with different content. Overwrite?`,
          initialValue: false
        });
        
        if (!overwrite || p.isCancel(overwrite)) {
          // Continue with existing command but warn user
          warnings.push(`Using existing command file ${command.name}.md`);
        } else {
          await fs.writeFile(commandFile, expectedMarkdownContent, 'utf-8');
          commandCreated = true;
        }
        spinner.start(`Installing ${command.name} command`);
      }
    } else {
      // Write the command content
      await fs.writeFile(commandFile, expectedMarkdownContent, 'utf-8');
      commandCreated = true;
    }

    spinner.stop(`Installed ${command.name} command`);

    // Show what was done
    const actions = [];
    if (commandCreated) {
      actions.push(`✓ Created command: ${chalk.cyan('.claude/commands/' + command.name + '.md')}`);
    }
    if (actions.length === 0) {
      actions.push(`✓ Verified existing installation`);
    }

    // Show warnings if any
    if (warnings.length > 0) {
      p.note(warnings.map(w => `⚠️  ${w}`).join('\n'), chalk.yellow('Warnings'));
    }

    p.note(
      [
        `Command: ${chalk.cyan(command.name)}`,
        `Description: ${command.description || 'No description'}`,
        `Allowed Tools: ${command.allowedTools || 'All tools'}`,
        `File: ${chalk.gray(commandFile)}`,
        '',
        ...actions
      ].join('\n'),
      chalk.green('🎉 Command Installation Complete')
    );

    // Show next steps
    const nextSteps = [
      `Use the command with ${chalk.cyan('/' + command.name + ' [arguments]')}`,
      `Arguments will be substituted for {$ARGUMENTS} in the content`,
      `Run ${chalk.cyan('ccc validate')} to check configuration`,
      `Edit ${chalk.cyan('.claude/commands/' + command.name + '.md')} to customize behavior`
    ];

    p.note(nextSteps.join('\n'), '💡 Next Steps');

  } catch (error: any) {
    spinner.stop('Installation failed');
    throw error;
  }
}

