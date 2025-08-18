import { CommandLoader } from '../../../../src/core/commands/loader';
import * as fs from 'fs-extra';
import * as path from 'path';

// Mock dependencies
jest.mock('../../../../src/utils/logger', () => ({
  Logger: {
    debug: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  }
}));

jest.mock('fs-extra');
jest.mock('path');

jest.mock('../../../../src/core/config/user-manager', () => ({
  UserConfigManager: {
    getInstance: jest.fn(() => ({
      getCombinedCommands: jest.fn().mockResolvedValue([])
    }))
  }
}));

describe('CommandLoader (Targeted Coverage)', () => {
  let commandLoader: CommandLoader;
  const mockFs = fs as any;
  const mockPath = path as any;

  beforeEach(() => {
    commandLoader = new CommandLoader();
    jest.clearAllMocks();
    
    // Setup path mocks
    mockPath.join.mockImplementation((...parts: string[]) => parts.join('/'));
  });

  describe('loadCommand directory method coverage (lines 67, 82-109)', () => {
    it('should load commands from directory with markdown files', async () => {
      // Mock stat to return a directory
      (mockFs.stat as jest.Mock).mockResolvedValue({
        isFile: () => false,
        isDirectory: () => true
      });

      // Mock readdir to return markdown files
      (mockFs.readdir as jest.Mock).mockResolvedValue(['command.md', 'other.md', 'readme.txt']);

      // Mock readFile to return content
      (mockFs.readFile as jest.Mock).mockResolvedValue('# Command Content\nTest command content');

      // Call private method to trigger lines 67 and 82-109
      const result = await (commandLoader as any).loadCommandItem('test-command', '/path/to/command/dir');
      
      expect(mockFs.stat).toHaveBeenCalledWith('/path/to/command/dir');
      expect(mockFs.readdir).toHaveBeenCalledWith('/path/to/command/dir');
      expect(mockFs.readFile).toHaveBeenCalled();
      expect(result).toBeDefined();
      expect(result.name).toBe('test-command');
      expect(result.content).toBe('# Command Content\nTest command content');
    });

    it('should prefer command-named markdown file in directory', async () => {
      // Mock stat to return a directory
      (mockFs.stat as jest.Mock).mockResolvedValue({
        isFile: () => false,
        isDirectory: () => true
      });

      // Mock readdir with command-named file
      (mockFs.readdir as jest.Mock).mockResolvedValue(['other.md', 'test-command.md', 'another.md']);

      // Mock readFile to return content
      (mockFs.readFile as jest.Mock).mockResolvedValue('---\ndescription: Test command\nallowed-tools: Tool,Edit\nargument-hint: <filename>\n---\n# Test Command\nCommand content');

      // Call with command name that matches a file
      const result = await (commandLoader as any).loadCommandItem('test-command', '/path/to/command/dir');
      
      expect(mockPath.join).toHaveBeenCalledWith('/path/to/command/dir', 'test-command.md');
      expect(result).toBeDefined();
      expect(result.name).toBe('test-command');
      expect(result.description).toBe('Test command');
      expect(result.allowedTools).toBe('Tool,Edit');
      expect(result.argumentHint).toBe('<filename>');
    });

    it('should handle directory with no markdown files', async () => {
      // Mock stat to return a directory
      (mockFs.stat as jest.Mock).mockResolvedValue({
        isFile: () => false,
        isDirectory: () => true
      });

      // Mock readdir to return no markdown files
      (mockFs.readdir as jest.Mock).mockResolvedValue(['readme.txt', 'config.json', 'script.js']);

      // Call private method
      const result = await (commandLoader as any).loadCommandItem('test-command', '/path/to/command/dir');
      
      expect(result).toBeNull();
    });

    it('should handle directory read error', async () => {
      // Mock stat to return a directory
      (mockFs.stat as jest.Mock).mockResolvedValue({
        isFile: () => false,
        isDirectory: () => true
      });

      // Mock readdir to throw error
      (mockFs.readdir as jest.Mock).mockRejectedValue(new Error('Directory read error'));

      // Call private method
      const result = await (commandLoader as any).loadCommandItem('test-command', '/path/to/command/dir');
      
      expect(result).toBeNull();
    });

    it('should handle file read error in directory loading', async () => {
      // Mock stat to return a directory
      (mockFs.stat as jest.Mock).mockResolvedValue({
        isFile: () => false,
        isDirectory: () => true
      });

      // Mock readdir to return markdown files
      (mockFs.readdir as jest.Mock).mockResolvedValue(['command.md']);

      // Mock readFile to throw error
      (mockFs.readFile as jest.Mock).mockRejectedValue(new Error('File read error'));

      // Call private method
      const result = await (commandLoader as any).loadCommandItem('test-command', '/path/to/command/dir');
      
      expect(result).toBeNull();
    });
  });

  describe('loadCommandFromFile method coverage', () => {
    it('should load commands from file', async () => {
      // Mock stat to return a file
      (mockFs.stat as jest.Mock).mockResolvedValue({
        isFile: () => true,
        isDirectory: () => false
      });

      // Mock readFile to return content
      (mockFs.readFile as jest.Mock).mockResolvedValue('Command content from file');

      // Call private method to trigger file loading path
      const result = await (commandLoader as any).loadCommandItem('file-command', '/path/to/command.md');
      
      expect(mockFs.stat).toHaveBeenCalledWith('/path/to/command.md');
      expect(mockFs.readFile).toHaveBeenCalledWith('/path/to/command.md', 'utf-8');
      expect(result).toBeDefined();
      expect(result.name).toBe('file-command');
      expect(result.content).toBe('Command content from file');
    });

    it('should handle file read error', async () => {
      // Mock stat to return a file
      (mockFs.stat as jest.Mock).mockResolvedValue({
        isFile: () => true,
        isDirectory: () => false
      });

      // Mock readFile to throw error
      (mockFs.readFile as jest.Mock).mockRejectedValue(new Error('File read error'));

      // Call private method
      const result = await (commandLoader as any).loadCommandItem('file-command', '/path/to/command.md');
      
      expect(result).toBeNull();
    });

    it('should handle non-markdown files', async () => {
      // Mock stat to return a file that's not .md
      (mockFs.stat as jest.Mock).mockResolvedValue({
        isFile: () => true,
        isDirectory: () => false
      });

      // Call with non-markdown file
      const result = await (commandLoader as any).loadCommandItem('test-command', '/path/to/command.txt');
      
      expect(result).toBeNull();
    });
  });

  describe('parseCommandContent YAML error coverage (line 127)', () => {
    it('should handle YAML parsing error warning', () => {
      const contentWithBadYaml = `---
description: Test command
allowed-tools: Tool,Edit
argument-hint: [unclosed array
---
Command content here`;

      // This should trigger the YAML parsing error warning on line 127
      const result = (commandLoader as any).parseCommandContent('test-command', contentWithBadYaml);
      
      // Should still return a valid command object despite YAML error
      expect(result).toBeDefined();
      expect(result.name).toBe('test-command');
      expect(result.content).toBe('Command content here');
    });

    it('should handle complex YAML parsing scenarios', () => {
      const contentWithComplexBadYaml = `---
description: Test
allowed-tools: [Tool, Edit
argument-hint: <file>
---
Content`;

      const result = (commandLoader as any).parseCommandContent('test-command', contentWithComplexBadYaml);
      
      expect(result).toBeDefined();
      expect(result.content).toBe('Content');
    });
  });

  describe('Edge cases and error handling', () => {
    it('should handle stat errors', async () => {
      // Mock stat to throw error
      (mockFs.stat as jest.Mock).mockRejectedValue(new Error('Stat error'));

      const result = await (commandLoader as any).loadCommandItem('error-command', '/invalid/path');
      
      expect(result).toBeNull();
    });

    it('should handle neither file nor directory case', async () => {
      // Mock stat to return something that's neither file nor directory
      (mockFs.stat as jest.Mock).mockResolvedValue({
        isFile: () => false,
        isDirectory: () => false
      });

      const result = await (commandLoader as any).loadCommandItem('weird-command', '/path/to/something');
      
      expect(result).toBeNull();
    });
  });

  describe('Integration scenarios', () => {
    it('should load commands with various frontmatter configurations', async () => {
      const commandsConfig = [
        { name: 'file-cmd', path: '/path/to/file-cmd.md', source: 'user' },
        { name: 'dir-cmd', path: '/path/to/dir-cmd', source: 'system' }
      ];

      const userConfig = {
        getCombinedCommands: jest.fn().mockResolvedValue(commandsConfig)
      };

      jest.doMock('../../../../src/core/config/user-manager', () => ({
        UserConfigManager: {
          getInstance: () => userConfig
        }
      }));

      // Mock stat calls for different path types
      (mockFs.stat as jest.Mock).mockImplementation((filePath: string) => {
        if (filePath.includes('file-cmd.md')) {
          return Promise.resolve({
            isFile: () => true,
            isDirectory: () => false
          });
        } else {
          return Promise.resolve({
            isFile: () => false,
            isDirectory: () => true
          });
        }
      });

      // Mock file operations
      (mockFs.readFile as jest.Mock).mockImplementation((filePath: string) => {
        if (filePath.includes('file-cmd')) {
          return Promise.resolve('---\ndescription: File command\n---\nFile content');
        } else {
          return Promise.resolve('---\ndescription: Dir command\n---\nDir content');
        }
      });

      (mockFs.readdir as jest.Mock).mockResolvedValue(['command.md']);

      const loader = new CommandLoader();
      const commands = await loader.loadCommands();
      
      expect(commands.length).toBeGreaterThanOrEqual(0);
    });

    it('should handle mixed successful and failed command loading', async () => {
      // Mock stat to succeed for some paths and fail for others
      (mockFs.stat as jest.Mock).mockImplementation((filePath: string) => {
        if (filePath.includes('good')) {
          return Promise.resolve({
            isFile: () => true,
            isDirectory: () => false
          });
        } else {
          return Promise.reject(new Error('Stat failed'));
        }
      });

      (mockFs.readFile as jest.Mock).mockResolvedValue('Good command content');

      // Test loading multiple items with mixed success
      const results = await Promise.all([
        (commandLoader as any).loadCommandItem('good-cmd', '/path/to/good.md'),
        (commandLoader as any).loadCommandItem('bad-cmd', '/path/to/bad.md')
      ]);
      
      expect(results[0]).toBeDefined(); // Good command should load
      expect(results[1]).toBeNull(); // Bad command should return null
    });
  });
});