#!/bin/bash

# CCC Backup Cleanup Script
# Removes old backup files based on retention policy

set -e

# Default values
DAYS=30
DRY_RUN=false
PROJECT=""

# Usage function
usage() {
    echo "Usage: $0 [OPTIONS]"
    echo "Options:"
    echo "  -d, --days DAYS     Remove backups older than DAYS (default: 30)"
    echo "  -p, --project NAME  Target specific project"
    echo "  --dry-run          Show what would be deleted without actually deleting"
    echo "  -h, --help         Show this help message"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -d|--days)
            DAYS="$2"
            shift 2
            ;;
        -p|--project)
            PROJECT="$2"
            shift 2
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        -h|--help)
            usage
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            usage
            exit 1
            ;;
    esac
done

# Validate days parameter
if ! [[ "$DAYS" =~ ^[0-9]+$ ]]; then
    echo "Error: Days must be a positive number"
    exit 1
fi

# Get CCC storage directory
if [[ -n "$CCC_CONFIG_DIR" ]]; then
    STORAGE_DIR="$CCC_CONFIG_DIR/storage"
else
    STORAGE_DIR="$HOME/.ccc/storage"
fi

if [[ ! -d "$STORAGE_DIR" ]]; then
    echo "Error: CCC storage directory not found: $STORAGE_DIR"
    exit 1
fi

echo "CCC Backup Cleanup"
echo "=================="
echo "Storage directory: $STORAGE_DIR"
echo "Retention: $DAYS days"
echo "Dry run: $DRY_RUN"
echo

# Function to clean project backups
clean_project_backups() {
    local project_dir="$1"
    local project_name=$(basename "$project_dir")
    local backups_dir="$project_dir/.backups"
    
    if [[ ! -d "$backups_dir" ]]; then
        return
    fi
    
    echo "Checking project: $project_name"
    
    # Find old backup directories
    local old_backups
    old_backups=$(find "$backups_dir" -maxdepth 1 -type d -name "backup-*" -mtime +$DAYS 2>/dev/null || true)
    
    if [[ -z "$old_backups" ]]; then
        echo "  No old backups found"
        return
    fi
    
    local count=0
    while IFS= read -r backup_dir; do
        if [[ -n "$backup_dir" ]]; then
            count=$((count + 1))
            local backup_name=$(basename "$backup_dir")
            echo "  Found old backup: $backup_name"
            
            if [[ "$DRY_RUN" == "false" ]]; then
                rm -rf "$backup_dir"
                echo "    Deleted: $backup_name"
            else
                echo "    Would delete: $backup_name"
            fi
        fi
    done <<< "$old_backups"
    
    if [[ $count -gt 0 ]]; then
        echo "  Processed $count old backups"
    fi
}

# Main cleanup logic
if [[ -n "$PROJECT" ]]; then
    # Clean specific project
    project_path="$STORAGE_DIR/$PROJECT"
    if [[ -d "$project_path" ]]; then
        clean_project_backups "$project_path"
    else
        echo "Error: Project not found: $PROJECT"
        exit 1
    fi
else
    # Clean all projects
    for project_dir in "$STORAGE_DIR"/*; do
        if [[ -d "$project_dir" ]]; then
            clean_project_backups "$project_dir"
        fi
    done
fi

echo
echo "Backup cleanup completed!"