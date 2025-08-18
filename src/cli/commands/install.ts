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

      // Create a smart launcher script that works across environments
      const launcherScript = createSmartLauncher(sourcePath);
      
      await fs.writeFile(globalCccPath, launcherScript);
      await fs.chmod(globalCccPath, 0o755);

      // Install system commands
      const systemCommands = await installSystemCommands();

      spinner.stop('Installation completed');

      // Check if install path is in PATH
      const pathEnv = process.env.PATH || '';
      const pathIncludes = pathEnv.split(path.delimiter).includes(installPath);

      const lines = [
        `Installed: ${chalk.green(globalCccPath)}`,
        `Source: ${chalk.gray(sourcePath)}`,
        '',
        'Smart launcher installed - works across different environments.',
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

function createSmartLauncher(sourcePath: string): string {
  return `#!/usr/bin/env bash

# CCC Smart Launcher
# This script intelligently launches CCC based on available installation methods

set -e

# Colors for output
RED='\\033[0;31m'
YELLOW='\\033[1;33m'
GREEN='\\033[0;32m'
NC='\\033[0m' # No Color

# Function to print colored output
print_error() { echo -e "\${RED}❌ \$1\${NC}" >&2; }
print_warning() { echo -e "\${YELLOW}⚠️  \$1\${NC}" >&2; }
print_success() { echo -e "\${GREEN}✅ \$1\${NC}" >&2; }

# Method 1: Try the original source path (for development environments)
if [ -f "${sourcePath}" ]; then
    # Check if node_modules exists relative to source
    SOURCE_DIR="\$(dirname "${sourcePath}")"
    NODE_MODULES_DIR="\$(dirname "\$(dirname "\$SOURCE_DIR")")/node_modules"
    
    if [ -d "\$NODE_MODULES_DIR" ]; then
        exec "${sourcePath}" "\$@"
    fi
fi

# Method 2: Try npx with exact package name (most reliable)
if command -v npx &> /dev/null; then
    if npx --version &> /dev/null; then
        exec npx claude-code-central "\$@"
    fi
fi

# Method 3: Try global npm installation
if command -v ccc &> /dev/null && [ "\$(which ccc)" != "\$0" ]; then
    exec ccc "\$@"
fi

# Method 4: Try node with global package
if command -v node &> /dev/null; then
    # Try to find globally installed package
    GLOBAL_PATH="\$(npm root -g 2>/dev/null)/claude-code-central/dist/cli/index.js"
    if [ -f "\$GLOBAL_PATH" ]; then
        exec node "\$GLOBAL_PATH" "\$@"
    fi
fi

# If all methods fail, provide helpful error message
print_error "Cannot locate CCC installation"
echo ""
echo "CCC can be used in several ways:"
echo ""
echo "1. 📦 Use via npx (recommended):"
echo "   \${GREEN}npx claude-code-central \$*\${NC}"
echo ""
echo "2. 🌐 Install globally via npm:"
echo "   \${GREEN}npm install -g claude-code-central\${NC}"
echo "   \${GREEN}ccc \$*\${NC}"
echo ""
echo "3. 🔧 For development:"
echo "   \${GREEN}git clone <repo> && cd ccc && npm install && npm run build\${NC}"
echo "   \${GREEN}./dist/cli/index.js \$*\${NC}"
echo ""
print_warning "Falling back to npx (may be slower on first run)"
exec npx claude-code-central "\$@"
`;
}

