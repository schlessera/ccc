#!/bin/bash

# CCC System Validation Script
# Validates the integrity of the CCC system and all managed projects

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Counters
ERRORS=0
WARNINGS=0
CHECKS=0

# Helper functions
log_info() {
    echo -e "${NC}$1${NC}"
}

log_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
    WARNINGS=$((WARNINGS + 1))
}

log_error() {
    echo -e "${RED}✗ $1${NC}"
    ERRORS=$((ERRORS + 1))
}

check_directory() {
    local dir="$1"
    local name="$2"
    CHECKS=$((CHECKS + 1))
    
    if [[ -d "$dir" ]]; then
        log_success "$name directory exists: $dir"
        return 0
    else
        log_error "$name directory missing: $dir"
        return 1
    fi
}

check_file() {
    local file="$1"
    local name="$2"
    CHECKS=$((CHECKS + 1))
    
    if [[ -f "$file" ]]; then
        log_success "$name file exists: $file"
        return 0
    else
        log_error "$name file missing: $file"
        return 1
    fi
}

check_symlink() {
    local link="$1"
    local target="$2"
    local name="$3"
    CHECKS=$((CHECKS + 1))
    
    if [[ -L "$link" ]]; then
        local actual_target
        actual_target=$(readlink "$link")
        if [[ "$actual_target" == "$target" ]]; then
            log_success "$name symlink valid: $link -> $target"
            return 0
        else
            log_error "$name symlink incorrect: $link -> $actual_target (expected: $target)"
            return 1
        fi
    else
        log_error "$name symlink missing: $link"
        return 1
    fi
}

# Get CCC directories
if [[ -n "$CCC_CONFIG_DIR" ]]; then
    CONFIG_DIR="$CCC_CONFIG_DIR"
else
    CONFIG_DIR="$HOME/.ccc"
fi

STORAGE_DIR="$CONFIG_DIR/storage"
TEMPLATES_DIR="$CONFIG_DIR/templates"
COMMANDS_DIR="$CONFIG_DIR/commands"
AGENTS_DIR="$CONFIG_DIR/agents"
HOOKS_DIR="$CONFIG_DIR/hooks"

echo "CCC System Validation"
echo "===================="
echo "Config directory: $CONFIG_DIR"
echo

# Check main directories
log_info "Checking main directories..."
check_directory "$CONFIG_DIR" "Main config"
check_directory "$STORAGE_DIR" "Storage"
check_directory "$TEMPLATES_DIR" "Templates"
check_directory "$COMMANDS_DIR" "Commands"
check_directory "$AGENTS_DIR" "Agents"
check_directory "$HOOKS_DIR" "Hooks"

echo

# Check templates
log_info "Validating templates..."
if [[ -d "$TEMPLATES_DIR" ]]; then
    for template_dir in "$TEMPLATES_DIR"/*; do
        if [[ -d "$template_dir" ]]; then
            template_name=$(basename "$template_dir")
            log_info "Checking template: $template_name"
            
            check_file "$template_dir/meta.json" "Template meta"
            check_file "$template_dir/settings.json" "Template settings"
            check_file "$template_dir/CLAUDE.md" "Template CLAUDE.md"
            check_file "$template_dir/.mcp.json" "Template MCP config"
        fi
    done
fi

echo

# Check managed projects
log_info "Validating managed projects..."
if [[ -d "$STORAGE_DIR" ]]; then
    project_count=0
    for project_dir in "$STORAGE_DIR"/*; do
        if [[ -d "$project_dir" ]]; then
            project_name=$(basename "$project_dir")
            project_count=$((project_count + 1))
            
            log_info "Checking project: $project_name"
            
            # Check project files
            check_file "$project_dir/.project-info" "Project info"
            check_file "$project_dir/CLAUDE.md" "Project CLAUDE.md"
            check_file "$project_dir/settings.json" "Project settings"
            
            # Check if project path is recorded and valid
            if [[ -f "$project_dir/.project-info" ]]; then
                local project_path
                project_path=$(grep "^PROJECT_PATH=" "$project_dir/.project-info" | cut -d= -f2)
                
                if [[ -n "$project_path" && -d "$project_path" ]]; then
                    log_success "Project path exists: $project_path"
                    
                    # Check symlinks
                    check_symlink "$project_path/.claude" "$project_dir" "Project .claude"
                    check_symlink "$project_path/CLAUDE.md" "$project_dir/CLAUDE.md" "Project CLAUDE.md"
                else
                    log_warning "Project path not found or invalid: $project_path"
                fi
            fi
        fi
    done
    
    if [[ $project_count -eq 0 ]]; then
        log_warning "No managed projects found"
    else
        log_success "Found $project_count managed projects"
    fi
fi

echo

# Summary
echo "Validation Summary"
echo "=================="
echo "Total checks: $CHECKS"
log_success "Passed: $((CHECKS - ERRORS - WARNINGS))"
if [[ $WARNINGS -gt 0 ]]; then
    log_warning "Warnings: $WARNINGS"
fi
if [[ $ERRORS -gt 0 ]]; then
    log_error "Errors: $ERRORS"
fi

echo

if [[ $ERRORS -eq 0 ]]; then
    log_success "System validation completed successfully!"
    exit 0
else
    log_error "System validation failed with $ERRORS errors"
    exit 1
fi