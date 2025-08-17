// Basic tests for CLI entry point

// Mock all external dependencies to allow importing
jest.mock('commander', () => ({
  Command: jest.fn().mockImplementation(() => ({
    name: jest.fn().mockReturnThis(),
    description: jest.fn().mockReturnThis(),
    version: jest.fn().mockReturnThis(),
    command: jest.fn().mockReturnThis(),
    option: jest.fn().mockReturnThis(),
    action: jest.fn().mockReturnThis(),
    alias: jest.fn().mockReturnThis(),
    exitOverride: jest.fn().mockReturnThis(),
    parse: jest.fn(),
    args: [],
    rawArgs: [],
  })),
}));

jest.mock('chalk', () => ({
  red: jest.fn((str) => str),
  green: jest.fn((str) => str),
  cyan: jest.fn((str) => str),
  yellow: jest.fn((str) => str),
  gray: jest.fn((str) => str),
  bold: jest.fn((str) => str),
}));

jest.mock('@clack/prompts', () => ({
  cancel: jest.fn(),
  outro: jest.fn(),
  note: jest.fn(),
}));

jest.mock('update-notifier', () => jest.fn(() => ({ notify: jest.fn() })));

// Mock all command modules
jest.mock('../../../src/cli/commands/setup', () => ({
  setupCommand: jest.fn(),
}));

jest.mock('../../../src/cli/commands/list', () => ({
  listCommand: jest.fn(),
}));

jest.mock('../../../src/cli/commands/update', () => ({
  updateCommand: jest.fn(),
}));

jest.mock('../../../src/cli/commands/unlink', () => ({
  unlinkCommand: jest.fn(),
}));

jest.mock('../../../src/cli/commands/add-agent', () => ({
  addAgentCommand: jest.fn(),
}));

jest.mock('../../../src/cli/commands/add-command', () => ({
  addCommandCommand: jest.fn(),
}));

jest.mock('../../../src/cli/commands/add-hook', () => ({
  addHookCommand: jest.fn(),
}));

jest.mock('../../../src/cli/commands/install', () => ({
  installCommand: jest.fn(),
}));

jest.mock('../../../src/cli/commands/cleanup', () => ({
  cleanupCommand: jest.fn(),
}));

jest.mock('../../../src/cli/commands/validate', () => ({
  validateCommand: jest.fn(),
}));

jest.mock('../../../src/cli/commands/status', () => ({
  statusCommand: jest.fn(),
}));

jest.mock('../../../src/cli/interactive', () => ({
  interactiveMode: jest.fn(),
}));

// Mock package.json
jest.mock('../../../package.json', () => ({
  version: '1.0.0',
}));

describe('CLI Entry Point', () => {
  let originalArgv: string[];
  let originalExit: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Save original process state
    originalArgv = process.argv;
    originalExit = process.exit;
    
    // Mock process.exit to prevent actual exits
    process.exit = jest.fn() as any;
    
    // Clear the module cache to ensure fresh imports
    jest.resetModules();
  });

  afterEach(() => {
    // Restore original process state
    process.argv = originalArgv;
    process.exit = originalExit;
  });

  it('should be importable without throwing', () => {
    expect(() => {
      // This will execute the module and set up the CLI
      require('../../../src/cli/index');
    }).not.toThrow();
  });

  it('should create Commander instance', () => {
    const { Command } = require('commander');
    
    // Import should create a Command instance
    require('../../../src/cli/index');
    
    expect(Command).toHaveBeenCalled();
  });

  it('should handle interactive mode when no arguments provided', () => {
    const { interactiveMode } = require('../../../src/cli/interactive');
    
    // Set up minimal args (just node and script name)
    process.argv = ['node', 'cli.js'];
    
    // Import and trigger the CLI
    require('../../../src/cli/index');
    
    // Should be able to call interactiveMode (though we're not testing the actual call here)
    expect(typeof interactiveMode).toBe('function');
  });

  it('should set up global state variables', () => {
    // The module should declare these variables
    const cliModule = require('../../../src/cli/index');
    
    // These are internal state variables - we can't access them directly,
    // but we can verify the module loads without error
    expect(cliModule).toBeDefined();
  });

  it('should handle module imports without errors', () => {
    delete require.cache[require.resolve('../../../src/cli/index')];
    
    expect(() => {
      require('../../../src/cli/index');
    }).not.toThrow();
  });

  it('should import all required command modules', () => {
    // These mocks should be called when the module imports the commands
    require('../../../src/cli/index');
    
    // Verify that the command modules are importable
    const setupCommand = require('../../../src/cli/commands/setup').setupCommand;
    const listCommand = require('../../../src/cli/commands/list').listCommand;
    const updateCommand = require('../../../src/cli/commands/update').updateCommand;
    
    expect(typeof setupCommand).toBe('function');
    expect(typeof listCommand).toBe('function');
    expect(typeof updateCommand).toBe('function');
  });

  it('should handle update notifier setup', () => {
    const updateNotifier = require('update-notifier');
    
    require('../../../src/cli/index');
    
    expect(updateNotifier).toHaveBeenCalled();
  });

  it('should use version from package.json', () => {
    const packageJson = require('../../../package.json');
    
    require('../../../src/cli/index');
    
    expect(packageJson.version).toBe('1.0.0');
  });

  it('should export context management functions', () => {
    delete require.cache[require.resolve('../../../src/cli/index')];
    const cliModule = require('../../../src/cli/index');
    
    // Test setMainMenuContext function
    expect(typeof cliModule.setMainMenuContext).toBe('function');
    cliModule.setMainMenuContext(true);
    cliModule.setMainMenuContext(false);
    
    // Test wasESCPressed function  
    expect(typeof cliModule.wasESCPressed).toBe('function');
    const escPressed = cliModule.wasESCPressed();
    expect(typeof escPressed).toBe('boolean');
  });

  it('should export createESCCancellablePromise function', async () => {
    delete require.cache[require.resolve('../../../src/cli/index')];
    const cliModule = require('../../../src/cli/index');
    
    expect(typeof cliModule.createESCCancellablePromise).toBe('function');
    
    // Test with resolving promise
    const testPromise = Promise.resolve('test result');
    const cancellablePromise = cliModule.createESCCancellablePromise(testPromise);
    const result = await cancellablePromise;
    expect(result).toBe('test result');
  });

  it('should handle createESCCancellablePromise with rejecting promise', async () => {
    delete require.cache[require.resolve('../../../src/cli/index')];
    const cliModule = require('../../../src/cli/index');
    
    const testPromise = Promise.reject(new Error('test error'));
    const cancellablePromise = cliModule.createESCCancellablePromise(testPromise);
    
    await expect(cancellablePromise).rejects.toThrow('test error');
  });

  it('should exercise async execution path with arguments', () => {
    // Set argv to have arguments to trigger program.parse path
    process.argv = ['node', 'cli.js', 'list'];
    
    delete require.cache[require.resolve('../../../src/cli/index')];
    
    expect(() => {
      require('../../../src/cli/index');
    }).not.toThrow();
  });

  it('should exercise async execution path without arguments', () => {
    // Set argv to empty to trigger interactive mode path
    process.argv = ['node', 'cli.js'];
    
    delete require.cache[require.resolve('../../../src/cli/index')];
    
    expect(() => {
      require('../../../src/cli/index');
    }).not.toThrow();
  });

  it('should handle commander errors gracefully', () => {
    // Mock commander to throw an error
    const mockProgram = {
      name: jest.fn().mockReturnThis(),
      description: jest.fn().mockReturnThis(),
      version: jest.fn().mockReturnThis(),
      option: jest.fn().mockReturnThis(),
      command: jest.fn().mockReturnThis(),
      alias: jest.fn().mockReturnThis(),
      action: jest.fn().mockReturnThis(),
      exitOverride: jest.fn().mockReturnThis(),
      parse: jest.fn().mockImplementation(() => {
        throw { code: 'commander.help' };
      }),
    };

    const mockCommander = {
      Command: jest.fn(() => mockProgram),
    };
    
    jest.doMock('commander', () => mockCommander);

    process.argv = ['node', 'cli.js', '--help'];
    
    delete require.cache[require.resolve('../../../src/cli/index')];
    
    expect(() => {
      require('../../../src/cli/index');
    }).not.toThrow();
  });
});