import * as path from 'path';
import { Stats } from 'fs';
import { IFileSystem, CopyOptions } from '../interfaces/filesystem';

/**
 * In-memory filesystem implementation for testing
 */
export class MemoryFileSystem implements IFileSystem {
  private files = new Map<string, string>();
  private directories = new Set<string>();

  constructor(initialFiles: { [path: string]: string } = {}) {
    // Always ensure root directory exists
    this.directories.add('/');
    
    // Add initial files and directories
    for (const [filePath, content] of Object.entries(initialFiles)) {
      this.setFile(filePath, content);
      this.ensureParentDirectories(filePath);
    }
  }

  async exists(filePath: string): Promise<boolean> {
    const normalizedPath = this.normalizePath(filePath);
    return this.files.has(normalizedPath) || this.directories.has(normalizedPath);
  }

  async readFile(filePath: string, _encoding?: BufferEncoding): Promise<string> {
    const normalizedPath = this.normalizePath(filePath);
    
    if (!this.files.has(normalizedPath)) {
      throw new Error(`ENOENT: no such file or directory, open '${filePath}'`);
    }
    
    return this.files.get(normalizedPath)!;
  }

  async writeFile(filePath: string, content: string, _encoding?: BufferEncoding): Promise<void> {
    const normalizedPath = this.normalizePath(filePath);
    this.ensureParentDirectories(normalizedPath);
    this.files.set(normalizedPath, content);
  }

  async readJSON<T = any>(filePath: string): Promise<T> {
    const content = await this.readFile(filePath);
    try {
      return JSON.parse(content);
    } catch (error) {
      throw new Error(`Failed to parse JSON from ${filePath}: ${error}`);
    }
  }

  async writeJSON(filePath: string, obj: any, options: { spaces?: number } = {}): Promise<void> {
    const content = JSON.stringify(obj, null, options.spaces || 2);
    await this.writeFile(filePath, content);
  }

  async remove(filePath: string): Promise<void> {
    const normalizedPath = this.normalizePath(filePath);
    
    // Remove file if it exists
    this.files.delete(normalizedPath);
    
    // Remove directory and all its contents
    if (this.directories.has(normalizedPath)) {
      this.directories.delete(normalizedPath);
      
      // Remove all files and subdirectories under this path
      const pathWithSlash = normalizedPath + '/';
      
      for (const file of this.files.keys()) {
        if (file.startsWith(pathWithSlash)) {
          this.files.delete(file);
        }
      }
      
      for (const dir of this.directories) {
        if (dir.startsWith(pathWithSlash)) {
          this.directories.delete(dir);
        }
      }
    }
  }

  async copy(src: string, dest: string, options: CopyOptions = {}): Promise<void> {
    const srcNormalized = this.normalizePath(src);
    const destNormalized = this.normalizePath(dest);

    if (!await this.exists(src)) {
      throw new Error(`ENOENT: no such file or directory, copyfile '${src}' -> '${dest}'`);
    }

    if (await this.exists(dest) && options.errorOnExist) {
      throw new Error(`EEXIST: file already exists, copyfile '${src}' -> '${dest}'`);
    }

    if (await this.exists(dest) && !options.overwrite) {
      return; // Skip copying if destination exists and overwrite is false
    }

    // Copy file
    if (this.files.has(srcNormalized)) {
      const content = this.files.get(srcNormalized)!;
      
      if (options.filter && !options.filter(src)) {
        return; // Skip this file
      }
      
      await this.writeFile(dest, content);
      return;
    }

    // Copy directory and all its contents
    if (this.directories.has(srcNormalized)) {
      this.ensureParentDirectories(destNormalized);
      this.directories.add(destNormalized);

      const srcWithSlash = srcNormalized + '/';
      const destWithSlash = destNormalized + '/';

      // Copy all files under this directory
      for (const [filePath, content] of this.files) {
        if (filePath.startsWith(srcWithSlash)) {
          const relativePath = filePath.substring(srcWithSlash.length);
          const newFilePath = destWithSlash + relativePath;
          
          if (options.filter && !options.filter(this.denormalizePath(filePath))) {
            continue; // Skip this file
          }
          
          this.files.set(newFilePath, content);
        }
      }

      // Copy all subdirectories
      for (const dirPath of this.directories) {
        if (dirPath.startsWith(srcWithSlash)) {
          const relativePath = dirPath.substring(srcWithSlash.length);
          const newDirPath = destWithSlash + relativePath;
          this.directories.add(newDirPath);
        }
      }
    }
  }

  async move(src: string, dest: string): Promise<void> {
    await this.copy(src, dest, { overwrite: true });
    await this.remove(src);
  }

  async readdir(dirPath: string): Promise<string[]> {
    const normalizedPath = this.normalizePath(dirPath);

    if (!this.directories.has(normalizedPath)) {
      throw new Error(`ENOENT: no such file or directory, scandir '${dirPath}'`);
    }

    const entries = new Set<string>();
    const pathWithSlash = normalizedPath + '/';

    // Find immediate children (files and directories)
    for (const filePath of this.files.keys()) {
      if (filePath.startsWith(pathWithSlash)) {
        const relativePath = filePath.substring(pathWithSlash.length);
        const firstSegment = relativePath.split('/')[0];
        if (firstSegment) {
          entries.add(firstSegment);
        }
      }
    }

    for (const dirPath of this.directories) {
      if (dirPath.startsWith(pathWithSlash)) {
        const relativePath = dirPath.substring(pathWithSlash.length);
        const firstSegment = relativePath.split('/')[0];
        if (firstSegment) {
          entries.add(firstSegment);
        }
      }
    }

    return Array.from(entries).sort();
  }

  async mkdir(dirPath: string, options: { recursive?: boolean } = {}): Promise<void> {
    const normalizedPath = this.normalizePath(dirPath);

    if (options.recursive) {
      this.ensureParentDirectories(normalizedPath);
    } else {
      const parentDir = this.dirname(normalizedPath);
      if (parentDir !== normalizedPath && !this.directories.has(parentDir)) {
        throw new Error(`ENOENT: no such file or directory, mkdir '${dirPath}'`);
      }
    }

    this.directories.add(normalizedPath);
  }

  async stat(filePath: string): Promise<Stats> {
    const normalizedPath = this.normalizePath(filePath);

    if (!await this.exists(filePath)) {
      throw new Error(`ENOENT: no such file or directory, stat '${filePath}'`);
    }

    const isFile = this.files.has(normalizedPath);
    const isDirectory = this.directories.has(normalizedPath);

    // Create a minimal Stats-like object
    return {
      isFile: () => isFile,
      isDirectory: () => isDirectory,
      isBlockDevice: () => false,
      isCharacterDevice: () => false,
      isSymbolicLink: () => false,
      isFIFO: () => false,
      isSocket: () => false,
      size: isFile ? Buffer.byteLength(this.files.get(normalizedPath)!, 'utf8') : 0,
      mode: isFile ? 33188 : 16877, // Regular file or directory permissions
      uid: 1000,
      gid: 1000,
      atime: new Date(),
      mtime: new Date(),
      ctime: new Date(),
      birthtime: new Date(),
    } as Stats;
  }

  // Path operations (delegating to path module)
  join(...paths: string[]): string {
    return path.join(...paths);
  }

  resolve(...paths: string[]): string {
    return path.resolve(...paths);
  }

  dirname(filePath: string): string {
    return path.dirname(filePath);
  }

  basename(filePath: string, ext?: string): string {
    return path.basename(filePath, ext);
  }

  extname(filePath: string): string {
    return path.extname(filePath);
  }

  relative(from: string, to: string): string {
    return path.relative(from, to);
  }

  isAbsolute(filePath: string): boolean {
    return path.isAbsolute(filePath);
  }

  // Helper methods for managing the in-memory filesystem
  private setFile(filePath: string, content: string): void {
    const normalizedPath = this.normalizePath(filePath);
    this.files.set(normalizedPath, content);
  }

  private normalizePath(filePath: string): string {
    // For memory filesystem, treat all paths as absolute from root
    // Normalize path separators and remove duplicates, but keep it relative to /
    let normalized = filePath.replace(/\\/g, '/'); // Convert backslashes to forward slashes
    
    // If it doesn't start with /, prepend it
    if (!normalized.startsWith('/')) {
      normalized = '/' + normalized;
    }
    
    // Remove duplicate slashes and resolve .. and .
    const parts = normalized.split('/').filter(part => part !== '' && part !== '.');
    const resolved: string[] = [];
    
    for (const part of parts) {
      if (part === '..') {
        resolved.pop();
      } else {
        resolved.push(part);
      }
    }
    
    return resolved.length === 0 ? '/' : '/' + resolved.join('/');
  }

  private denormalizePath(normalizedPath: string): string {
    return normalizedPath;
  }

  private ensureParentDirectories(filePath: string): void {
    const dir = this.dirname(filePath);
    
    if (dir === filePath) {
      return; // Root directory
    }

    const normalizedDir = this.normalizePath(dir);
    
    if (!this.directories.has(normalizedDir)) {
      this.ensureParentDirectories(dir); // Pass unnormalized dir, not normalizedDir
      this.directories.add(normalizedDir);
    }
  }

  // Testing utilities
  getAllFiles(): { [path: string]: string } {
    const result: { [path: string]: string } = {};
    for (const [filePath, content] of this.files) {
      result[filePath] = content;
    }
    return result;
  }

  getAllDirectories(): string[] {
    return Array.from(this.directories);
  }

  clear(): void {
    this.files.clear();
    this.directories.clear();
    // Re-add root directory
    this.directories.add('/');
  }

  dump(): void {
    console.log('Files:', Object.keys(this.getAllFiles()));
    console.log('Directories:', this.getAllDirectories());
  }
}