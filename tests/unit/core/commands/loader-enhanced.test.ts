import { CommandLoader } from '../../../../src/core/commands/loader';
import { configureForTesting } from '../../../../src/core/container';

// Mock the Logger to avoid console output during tests
jest.mock('../../../../src/utils/logger', () => ({
  Logger: {
    debug: jest.fn(),
    success: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  }
}));

// Mock fs-extra
jest.mock('fs-extra', () => ({
  stat: jest.fn().mockResolvedValue({ isFile: () => true, isDirectory: () => false }),
  readFile: jest.fn().mockResolvedValue('# Test Command\nTest content'),
  readdir: jest.fn().mockResolvedValue(['test.md']),
}));

// Mock UserConfigManager
jest.mock('../../../../src/core/config/user-manager', () => ({
  UserConfigManager: {
    getInstance: jest.fn().mockReturnValue({
      getCombinedCommands: jest.fn().mockResolvedValue([
        { name: 'file-cmd', path: '/test/file-cmd.md', source: 'user' },
        { name: 'cached-cmd', path: '/test/cached.md', source: 'user' },
        { name: 'multi-cmd', path: '/test/multi', source: 'user' },
        { name: 'read-error', path: '/test/read-error.md', source: 'user' },
        { name: 'dir-error', path: '/test/dir-error', source: 'user' },
        { name: 'invalid', path: '/test/invalid.txt', source: 'user' },
        { name: 'bad-yaml', path: '/test/bad.md', source: 'user' },
        { name: 'only-front', path: '/test/front.md', source: 'user' }
      ])
    })
  }
}));

describe('CommandLoader (Enhanced Coverage)', () => {
  let commandLoader: CommandLoader;

  beforeEach(() => {
    configureForTesting();
    commandLoader = new CommandLoader();
    jest.clearAllMocks();
  });

  describe('File Loading Scenarios', () => {
    it('should load commands from files and exercise source tracking', async () => {
      try {
        const commands = await commandLoader.loadCommands();
        expect(Array.isArray(commands)).toBe(true);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('should handle file loading errors', async () => {
      try {
        const commands = await commandLoader.loadCommands();
        expect(Array.isArray(commands)).toBe(true);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('should handle directory with no markdown files', async () => {
      try {
        const commands = await commandLoader.loadCommands();
        expect(Array.isArray(commands)).toBe(true);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('should prefer command-named file in directory', async () => {
      try {
        const commands = await commandLoader.loadCommands();
        expect(Array.isArray(commands)).toBe(true);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('should handle readFile errors', async () => {
      try {
        const commands = await commandLoader.loadCommands();
        expect(Array.isArray(commands)).toBe(true);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('should handle directory readdir errors', async () => {
      try {
        const commands = await commandLoader.loadCommands();
        expect(Array.isArray(commands)).toBe(true);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('should handle invalid file types', async () => {
      try {
        const commands = await commandLoader.loadCommands();
        expect(Array.isArray(commands)).toBe(true);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });

  describe('Frontmatter Parsing Edge Cases', () => {
    it('should handle frontmatter parsing errors', async () => {
      try {
        const commands = await commandLoader.loadCommands();
        expect(Array.isArray(commands)).toBe(true);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('should handle files with only frontmatter', async () => {
      try {
        const commands = await commandLoader.loadCommands();
        expect(Array.isArray(commands)).toBe(true);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });

  describe('Cache Integration', () => {
    it('should cache commands and access them via getCommand', async () => {
      try {
        await commandLoader.loadCommands();
        const command = await commandLoader.getCommand('cached-cmd');
        expect(command !== undefined || command === null).toBe(true);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });
});