# Claude Code Central - CLI UI Mockups

## 🎨 Visual Design System

### Color Palette

- **Primary**: Cyan - Headers, prompts, highlights
- **Success**: Green - Confirmations, completions
- **Warning**: Yellow - Cautions, updates available
- **Error**: Red - Errors, failures
- **Info**: Blue - Information, tips
- **Muted**: Gray - Secondary text, descriptions

### Typography Hierarchy

- **Bold Cyan**: Primary headers and titles
- **Bold**: Important information, prompts
- **Regular**: Standard text
- **Gray**: Secondary information, descriptions
- **Dim**: Disabled or less important items

---

## 1. Initial Launch Screen

```
$ npx claude-code-central

🌟 Claude Code Central v1.0.0
Centralized AI Configuration Manager

? What would you like to do? (Use arrow keys)
❯ 🚀 Setup current project
  📋 List managed projects
  🔄 Update project configuration
  🔗 Unlink project
  ➕ Add command to project
  🤖 Add agent to project
  📦 Install global commands
  🧹 Cleanup old backups
  ✅ Validate setup
  ❓ Help
```

---

## 2. Project Setup Flow

### 2.1 Initial Detection

```
$ ccc setup

🔍 Analyzing current project...

Project Analysis:
  Directory:  /Users/dev/my-app
  Type:       Node.js Application
  Framework:  React + TypeScript
  Files:      234 files, 2.3 MB
  Git:        ✓ Repository detected
```

### 2.2 Template Selection

```
? Select a template for this project:

  🏗️  engineering    Full stack with testing & CI/CD
❯ 🌐  web-dev       Frontend frameworks & build tools
  🔬  data-science  ML/AI and data analysis
  ⚙️  devops        Infrastructure & orchestration
  📊  seo           Content optimization & analytics
  ✨  custom        Minimal starting point
  👥  dev-team      Multi-agent development team

web-dev:
  Perfect for React, Vue, Angular projects
  Includes: ESLint, Prettier, Testing configs, Git hooks
```

### 2.3 Project Naming

```
? Enter a name for this project: my-awesome-app

  Use lowercase letters and hyphens
  Keep it short and descriptive
  Examples: my-app, api-gateway, blog
```

### 2.4 Setup Progress

```
📦 Setting up "my-awesome-app"...

  ✓ Created storage directory
  ✓ Copied template files
  ⠙ Creating symlinks...
```

### 2.5 Conflict Resolution

```
⚠️  Existing Configuration Found

CLAUDE.md:
  Modified: 2 days ago
  Size: 3.2 KB
  Contains custom sections

? How would you like to proceed?
  ◯ Backup and replace
  ◉ Merge with template (preserve custom sections)
  ◯ Keep existing (skip file)
  ◯ View differences
```

### 2.6 Success Summary

```
✨ Successfully configured my-awesome-app!

Configuration Summary:
  Project:     my-awesome-app
  Template:    web-dev v2.1.0
  Storage:     ~/.ccc/storage/my-awesome-app
  Symlinks:    ✓ .claude  ✓ CLAUDE.md

Included Features:
  • 3 custom commands
  • 2 AI agents (test-writer, doc-generator)
  • ESLint + Prettier configs
  • Git hooks configuration

💡 Next Steps:
  1. Review CLAUDE.md for project guidelines
  2. Run 'ccc add-agent' to add more agents
  3. Customize .claude/settings.json as needed
```

---

## 3. Project List View

### 3.1 Standard List

```
$ ccc list

Centrally Managed Projects (7)

  api-gateway        devops   1.2.0   2 days ago     142 KB
  company-website    web-dev  2.1.0   1 week ago     89 KB
  analytics-dash     data-sci 1.0.0   3 weeks ago    256 KB
  internal-tools     engineer 2.0.0   1 month ago    178 KB
  mobile-app         custom   1.0.0   2 months ago   45 KB
  ml-pipeline        data-sci 1.0.0   3 months ago   312 KB
  blog-engine        seo      1.1.0   6 months ago   67 KB

Total: 1.1 MB across 7 projects
Run 'ccc list --verbose' for detailed information
```

### 3.2 Verbose List

```
$ ccc list --verbose

Centrally Managed Projects

api-gateway
  Template:    devops v1.2.0
  Path:        /Users/dev/projects/api-gateway
  Storage:     ~/.ccc/storage/api-gateway
  Created:     2024-01-15 10:30:00
  Updated:     2024-03-12 14:22:00
  Backups:     3 (142 KB total)
  Commands:    5 custom commands
  Agents:      security-scanner, performance-monitor

company-website
  Template:    web-dev v2.1.0
  Path:        /Users/dev/sites/company-website
  Storage:     ~/.ccc/storage/company-website
  Created:     2024-02-01 09:15:00
  Updated:     2024-03-07 16:45:00
  Backups:     2 (89 KB total)
  Commands:    3 custom commands
  Agents:      ui-designer, accessibility-checker

[Showing 2 of 7 projects. Press Space for more...]
```

---

## 4. Update Flow

### 4.1 Update Check

```
$ ccc update

⠋ Checking for template updates...

Updates Available:

  api-gateway      devops 1.2.0 → 1.3.0    (+12 -3)
  company-website  web-dev 2.1.0 → 2.2.0   (+25 -8)
  blog-engine      seo 1.1.0 → 1.2.0       (+5 -2)

? Select projects to update: (Press space to select)
 ◉ api-gateway      - Adds Kubernetes support
 ◯ company-website  - New React 18 features
 ◉ blog-engine      - SEO improvements
```

### 4.2 Change Preview

```
? Review changes for api-gateway? Yes

Template Changes: devops 1.2.0 → 1.3.0

settings.json:
  + "permissions.allow": ["docker:*", "kubectl:*"]
  - "permissions.allow": ["docker:run"]

CLAUDE.md:
  + ## Kubernetes Guidelines
  + Always use declarative configurations...
  + Prefer StatefulSets for stateful applications

.mcp.json:
  + "k8s-server": {
  +   "command": "kubectl-mcp",
  +   "args": ["--context", "production"]
  + }

✅ Custom sections will be preserved

? Apply these changes? (Y/n)
```

### 4.3 Update Progress

```
Updating projects...

api-gateway:
  ✓ Created backup: backup-20240314-152300
  ✓ Applied template updates
  ✓ Preserved custom sections
  ✓ Updated metadata

blog-engine:
  ⠙ Merging template changes...
```

---

## 5. Interactive Agent Selection

```
$ ccc add-agent

Available AI Agents

Search: test█

  test-writer    Comprehensive test generation    Testing
  test-runner    Execute and analyze tests        Testing

test-writer:
  Generates comprehensive test suites for your code
  
  Capabilities:
  • Unit test generation
  • Integration test scenarios
  • Mock and stub creation
  • Coverage analysis
  
  Model: gpt-4-turbo
  Color: green

? Add test-writer to current project? (Y/n)
```

---

## 6. Command Installation

```
$ ccc install

Installing Global Commands...

Installation Details:
  Target: ~/.claude/commands/
  
  Global CCC installation:
    • ccc - Main CCC executable available from any directory
  
  Shell integration:
    ✓ Bash profile will be updated
    ✓ Commands available globally after restart

? Proceed with installation? (Y/n) Y

Installing...
  ✓ Created installation directory
  ✓ Installed global ccc command
  ✓ Updated shell profile

✅ Installation complete!

Run 'source ~/.bashrc' or restart your terminal to use the global ccc command
```

---

## 7. Status Check

```
$ ccc status

Project Status: my-awesome-app

Configuration:
  ✅ Symlinks valid
  ✅ Storage accessible
  ✅ Template up-to-date
  ✅ No conflicts detected

Storage Path:
  ~/.ccc/storage/my-awesome-app

Active Links:
  .claude → ../../../.ccc/storage/my-awesome-app
  CLAUDE.md → ../../../.ccc/storage/my-awesome-app/CLAUDE.md

Statistics:
  • Setup Date: 2024-03-14
  • Last Update: 2 hours ago
  • Template: web-dev v2.1.0
  • Storage Size: 89 KB
  • Backups: 2 (178 KB)
```

---

## 8. Error States

### 8.1 Permission Error

```
❌ Permission Denied

Cannot create symlink at:
  /Users/dev/project/.claude

Possible solutions:
  • Run with sudo: sudo npx ccc setup
  • Check directory permissions
  • Ensure parent directory is writable

Error Code: EACCES
```

### 8.2 Validation Failure

```
⚠️  Validation Issues Found

Issues:
  ❌ Broken symlink: .claude
     Target does not exist
  
  ⚠️  Outdated template: web-dev 1.0.0
     Latest version: 2.1.0
  
  ❌ Missing file: settings.json
     Required configuration file not found

? Would you like to repair these issues? (Y/n)
```

---

## 9. Help System

```
$ ccc --help

🌟 Claude Code Central v1.0.0

USAGE
  $ ccc [COMMAND] [OPTIONS]

COMMANDS
  setup          Setup current project with central management
  list           List all managed projects
  update         Update project templates
  unlink         Remove central management from project
  add-agent      Add AI agent to current project
  add-command    Add custom command to current project
  install        Install global management commands
  cleanup        Clean up old backups
  validate       Validate system integrity
  status         Check current project status

OPTIONS
  -v, --version  Show version
  -h, --help     Show help
  --verbose      Verbose output
  --quiet        Minimal output
  --no-color     Disable colors
  --dry-run      Preview changes without applying

EXAMPLES
  $ ccc setup                    # Interactive setup
  $ ccc setup --template=web-dev # Setup with specific template
  $ ccc list --verbose           # Detailed project list
  $ ccc update --all             # Update all projects
  $ ccc cleanup --days=30        # Remove backups older than 30 days

LEARN MORE
  Documentation: https://github.com/user/ccc
  Issues: https://github.com/user/ccc/issues
```

---

## 10. Loading States

### Spinner Examples
```
⠋ Analyzing project structure...
⠙ Loading templates...
⠹ Creating symlinks...
⠸ Backing up existing files...
⠼ Applying updates...
⠴ Validating configuration...
```

### Progress Bar Examples

```
Copying files:     [████████████████████░░░░░░░░] 67%
Creating backups:  [████████████████████████████] 100%
```