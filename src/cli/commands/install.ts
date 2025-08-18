import * as p from '@clack/prompts';
import chalk from 'chalk';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';
import { PathUtils } from '../../utils/paths';
import { CommandLoader } from '../../core/commands/loader';
import { UserConfigManager } from '../../core/config/user-manager';

interface InstallOptions {
  prefix?: string;
}

export async function installCommand(options: InstallOptions): Promise<void> {
  try {
    p.intro(chalk.cyan('📦 Install Global Commands'));

    const installPath = options.prefix || path.join(os.homedir(), '.local', 'bin');
    const sourcePath = process.argv[1]; // Path to the current CCC executable
    
    // Ensure install directory exists
    await fs.ensureDir(installPath);

    // Check if already installed
    const globalCccPath = path.join(installPath, 'ccc');
    const isInstalled = await PathUtils.exists(globalCccPath);

    if (isInstalled) {
      const reinstall = await p.confirm({
        message: `CCC is already installed at ${globalCccPath}. Reinstall?`,
        initialValue: false
      });

      if (!reinstall || p.isCancel(reinstall)) {
        p.outro('Installation cancelled');
        return;
      }
    }

    const spinner = p.spinner();
    
    try {
      spinner.start('Installing global CCC command');

      // Check if source is executable
      try {
        await fs.access(sourcePath, fs.constants.X_OK);
      } catch (error) {
        // If source is not executable, make it executable
        await fs.chmod(sourcePath, 0o755);
      }

      // Copy the actual CCC executable instead of creating a wrapper
      await fs.copyFile(sourcePath, globalCccPath);
      await fs.chmod(globalCccPath, 0o755);

      // Install system commands
      const systemCommands = await installSystemCommands();

      spinner.stop('Installation completed');

      // Check if install path is in PATH
      const pathEnv = process.env.PATH || '';
      const pathIncludes = pathEnv.split(path.delimiter).includes(installPath);

      const lines = [
        `Installed: ${chalk.green(globalCccPath)}`,
        `Copied from: ${chalk.gray(sourcePath)}`,
        '',
        'The CCC executable has been copied and is now available globally.',
        '',
        'System commands installed:'
      ];

      // Add system commands to the output
      if (systemCommands.length > 0) {
        systemCommands.forEach(cmd => {
          lines.push(`  • ${chalk.cyan('ccc:' + cmd.name)} - ${cmd.description || 'No description'}`);
        });
      } else {
        lines.push('  • No system commands found');
      }

      if (!pathIncludes) {
        lines.push('');
        lines.push(`${chalk.yellow('⚠️  Path not in $PATH')}`);
        lines.push(`Add to your shell profile:`);
        lines.push(`  ${chalk.gray(`export PATH="${installPath}:$PATH"`)}`);
      }

      p.note(lines.join('\n'), chalk.green('✅ Installation Complete'));

      // Show verification steps
      const nextSteps = [
        pathIncludes ? 'You can now run "ccc" from anywhere' : 'Restart your terminal or source your shell profile',
        'Try running "ccc --help" to verify installation',
        'Use "ccc setup" to manage your first project',
        'Run "ccc add-command" to add project-specific slash commands',
        'System commands (ccc:*) are now available globally'
      ];

      p.note(nextSteps.join('\n'), '💡 Next Steps');

    } catch (error: any) {
      spinner.stop('Installation failed');
      throw error;
    }

  } catch (error: any) {
    p.cancel(chalk.red(error.message));
    process.exit(1);
  }
}

async function installSystemCommands(): Promise<{ name: string; description?: string }[]> {
  try {
    const commandLoader = new CommandLoader();
    const systemCommands = await commandLoader.loadSystemCommands();
    
    if (systemCommands.length === 0) {
      return [];
    }

    const userConfig = UserConfigManager.getInstance();
    await userConfig.ensureUserConfigDir();
    
    const userSystemCommandsDir = path.join(userConfig.getUserCommandsDir(), 'ccc');
    await fs.ensureDir(userSystemCommandsDir);

    // Copy each system command to user's global commands directory
    for (const command of systemCommands) {
      const targetFile = path.join(userSystemCommandsDir, `${command.name}.md`);
      
      // Create the command content with frontmatter
      let content = '';
      const frontmatterFields = [];
      if (command.description) frontmatterFields.push(`description: ${command.description}`);
      if (command.allowedTools) frontmatterFields.push(`allowed-tools: ${command.allowedTools}`);
      if (command.argumentHint) frontmatterFields.push(`argument-hint: ${command.argumentHint}`);
      
      if (frontmatterFields.length > 0) {
        content = `---\n${frontmatterFields.join('\n')}\n---\n\n`;
      }
      
      content += command.content;
      
      await fs.writeFile(targetFile, content, 'utf-8');
    }

    return systemCommands.map(cmd => ({ name: cmd.name, description: cmd.description }));
  } catch (error) {
    // Log error but don't fail the installation
    console.warn('Warning: Failed to install system commands:', error);
    return [];
  }
}

