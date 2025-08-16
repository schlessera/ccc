import * as p from '@clack/prompts';
import chalk from 'chalk';
import * as fs from 'fs-extra';
import * as path from 'path';
import { StorageManager } from '../../core/storage/manager';
import { PathUtils } from '../../utils/paths';
import { getService, ServiceKeys } from '../../core/container';

interface CleanupOptions {
  days?: string;
  keep?: string;
  project?: string;
  dryRun?: boolean;
}

interface BackupInfo {
  path: string;
  name: string;
  date: Date;
  size: number;
  age: number; // days
}

export async function cleanupCommand(options: CleanupOptions): Promise<void> {
  try {
    const storageManager = getService<StorageManager>(ServiceKeys.StorageManager);
    const daysThreshold = parseInt(options.days || '30');
    const keepCount = options.keep ? parseInt(options.keep) : undefined;
    
    if (options.project) {
      await cleanupSpecificProject(options.project, storageManager, daysThreshold, keepCount, options.dryRun);
    } else {
      await cleanupAllProjects(storageManager, daysThreshold, keepCount, options.dryRun);
    }

  } catch (error: any) {
    p.cancel(chalk.red(error.message));
    process.exit(1);
  }
}

async function cleanupAllProjects(
  storageManager: StorageManager,
  daysThreshold: number,
  keepCount: number | undefined,
  dryRun?: boolean
): Promise<void> {
  const projects = await storageManager.listProjects();
  
  if (projects.length === 0) {
    p.note('No projects to clean up', '📋 Empty Project List');
    return;
  }

  let totalBackupsFound = 0;
  let totalBackupsToDelete = 0;
  let totalSizeToFree = 0;

  const cleanupData = [];

  // Analyze all projects
  for (const project of projects) {
    const backupsDir = PathUtils.getProjectBackupsDir(project);
    const backups = await getBackups(backupsDir);
    
    if (backups.length === 0) continue;
    
    const toDelete = getBackupsToDelete(backups, daysThreshold, keepCount);
    
    if (toDelete.length > 0) {
      totalBackupsFound += backups.length;
      totalBackupsToDelete += toDelete.length;
      totalSizeToFree += toDelete.reduce((sum, b) => sum + b.size, 0);
      
      cleanupData.push({
        project,
        totalBackups: backups.length,
        toDelete,
        sizeToFree: toDelete.reduce((sum, b) => sum + b.size, 0)
      });
    }
  }

  if (totalBackupsToDelete === 0) {
    p.note('No backups need cleanup', chalk.green('🧹 All Clean'));
    return;
  }

  // Show cleanup summary
  const summaryLines = [
    `Projects: ${cleanupData.length}`,
    `Total backups: ${totalBackupsFound}`,
    `To delete: ${totalBackupsToDelete}`,
    `Space to free: ${formatSize(totalSizeToFree)}`
  ];

  if (dryRun) {
    p.note(summaryLines.join('\n'), '🔍 Cleanup Preview (Dry Run)');
    
    // Show details for each project
    for (const data of cleanupData) {
      const lines = data.toDelete.map(backup => 
        `  ${backup.name} (${backup.age} days old, ${formatSize(backup.size)})`
      );
      p.note(lines.join('\n'), `${data.project} - ${data.toDelete.length} backups`);
    }
    
    p.note('Run without --dry-run to perform cleanup', '💡 Tip');
    return;
  }

  p.note(summaryLines.join('\n'), '🧹 Cleanup Summary');

  const proceed = await p.confirm({
    message: `Delete ${totalBackupsToDelete} old backups?`,
    initialValue: true
  });

  if (!proceed || p.isCancel(proceed)) {
    p.outro('Cleanup cancelled');
    return;
  }

  // Perform cleanup
  let deletedCount = 0;
  let freedSize = 0;

  for (const data of cleanupData) {
    const spinner = p.spinner();
    spinner.start(`Cleaning ${data.project}`);
    
    for (const backup of data.toDelete) {
      try {
        await fs.remove(backup.path);
        deletedCount++;
        freedSize += backup.size;
      } catch (error) {
        // Continue with other backups if one fails
      }
    }
    
    spinner.stop(`Cleaned ${data.project}: ${data.toDelete.length} backups`);
  }

  p.note(
    [
      `Deleted: ${deletedCount} backups`,
      `Freed: ${formatSize(freedSize)}`
    ].join('\n'),
    chalk.green('🎉 Cleanup Complete')
  );
}

async function cleanupSpecificProject(
  projectName: string,
  storageManager: StorageManager,
  daysThreshold: number,
  keepCount: number | undefined,
  dryRun?: boolean
): Promise<void> {
  const projectInfo = await storageManager.getProjectInfo(projectName);
  if (!projectInfo) {
    p.cancel(`Project not found: ${projectName}`);
    process.exit(1);
  }

  const backupsDir = PathUtils.getProjectBackupsDir(projectName);
  const backups = await getBackups(backupsDir);

  if (backups.length === 0) {
    p.note(`No backups found for ${projectName}`, '🧹 Nothing to Clean');
    return;
  }

  const toDelete = getBackupsToDelete(backups, daysThreshold, keepCount);
  
  if (toDelete.length === 0) {
    p.note(`All ${backups.length} backups are recent enough to keep`, chalk.green('✅ No Cleanup Needed'));
    return;
  }

  const sizeToFree = toDelete.reduce((sum, b) => sum + b.size, 0);

  if (dryRun) {
    const lines = [
      `Project: ${projectName}`,
      `Total backups: ${backups.length}`,
      `To delete: ${toDelete.length}`,
      `Space to free: ${formatSize(sizeToFree)}`,
      '',
      'Backups to delete:'
    ];
    
    lines.push(...toDelete.map(backup => 
      `  ${backup.name} (${backup.age} days old, ${formatSize(backup.size)})`
    ));
    
    p.note(lines.join('\n'), '🔍 Cleanup Preview (Dry Run)');
    return;
  }

  const proceed = await p.confirm({
    message: `Delete ${toDelete.length} old backups for ${projectName}?`,
    initialValue: true
  });

  if (!proceed || p.isCancel(proceed)) {
    p.outro('Cleanup cancelled');
    return;
  }

  const spinner = p.spinner();
  spinner.start('Deleting old backups');
  
  let deleted = 0;
  for (const backup of toDelete) {
    try {
      await fs.remove(backup.path);
      deleted++;
    } catch (error) {
      // Continue with others
    }
  }
  
  spinner.stop('Cleanup completed');

  p.note(
    [
      `Deleted: ${deleted} backups`,
      `Freed: ${formatSize(sizeToFree)}`
    ].join('\n'),
    chalk.green('🎉 Project Cleaned')
  );
}

async function getBackups(backupsDir: string): Promise<BackupInfo[]> {
  if (!await PathUtils.exists(backupsDir)) {
    return [];
  }

  const entries = await fs.readdir(backupsDir);
  const backups: BackupInfo[] = [];

  for (const entry of entries) {
    if (!entry.startsWith('backup-')) continue;
    
    const backupPath = path.join(backupsDir, entry);
    const stat = await fs.stat(backupPath);
    
    // Extract timestamp from backup name (backup-YYYY-MM-DD-HH-mm-ss.tar.gz)
    const timestampMatch = entry.match(/backup-(\d{4}-\d{2}-\d{2}-\d{2}-\d{2}-\d{2})/);
    let date = stat.mtime; // fallback to file modification time
    
    if (timestampMatch) {
      const [, timestamp] = timestampMatch;
      const formattedTimestamp = timestamp.replace(/-/g, '').replace(/(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/, '$1-$2-$3T$4:$5:$6');
      date = new Date(formattedTimestamp);
    }

    const now = new Date();
    const age = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    backups.push({
      path: backupPath,
      name: entry,
      date,
      size: stat.size,
      age
    });
  }

  return backups.sort((a, b) => b.date.getTime() - a.date.getTime()); // newest first
}

function getBackupsToDelete(
  backups: BackupInfo[],
  daysThreshold: number,
  keepCount?: number
): BackupInfo[] {
  let toDelete = backups.filter(backup => backup.age > daysThreshold);

  // If keepCount is specified, ensure we don't delete more than necessary
  if (keepCount !== undefined) {
    const toKeep = backups.slice(0, keepCount);
    toDelete = backups.filter(backup => 
      backup.age > daysThreshold && !toKeep.includes(backup)
    );
  }

  return toDelete;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}