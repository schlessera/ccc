import * as p from '@clack/prompts';
import chalk from 'chalk';
import * as fs from 'fs-extra';
import * as path from 'path';
import { PathUtils } from '../../utils/paths';
import { HookLoader } from '../../core/hooks/loader';
import { Hook } from '../../types/template';

interface AddHookOptions {
  hook?: string;
  list?: boolean;
}

export async function addHookCommand(options: AddHookOptions): Promise<void> {
  try {
    const currentPath = process.cwd();
    const isManaged = await PathUtils.isProjectManaged(currentPath);
    
    if (!isManaged) {
      p.cancel('Current directory is not CCC-managed. Run "ccc setup" first.');
      process.exit(1);
    }

    const hookLoader = new HookLoader();

    if (options.list) {
      await showAvailableHooks(hookLoader);
      return;
    }

    let selectedHook = options.hook;
    
    if (!selectedHook) {
      const choice = await selectHookOption(hookLoader);
      if (!choice) return;

      if (choice === 'custom') {
        await createCustomHook(currentPath);
        return;
      } else {
        selectedHook = choice;
      }
    }

    const hook = await hookLoader.getHook(selectedHook);
    if (!hook) {
      p.cancel(`Hook not found: ${selectedHook}`);
      process.exit(1);
    }

    await installHook(hook, currentPath);

  } catch (error: any) {
    p.cancel(chalk.red(error.message));
    process.exit(1);
  }
}

async function showAvailableHooks(hookLoader: HookLoader): Promise<void> {
  const hooks = await hookLoader.loadHooks();
  
  if (hooks.length === 0) {
    p.note('No hooks available. Add hooks to ~/.ccc/hooks or system hooks directory.', '🎣 Available Hooks');
    return;
  }

  const hookLines = hooks.map(hook => {
    const source = (hook as any).source ? chalk.gray(`[${(hook as any).source}]`) : '';
    const eventIcon = getHookEventIcon(hook.eventType);
    return `${chalk.cyan(hook.name.padEnd(20))} ${eventIcon} ${chalk.gray(hook.description)} ${source}`;
  });

  p.note(hookLines.join('\n'), '🎣 Available Hooks');
}

async function selectHookOption(hookLoader: HookLoader): Promise<string | null> {
  const hooks = await hookLoader.loadHooks();
  
  const options = [
    ...hooks.map(hook => ({
      value: hook.name,
      label: `${getHookEventIcon(hook.eventType)} ${hook.name}`,
      hint: `${hook.description} (${hook.eventType}) ${(hook as any).source ? chalk.gray(`[${(hook as any).source}]`) : ''}`
    })),
    {
      value: 'custom',
      label: '✨ Create custom hook',
      hint: 'Define your own hook'
    }
  ];

  const choice = await p.select({
    message: 'Select a hook to add',
    options
  });

  if (p.isCancel(choice)) {
    p.outro('Hook installation cancelled');
    return null;
  }

  return choice as string;
}

async function createCustomHook(projectPath: string): Promise<void> {
  const name = await p.text({
    message: 'Hook name',
    placeholder: 'my-hook',
    validate: (value) => {
      if (!value) return 'Hook name is required';
      if (!/^[a-z0-9-]+$/.test(value)) {
        return 'Use lowercase letters, numbers, and hyphens only';
      }
      return undefined;
    }
  });

  if (p.isCancel(name)) {
    p.outro('Hook creation cancelled');
    return;
  }

  const description = await p.text({
    message: 'Hook description',
    placeholder: 'What does this hook do?'
  });

  if (p.isCancel(description)) {
    p.outro('Hook creation cancelled');
    return;
  }

  const eventType = await p.select({
    message: 'Hook event type',
    options: [
      { value: 'PreToolUse', label: '🔒 Pre Tool Use', hint: 'Runs before tool execution' },
      { value: 'PostToolUse', label: '✅ Post Tool Use', hint: 'Runs after tool execution' },
      { value: 'Notification', label: '📢 Notification', hint: 'Triggered by system notifications' },
      { value: 'UserPromptSubmit', label: '💬 User Prompt Submit', hint: 'Runs when user submits a prompt' },
      { value: 'Stop', label: '🛑 Stop', hint: 'Runs when main agent finishes' },
      { value: 'SubagentStop', label: '🤖 Subagent Stop', hint: 'Runs when subagent finishes' },
      { value: 'PreCompact', label: '📦 Pre Compact', hint: 'Runs before context compaction' },
      { value: 'SessionStart', label: '🚀 Session Start', hint: 'Runs at session initialization' }
    ]
  }) as Hook['eventType'];

  if (p.isCancel(eventType)) {
    p.outro('Hook creation cancelled');
    return;
  }

  const matcher = await p.text({
    message: 'Tool matcher pattern (optional)',
    placeholder: 'e.g., Bash, Read, Bash(git *:*)',
    validate: undefined
  });

  if (p.isCancel(matcher)) {
    p.outro('Hook creation cancelled');
    return;
  }

  const command = await p.text({
    message: 'Hook command',
    placeholder: 'echo "Hook executed"',
    validate: (value) => {
      if (!value) return 'Command is required';
      return undefined;
    }
  });

  if (p.isCancel(command)) {
    p.outro('Hook creation cancelled');
    return;
  }

  const customHook: Hook = {
    name: name as string,
    description: description as string || 'Custom hook',
    eventType,
    matcher: (matcher as string) !== '' ? (matcher as string) : undefined,
    command: command as string
  };

  await installHook(customHook, projectPath);
}

async function installHook(hook: Hook, projectPath: string): Promise<void> {
  const spinner = p.spinner();
  const warnings: string[] = [];
  let scriptCreated = false;
  let configUpdated = false;
  
  try {
    spinner.start(`Installing ${hook.name} hook`);

    // Get the .claude directory path
    const claudeDir = path.join(projectPath, '.claude');
    const settingsFile = path.join(claudeDir, 'settings.json');

    // Ensure .claude directory exists
    await fs.ensureDir(claudeDir);

    // Create script file in .claude/hooks directory
    const hooksDir = path.join(claudeDir, 'hooks');
    await fs.ensureDir(hooksDir);
    
    const scriptFileName = `${hook.name}.sh`;
    const scriptFilePath = path.join(hooksDir, scriptFileName);
    
    // Check if script file already exists
    const scriptExists = await PathUtils.exists(scriptFilePath);
    if (scriptExists) {
      // Read existing script content
      const existingContent = await fs.readFile(scriptFilePath, 'utf-8');
      const expectedContent = `#!/bin/bash\n# ${hook.description}\n${hook.command}`;
      
      if (existingContent.trim() === expectedContent.trim()) {
        warnings.push(`Script ${scriptFileName} already exists with correct content`);
      } else {
        warnings.push(`Script ${scriptFileName} already exists with different content`);
        
        // Ask user if they want to overwrite
        spinner.stop('Script file conflict');
        const overwrite = await p.confirm({
          message: `Script file ${scriptFileName} already exists with different content. Overwrite?`,
          initialValue: false
        });
        
        if (!overwrite || p.isCancel(overwrite)) {
          // Continue with existing script but warn user
          warnings.push(`Using existing script file ${scriptFileName}`);
        } else {
          await fs.writeFile(scriptFilePath, expectedContent, 'utf-8');
          scriptCreated = true;
        }
        spinner.start(`Installing ${hook.name} hook`);
      }
    } else {
      // Write the script content
      const scriptContent = `#!/bin/bash\n# ${hook.description}\n${hook.command}`;
      await fs.writeFile(scriptFilePath, scriptContent, 'utf-8');
      scriptCreated = true;
    }
    
    // Make script executable
    try {
      await fs.chmod(scriptFilePath, 0o755);
    } catch (error) {
      // Silently continue if chmod fails (e.g., on Windows)
    }
    
    // Reference the script using $CLAUDE_PROJECT_DIR path
    const scriptReference = `$CLAUDE_PROJECT_DIR/.claude/hooks/${scriptFileName}`;

    // Load current settings
    let settings = {};
    if (await PathUtils.exists(settingsFile)) {
      settings = await fs.readJSON(settingsFile);
    }

    // Initialize hooks object if it doesn't exist
    if (!(settings as any).hooks) {
      (settings as any).hooks = {};
    }

    // Check if hook configuration already exists
    const existingHooks = (settings as any).hooks[hook.eventType];
    let hookConfigExists = false;
    
    if (existingHooks) {
      if (Array.isArray(existingHooks)) {
        hookConfigExists = existingHooks.some((group: any) => 
          group.matcher === hook.matcher && 
          group.hooks?.some((h: any) => h.command === scriptReference)
        );
      } else if (typeof existingHooks === 'object') {
        hookConfigExists = !!(hook.matcher && existingHooks[hook.matcher] === scriptReference);
      }
    }

    if (hookConfigExists) {
      warnings.push(`Hook configuration already exists in settings.json`);
    } else {
      // Add hook to settings
      if (hook.matcher) {
        // Use array format with matcher
        if (!Array.isArray((settings as any).hooks[hook.eventType])) {
          (settings as any).hooks[hook.eventType] = [];
        }
        
        // Find existing group with same matcher or create new one
        let group = (settings as any).hooks[hook.eventType].find((g: any) => g.matcher === hook.matcher);
        if (!group) {
          group = { matcher: hook.matcher, hooks: [] };
          (settings as any).hooks[hook.eventType].push(group);
        }
        
        group.hooks.push({
          type: 'command',
          command: scriptReference,
          description: hook.description,
          ...(hook.timeout && { timeout: hook.timeout })
        });
      } else {
        // Use simple object format for hooks without matcher
        if (!(settings as any).hooks[hook.eventType]) {
          (settings as any).hooks[hook.eventType] = {};
        }
        
        // Use a generic key if no matcher
        (settings as any).hooks[hook.eventType]['*'] = scriptReference;
      }

      // Save updated settings
      await fs.writeJSON(settingsFile, settings, { spaces: 2 });
      configUpdated = true;
    }

    spinner.stop(`Installed ${hook.name} hook`);

    // Show what was done
    const actions = [];
    if (scriptCreated) {
      actions.push(`✓ Created script: ${chalk.cyan('.claude/hooks/' + scriptFileName)}`);
    }
    if (configUpdated) {
      actions.push(`✓ Updated configuration: ${chalk.cyan('.claude/settings.json')}`);
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
        `Hook: ${chalk.cyan(hook.name)}`,
        `Event: ${getHookEventIcon(hook.eventType)} ${hook.eventType}`,
        `Matcher: ${hook.matcher || 'all tools'}`,
        `Script: ${chalk.gray(scriptFilePath)}`,
        `Config: ${chalk.gray(settingsFile)}`,
        '',
        ...actions
      ].join('\n'),
      chalk.green('🎉 Hook Installation Complete')
    );

    // Show next steps
    const nextSteps = [
      `Hook will run automatically based on its event type`,
      `Run ${chalk.cyan('ccc validate')} to check configuration`,
      `Edit ${chalk.cyan('.claude/hooks/' + scriptFileName)} to customize behavior`
    ];

    p.note(nextSteps.join('\n'), '💡 Next Steps');

  } catch (error: any) {
    spinner.stop('Installation failed');
    throw error;
  }
}

function getHookEventIcon(eventType: Hook['eventType']): string {
  const icons = {
    'PreToolUse': '🔒',
    'PostToolUse': '✅',
    'Notification': '📢',
    'UserPromptSubmit': '💬',
    'Stop': '🛑',
    'SubagentStop': '🤖',
    'PreCompact': '📦',
    'SessionStart': '🚀'
  };
  return icons[eventType] || '🎣';
}