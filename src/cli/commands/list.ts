import * as p from '@clack/prompts';
import chalk from 'chalk';
import { StorageManager } from '../../core/storage/manager';
import { PathUtils } from '../../utils/paths';
import * as fs from 'fs-extra';
import * as path from 'path';

interface ListOptions {
  verbose?: boolean;
  json?: boolean;
}

export async function listCommand(options: ListOptions): Promise<void> {
  try {
    const storageManager = new StorageManager();
    const projects = await storageManager.listProjects();

    if (projects.length === 0) {
      p.note(
        `No projects currently managed.\n\nRun ${chalk.cyan('ccc setup')} to add your first project.`,
        chalk.yellow('📋 Empty Project List')
      );
      return;
    }

    if (options.json) {
      const projectData = await getProjectsData(projects, storageManager);
      console.log(JSON.stringify(projectData, null, 2));
      return;
    }

    if (options.verbose) {
      await showVerboseList(projects, storageManager);
    } else {
      await showStandardList(projects, storageManager);
    }

  } catch (error: any) {
    p.cancel(chalk.red(error.message));
    process.exit(1);
  }
}

async function showStandardList(projects: string[], storageManager: StorageManager): Promise<void> {
  const projectData = [];
  let totalSize = 0;

  for (const project of projects) {
    const info = await storageManager.getProjectInfo(project);
    const storageDir = PathUtils.getProjectStorageDir(project);
    const size = await getDirectorySize(storageDir);
    
    totalSize += size;

    projectData.push({
      name: project,
      template: info?.projectType || 'unknown',
      version: info?.templateVersion || 'N/A',
      updated: formatDate(info?.lastUpdate),
      size: formatSize(size)
    });
  }

  // Format project list
  const lines = [];
  const maxNameLen = Math.max(...projectData.map(p => p.name.length), 15);
  const maxTemplateLen = Math.max(...projectData.map(p => p.template.length), 10);
  
  projectData.forEach(project => {
    lines.push(
      `  ${chalk.cyan(project.name.padEnd(maxNameLen))}  ` +
      `${chalk.gray(project.template.padEnd(maxTemplateLen))}  ` +
      `${chalk.gray(project.version.padEnd(7))}  ` +
      `${chalk.gray(project.updated.padEnd(15))}  ` +
      `${chalk.gray(project.size)}`
    );
  });

  lines.push('');
  lines.push(`  Total: ${chalk.bold(formatSize(totalSize))} across ${chalk.bold(projects.length)} projects`);
  lines.push(`  ${chalk.gray(`Run 'ccc list --verbose' for details`)}`);

  p.note(lines.join('\n'), chalk.green(`📋 Managed Projects (${projects.length})`));
}

async function showVerboseList(projects: string[], storageManager: StorageManager): Promise<void> {
  for (const project of projects) {
    const info = await storageManager.getProjectInfo(project);
    const storageDir = PathUtils.getProjectStorageDir(project);
    const backupsDir = PathUtils.getProjectBackupsDir(project);
    const backupCount = await countBackups(backupsDir);

    console.log(chalk.cyan.bold(project));
    console.log(`  Template:    ${info?.projectType || 'unknown'} v${info?.templateVersion || 'N/A'}`);
    console.log(`  Path:        ${info?.projectPath || 'N/A'}`);
    console.log(`  Storage:     ${storageDir}`);
    console.log(`  Created:     ${formatDate(info?.setupDate)}`);
    console.log(`  Updated:     ${formatDate(info?.lastUpdate)}`);
    console.log(`  Backups:     ${backupCount} (${await getDirectorySize(backupsDir)} KB)`);
    console.log();
  }
}

async function getProjectsData(projects: string[], storageManager: StorageManager): Promise<any[]> {
  const data = [];

  for (const project of projects) {
    const info = await storageManager.getProjectInfo(project);
    const storageDir = PathUtils.getProjectStorageDir(project);
    const size = await getDirectorySize(storageDir);

    data.push({
      name: project,
      ...info,
      storageSize: size,
      storagePath: storageDir
    });
  }

  return data;
}

async function getDirectorySize(dirPath: string): Promise<number> {
  if (!await PathUtils.exists(dirPath)) {
    return 0;
  }

  let totalSize = 0;

  const walk = async (dir: string): Promise<void> => {
    const entries = await fs.readdir(dir);

    for (const entry of entries) {
      const fullPath = path.join(dir, entry);
      const stat = await fs.stat(fullPath);

      if (stat.isDirectory()) {
        await walk(fullPath);
      } else {
        totalSize += stat.size;
      }
    }
  };

  await walk(dirPath);
  return totalSize;
}

async function countBackups(backupsDir: string): Promise<number> {
  if (!await PathUtils.exists(backupsDir)) {
    return 0;
  }

  const entries = await fs.readdir(backupsDir);
  return entries.filter(e => e.startsWith('backup-')).length;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return 'N/A';

  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);

  if (days === 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days} days ago`;
  if (weeks === 1) return '1 week ago';
  if (weeks < 4) return `${weeks} weeks ago`;
  if (months === 1) return '1 month ago';
  if (months < 12) return `${months} months ago`;
  
  return date.toLocaleDateString();
}