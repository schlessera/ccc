import { Stats } from 'fs';

/**
 * Abstraction layer for filesystem operations to enable testing without side effects
 */
export interface IFileSystem {
  // File operations
  exists(path: string): Promise<boolean>;
  readFile(path: string, encoding?: BufferEncoding): Promise<string>;
  writeFile(path: string, content: string, encoding?: BufferEncoding): Promise<void>;
  readJSON<T = any>(path: string): Promise<T>;
  writeJSON(path: string, obj: any, options?: { spaces?: number }): Promise<void>;
  remove(path: string): Promise<void>;
  copy(src: string, dest: string, options?: CopyOptions): Promise<void>;
  move(src: string, dest: string): Promise<void>;
  
  // Directory operations
  readdir(path: string): Promise<string[]>;
  mkdir(path: string, options?: { recursive?: boolean }): Promise<void>;
  stat(path: string): Promise<Stats>;
  
  // Path operations
  join(...paths: string[]): string;
  resolve(...paths: string[]): string;
  dirname(path: string): string;
  basename(path: string, ext?: string): string;
  extname(path: string): string;
  relative(from: string, to: string): string;
  isAbsolute(path: string): boolean;
}

export interface CopyOptions {
  overwrite?: boolean;
  errorOnExist?: boolean;
  filter?: (src: string) => boolean;
}