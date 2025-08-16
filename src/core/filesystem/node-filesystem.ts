import * as fs from 'fs-extra';
import * as path from 'path';
import { Stats } from 'fs';
import { IFileSystem, CopyOptions } from '../interfaces/filesystem';

/**
 * Production filesystem implementation using fs-extra
 */
export class NodeFileSystem implements IFileSystem {
  async exists(filePath: string): Promise<boolean> {
    return fs.pathExists(filePath);
  }

  async readFile(filePath: string, encoding: BufferEncoding = 'utf-8'): Promise<string> {
    return fs.readFile(filePath, encoding);
  }

  async writeFile(filePath: string, content: string, encoding: BufferEncoding = 'utf-8'): Promise<void> {
    // Ensure parent directory exists
    const dir = this.dirname(filePath);
    await this.mkdir(dir, { recursive: true });
    return fs.writeFile(filePath, content, encoding);
  }

  async readJSON<T = any>(filePath: string): Promise<T> {
    return fs.readJSON(filePath);
  }

  async writeJSON(filePath: string, obj: any, options: { spaces?: number } = {}): Promise<void> {
    // Ensure parent directory exists
    const dir = this.dirname(filePath);
    await this.mkdir(dir, { recursive: true });
    return fs.writeJSON(filePath, obj, { spaces: options.spaces || 2 });
  }

  async remove(filePath: string): Promise<void> {
    return fs.remove(filePath);
  }

  async copy(src: string, dest: string, options: CopyOptions = {}): Promise<void> {
    // Ensure destination parent directory exists
    const destDir = this.dirname(dest);
    await this.mkdir(destDir, { recursive: true });
    
    return fs.copy(src, dest, {
      overwrite: options.overwrite,
      errorOnExist: options.errorOnExist,
      filter: options.filter
    });
  }

  async move(src: string, dest: string): Promise<void> {
    // Ensure destination parent directory exists
    const destDir = this.dirname(dest);
    await this.mkdir(destDir, { recursive: true });
    return fs.move(src, dest);
  }

  async readdir(dirPath: string): Promise<string[]> {
    return fs.readdir(dirPath);
  }

  async mkdir(dirPath: string, _options: { recursive?: boolean } = {}): Promise<void> {
    await fs.ensureDir(dirPath);
  }

  async stat(filePath: string): Promise<Stats> {
    return fs.stat(filePath);
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
}