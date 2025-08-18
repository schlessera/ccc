---
description: Configure global gitignore for CCC-managed files
allowed-tools: Bash, Read, Write
argument-hint: optional force flag
---

Configure the global gitignore to exclude CCC-managed files from all git repositories.

This command ensures that Claude Code Central managed files are automatically ignored across all your git repositories without needing to modify individual project .gitignore files.

## What this command does:

1. **Detects existing global gitignore configuration**
   - Checks if `core.excludesfile` is already configured
   - Finds the current global gitignore file location

2. **Creates or updates global gitignore**
   - Uses existing file if configured, or creates `~/.gitignore_global`
   - Adds CCC-specific ignore patterns if not already present

3. **Configures git to use the global gitignore**
   - Sets `core.excludesfile` if not already configured
   - Verifies the configuration is working

## Files that will be ignored:
- `CLAUDE.md` - CCC configuration files
- `.claude/` - CCC project directories
- `CLAUDE.md.backup-*` - CCC backup files with timestamps
- `.claude.backup-*/` - CCC backup directories with timestamps

## Usage:
- Run without arguments to add patterns if missing
- Use "force" argument to overwrite existing patterns: {$ARGUMENTS}

## Implementation Steps:

### Step 1: Check current global gitignore configuration
First, determine if git already has a global gitignore configured:

```bash
git config --global core.excludesfile
```

### Step 2: Determine target file location
If no global gitignore is configured, we'll use a standard location. Check what the git config returns and decide on the appropriate path.

### Step 3: Handle existing file or create new one
If the file exists, read it to check for our patterns. If it doesn't exist, we'll create it.

### Step 4: Add CCC ignore patterns
Add these patterns to the global gitignore file if they're not already present:

```gitignore
# Claude Code Central managed files
CLAUDE.md
.claude/
CLAUDE.md.backup-*
.claude.backup-*/
```

### Step 5: Configure git if needed
If we created a new file or git wasn't configured to use a global gitignore, set the configuration:

```bash
git config --global core.excludesfile ~/.gitignore_global
```

### Step 6: Verify and report
Confirm the configuration is working and report what was accomplished.

## Force Mode:
If {$ARGUMENTS} contains "force", update the patterns even if they already exist, ensuring they're in the correct format.

Execute these steps carefully, checking for errors at each stage, and provide clear feedback about what was accomplished.