# Claude Code Central - System Specification

## Problem Being Solved

This system addresses the challenge of managing consistent AI assistant configurations across multiple software projects. It solves:

1. **Configuration Fragmentation**: Projects typically have scattered AI configuration files that become outdated and inconsistent
2. **Template Management**: Need for standardized project templates that can be applied and updated across projects
3. **Central Control**: Requirement to manage all AI assistant settings from a single location
4. **Version Control**: Need to track configuration changes and maintain backups
5. **Team Consistency**: Ensuring all projects follow organizational standards and best practices
6. **Agent Management**: Need for standardized agent templates that can be applied without being always present

## Core Solution Approach

The system creates a centralized storage repository that manages configurations for multiple projects through filesystem symlinks. Projects maintain links to centralized configurations rather than local copies, enabling instant updates and consistency.

## System Components

### 1. Central Storage System
- **Purpose**: Single source of truth for all project configurations
- **Location**: `storage/` directory containing individual project folders
- **Structure**: Each project gets a dedicated folder containing its configuration files
- **Persistence**: Configurations remain even if projects are unlinked

### 2. Template System
- **Purpose**: Pre-configured starting points for different project types
- **Location**: `templates/` directory with categorized subdirectories
- **Extensibility**: New templates can be added by creating directories with required files

### 3. Symlink Management
- **Purpose**: Connect projects to centralized configurations without file duplication
- **Implementation**: Creates `.claude` directory symlink and `CLAUDE.md` file symlink in projects
- **Benefits**: Instant propagation of updates, no sync required

### 4. Command System
- **Purpose**: Provide globally accessible commands for project management
- **Location**: Commands installed to user's `~/.claude/commands/` directory
- **Accessibility**: Available from any directory once installed

### 5. Agent System
- **Purpose**: Provide a set of predefined custom sub-agents that can be added to projects
- **Location**: `agents/` directory containing individual agents with their frontmatter metadata

## File Formats and Structures

### Configuration Files

#### settings.json
```json
{
  "permissions": {
    "allow": ["command patterns"],
    "deny": ["restricted patterns"]
  },
  "env": {
    "KEY": "value"
  }
}
```
- **Purpose**: Define allowed/denied operations and environment variables
- **Location**: In each project's storage directory
- **Format**: Standard JSON with permissions and environment sections

#### CLAUDE.md
```markdown
# Project Guidelines

## Section Headers
Content describing AI assistant behavior and project standards
```
- **Purpose**: Human-readable instructions for AI behavior
- **Location**: In project storage, symlinked to project root
- **Format**: Markdown with conventional section headers

#### .mcp.json
```json
{
  "mcpServers": {
    "server-name": {
      "command": "executable",
      "args": ["arguments"],
      "env": {}
    }
  }
}
```
- **Purpose**: Model Context Protocol server configurations
- **Location**: Project storage directory
- **Format**: JSON defining server commands and arguments

#### meta.json
```json
{
  "displayName": "Friendly Name",
  "description": "Template description",
  "icon": "emoji",
  "category": "category-name",
  "version": "1.0.0"
}
```
- **Purpose**: Template metadata for display and categorization
- **Location**: Each template directory
- **Format**: JSON with display and versioning information

#### .project-info
```
PROJECT_NAME=name
PROJECT_PATH=/absolute/path
PROJECT_TYPE=template-type
TEMPLATE_VERSION=1.0.0
SETUP_DATE=ISO-8601-timestamp
LAST_UPDATE=ISO-8601-timestamp
```
- **Purpose**: Track project metadata and history
- **Location**: Project storage directory
- **Format**: Shell-compatible key=value pairs

### Agent Files (Optional)

These are the agents that are part of the templates (as opposed to the
individual agents that can be added to existing projects)

#### agents/*.md
```markdown
---
name: agent-identifier
description: Agent purpose
model: model-type
color: display-color
---
# Agent Name

Agent instructions and behavior specifications
```
- **Purpose**: Define specialized AI agents for specific roles
- **Location**: `agents/` subdirectory in templates or projects
- **Format**: Markdown with YAML frontmatter

## Directory Structure

```
ccc/
├── storage/
│   └── project-name/
│       ├── CLAUDE.md
│       ├── settings.json
│       ├── .mcp.json
│       ├── .project-info
│       ├── settings.local.json (optional)
│       ├── commands/ (optional)
│       │   └── **/*.md
│       ├── agents/ (optional)
│       │   └── *.md
│       └── .backups/ (automatic)
│           └── backup-YYYYMMDD-HHMMSS/
├── templates/
│   └── template-name/
│       ├── CLAUDE.md
│       ├── settings.json
│       ├── meta.json
│       ├── mcp.json
│       └── commands/ (optional)
│       └── agents/ (optional)
├── commands/ (individual commands not part of templates)
│   └── **/*.md
├── agents/ (individual agents not part of templates)
│   └── *.md
└── scripts/
    └── [operation scripts]

project-location/
├── .claude -> ../central-location/storage/project-name/
└── CLAUDE.md -> ../central-location/storage/project-name/CLAUDE.md
```

## Operations Available

### Project Setup
- **Purpose**: Initialize new project with central management
- **Process**:
  1. Detect or select project type
  2. Create storage directory
  3. Copy template files to storage
  4. Create symlinks in project
  5. Handle existing configurations (backup if needed)
  6. Preserve custom content when found

### Project Update
- **Purpose**: Apply latest template changes to existing projects
- **Options**:
  - Force update without confirmation
  - Dry-run to preview changes
  - Template switching
  - Merge mode for intelligent updates
- **Process**:
  1. Create backup of current configuration
  2. Apply template updates
  3. Preserve custom sections in CLAUDE.md
  4. Report changes made

### Project Unlink
- **Purpose**: Remove central management from project
- **Options**:
  - Keep storage (remove symlinks only)
  - Migrate settings back to project
  - Force without confirmation
- **Process**:
  1. Remove symlinks from project
  2. Optionally copy configurations back
  3. Optionally delete from storage

### List Projects
- **Purpose**: Show all centrally managed projects
- **Display Options**:
  - Basic list with names and types
  - Verbose with sizes and paths
  - Full paths for scripting
- **Information Shown**:
  - Project name and type
  - Template version
  - Last update time
  - Storage size

### Install Management Commands
- **Purpose**: Make management commands globally available
- **Commands Installed**:
  - `cc-setup`: Setup project from current directory
  - `cc-status`: Check project status
  - `cc-update`: Update project templates
  - `cc-unlink`: Remove central management
- **Location**: User's `~/.claude/commands/` directory

### Add Custom Command
- **Purpose**: Add a predefined custom command to the current project
- **Source**: `ccc/commands/**/*.md`
- **Destination**: Project's `.claude/commands/` directory

### Add Custom Agent
- **Purpose**: Add a predefined custom sub-agent to the current project
- **Source**: `ccc/agents/*.md`
- **Destination**: Project's `.claude/agents/` directory

### Cleanup Backups
- **Purpose**: Manage backup accumulation
- **Options**:
  - Keep last N backups
  - Remove older than N days
  - Dry-run mode
  - Target specific project or all
- **Process**: Scan backup directories and remove based on criteria

### Validate Setup
- **Purpose**: Verify system integrity
- **Checks**:
  - Directory structure exists
  - Permissions are correct
  - Symlinks are valid
  - Templates are accessible

## Symlink Architecture

### Primary Symlinks
1. **`.claude` Directory Link**
   - Source: Project's `.claude` directory
   - Target: `storage/project-name/` directory
   - Purpose: All configuration files accessible through single link

2. **`CLAUDE.md` File Link**
   - Source: Project root `CLAUDE.md`
   - Target: `storage/project-name/CLAUDE.md`
   - Purpose: Direct access to instructions from project root

### Symlink Benefits
- Instant updates across all projects
- No file duplication
- Version control friendly (symlinks tracked, not content)
- Easy rollback through central storage

## Backup System

### Automatic Backups
- Created before updates
- Stored in `.backups/` subdirectory
- Named with timestamp: `backup-YYYYMMDD-HHMMSS`
- Include all configuration files

### Manual Backup Management
- Cleanup script for old backups
- Configurable retention policies
- Size-aware cleanup options

## Template System

### Template Types
- **engineering**: Development with testing and CI/CD
- **web-dev**: Frontend frameworks and build tools
- **data-science**: ML/AI and data analysis
- **devops**: Infrastructure and orchestration
- **seo**: Content optimization
- **custom**: Minimal starting point
- **dev-team-agents**: Multi-agent development team

### Template Extension
- Add new directory to `templates/`
- Include required files: `CLAUDE.md`, `settings.json`, `meta.json`
- Optional: Add `agents/` directory for specialized agents
- Auto-discovered by system

## Content Preservation

### Custom Content Detection
- Identifies user additions to CLAUDE.md
- Looks for section markers: `## Project-Specific`, `# Custom`
- Preserves content during updates
- Merges template updates with custom content

### Backup Strategy
- Automatic backups before destructive operations
- Timestamped backup directories
- Option to keep storage when unlinking
- Migration path to return to local management

## File Change Tracking

### Project Metadata
- Setup date and last update timestamps
- Template version tracking
- Project type and path recording
- Stored in `.project-info` file

### Version Management
- Template versions in `meta.json`
- Update history through backup timestamps
- No external version control required

## Key Design Principles

### Simplicity
- No database required
- Plain text configuration files
- Standard filesystem operations
- Shell-compatible formats

### Transparency
- All configurations visible as files
- Symlinks show connection clearly
- Backups accessible directly
- No hidden state

### Flexibility
- Templates extensible
- Custom content preserved
- Multiple management modes
- Gradual adoption possible

### Safety
- Automatic backups
- Non-destructive updates
- Confirmation prompts
- Dry-run options

## Implementation Notes for Single Binary

### Core Requirements
- Filesystem operations (read, write, symlink)
- JSON parsing for configuration files
- Markdown processing for CLAUDE.md
- Path resolution and validation
- Directory traversal capabilities

### User Interface
- Interactive prompts for confirmations
- Colored output for clarity
- Progress indicators for long operations
- Table formatting for lists

### Error Handling
- Graceful handling of missing directories
- Permission error detection
- Symlink validation
- Backup recovery options

### Performance Considerations
- Lazy loading of templates
- Efficient directory scanning
- Minimal file operations
- Cached template metadata

This specification defines a complete configuration management system that operates independently of implementation technology, providing centralized control while maintaining project autonomy through filesystem symlinks.