# Claude Code Central (CCC)

🌟 **Centralized AI Configuration Manager** - Manage consistent AI assistant configurations across multiple software projects.

## ✨ Features

- **Centralized Storage** - Single source of truth for all project configurations
- **Template System** - Pre-configured templates for different project types
- **Symlink Management** - Instant updates across all projects
- **Smart Detection** - Automatically detects project type
- **Content Preservation** - Preserves custom content during updates
- **Backup System** - Automatic versioned backups

## 🚀 Quick Start

```bash
# Run interactively
npx claude-code-central

# Or use specific commands
npx ccc setup              # Setup current project
npx ccc list               # List managed projects  
npx ccc update             # Update templates
npx ccc add-agent          # Add AI agents
```

## 📦 Installation

### Using npx (recommended)
No installation needed! Just run:
```bash
npx claude-code-central
```

### Global Installation
```bash
npm install -g claude-code-central
ccc
```

### Install Global Commands
Make commands available from anywhere:
```bash
npx ccc install
```

This installs:
- `cc-setup` - Setup project from any directory
- `cc-status` - Check project configuration status
- `cc-update` - Update project templates
- `cc-unlink` - Remove central management

## 📚 Commands

| Command | Description |
|---------|-------------|
| `setup` | Setup current project with central management |
| `list` | List all managed projects |
| `update` | Update project templates |
| `unlink` | Remove central management from project |
| `add-agent` | Add AI agent to current project |
| `add-command` | Add custom command to current project |
| `install` | Install global management commands |
| `cleanup` | Clean up old backups |
| `validate` | Validate system integrity |
| `status` | Check current project status |

## 🎨 Available Templates

- **🏗️ engineering** - Full stack with testing & CI/CD
- **🌐 web-dev** - Frontend frameworks & build tools
- **🔬 data-science** - ML/AI and data analysis
- **⚙️ devops** - Infrastructure & orchestration
- **📊 seo** - Content optimization & analytics
- **✨ custom** - Minimal starting point
- **👥 dev-team** - Multi-agent development team

## 📁 Project Structure

After setup, your project will have:

```
your-project/
├── .claude/              → Symlink to central storage
│   ├── settings.json     - Permissions and environment
│   ├── .mcp.json        - MCP server configurations
│   ├── commands/        - Custom commands
│   └── agents/          - AI agents
└── CLAUDE.md            → Symlink to central instructions
```

## 🔄 How It Works

1. **Central Storage**: All configurations stored in `~/.ccc/storage/`
2. **Symlinks**: Projects link to central configurations
3. **Instant Updates**: Changes propagate immediately
4. **Smart Merging**: Custom content preserved during updates

## 🛠️ Development

```bash
# Clone the repository
git clone https://github.com/schlessera/ccc.git
cd ccc

# Install dependencies
npm install

# Build the project
npm run build

# Run in development mode
npm run dev

# Run tests
npm test
```

## 📝 Configuration Files

### settings.json
Controls permissions and environment variables:
```json
{
  "permissions": {
    "allow": ["npm:*", "git:*"],
    "deny": ["rm -rf"]
  },
  "env": {
    "NODE_ENV": "development"
  }
}
```

### CLAUDE.md
Human-readable instructions for AI behavior and project standards.

### .mcp.json
Model Context Protocol server configurations.

## 🤝 Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) for details.

## 📄 License

MIT © [Alain Schlesser](https://github.com/schlessera)

## 🔗 Links

- [Documentation](https://github.com/schlessera/ccc/wiki)
- [Issues](https://github.com/schlessera/ccc/issues)
- [Discussions](https://github.com/schlessera/ccc/discussions)

---

Built with ❤️ for the AI-assisted development community