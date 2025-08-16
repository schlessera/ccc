import { Spinner, createSpinner } from '../../../../src/cli/ui/spinner';

// Mock ora
jest.mock('ora', () => {
  return jest.fn().mockImplementation(() => ({
    start: jest.fn(),
    succeed: jest.fn(),
    fail: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    stop: jest.fn(),
    clear: jest.fn(),
    text: '',
  }));
});

// Mock chalk
jest.mock('chalk', () => ({
  green: jest.fn((text) => `[GREEN]${text}[/GREEN]`),
  red: jest.fn((text) => `[RED]${text}[/RED]`),
  yellow: jest.fn((text) => `[YELLOW]${text}[/YELLOW]`),
  blue: jest.fn((text) => `[BLUE]${text}[/BLUE]`),
}));

import ora from 'ora';
import chalk from 'chalk';

describe('Spinner', () => {
  let mockOraInstance: any;

  beforeEach(() => {
    mockOraInstance = {
      start: jest.fn(),
      succeed: jest.fn(),
      fail: jest.fn(),
      warn: jest.fn(),
      info: jest.fn(),
      stop: jest.fn(),
      clear: jest.fn(),
      text: '',
    };
    (ora as jest.Mock).mockReturnValue(mockOraInstance);
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Constructor', () => {
    it('should create spinner with initial text', () => {
      new Spinner('Loading...');

      expect(ora).toHaveBeenCalledWith({
        text: 'Loading...',
        spinner: 'dots',
        color: 'cyan',
      });
    });

    it('should create spinner with empty text', () => {
      new Spinner('');

      expect(ora).toHaveBeenCalledWith({
        text: '',
        spinner: 'dots',
        color: 'cyan',
      });
    });

    it('should create spinner with long text', () => {
      const longText = 'This is a very long loading message that might wrap around the screen and test how the spinner handles long text content';
      new Spinner(longText);

      expect(ora).toHaveBeenCalledWith({
        text: longText,
        spinner: 'dots',
        color: 'cyan',
      });
    });

    it('should create spinner with special characters', () => {
      const specialText = 'Loading... 🚀 Processing files 📁 with émojis and spëcial chars';
      new Spinner(specialText);

      expect(ora).toHaveBeenCalledWith({
        text: specialText,
        spinner: 'dots',
        color: 'cyan',
      });
    });
  });

  describe('start method', () => {
    it('should start spinner without changing text', () => {
      const spinner = new Spinner('Initial text');
      spinner.start();

      expect(mockOraInstance.start).toHaveBeenCalled();
    });

    it('should start spinner with new text', () => {
      const spinner = new Spinner('Initial text');
      spinner.start('New loading text');

      expect(mockOraInstance.text).toBe('New loading text');
      expect(mockOraInstance.start).toHaveBeenCalled();
    });

    it('should handle multiple start calls', () => {
      const spinner = new Spinner('Initial');
      spinner.start('First');
      spinner.start('Second');
      spinner.start('Third');

      expect(mockOraInstance.text).toBe('Third');
      expect(mockOraInstance.start).toHaveBeenCalledTimes(3);
    });

    it('should handle empty string as new text', () => {
      const spinner = new Spinner('Original');
      spinner.start('');

      expect(mockOraInstance.text).toBe('');
      expect(mockOraInstance.start).toHaveBeenCalled();
    });

    it('should handle undefined text parameter', () => {
      const spinner = new Spinner('Original');
      spinner.start();

      expect(mockOraInstance.start).toHaveBeenCalled();
      // Text should remain unchanged when undefined
    });
  });

  describe('succeed method', () => {
    it('should succeed without text', () => {
      const spinner = new Spinner('Loading');
      spinner.succeed();

      expect(mockOraInstance.succeed).toHaveBeenCalledWith(undefined);
    });

    it('should succeed with custom text', () => {
      const spinner = new Spinner('Loading');
      spinner.succeed('Operation completed successfully');

      expect(chalk.green).toHaveBeenCalledWith('Operation completed successfully');
      expect(mockOraInstance.succeed).toHaveBeenCalledWith('[GREEN]Operation completed successfully[/GREEN]');
    });

    it('should succeed with empty text', () => {
      const spinner = new Spinner('Loading');
      spinner.succeed('');

      // Empty string is treated as falsy, so chalk.green is not called
      expect(chalk.green).not.toHaveBeenCalled();
      expect(mockOraInstance.succeed).toHaveBeenCalledWith(undefined);
    });

    it('should handle special characters in success text', () => {
      const spinner = new Spinner('Loading');
      const successText = '✅ Successfully deployed to production 🎉';
      spinner.succeed(successText);

      expect(chalk.green).toHaveBeenCalledWith(successText);
      expect(mockOraInstance.succeed).toHaveBeenCalledWith(`[GREEN]${successText}[/GREEN]`);
    });
  });

  describe('fail method', () => {
    it('should fail without text', () => {
      const spinner = new Spinner('Loading');
      spinner.fail();

      expect(mockOraInstance.fail).toHaveBeenCalledWith(undefined);
    });

    it('should fail with custom text', () => {
      const spinner = new Spinner('Loading');
      spinner.fail('Operation failed');

      expect(chalk.red).toHaveBeenCalledWith('Operation failed');
      expect(mockOraInstance.fail).toHaveBeenCalledWith('[RED]Operation failed[/RED]');
    });

    it('should fail with error details', () => {
      const spinner = new Spinner('Processing');
      const errorText = 'Failed to connect to database: Connection timeout';
      spinner.fail(errorText);

      expect(chalk.red).toHaveBeenCalledWith(errorText);
      expect(mockOraInstance.fail).toHaveBeenCalledWith(`[RED]${errorText}[/RED]`);
    });

    it('should handle empty error text', () => {
      const spinner = new Spinner('Loading');
      spinner.fail('');

      // Empty string is treated as falsy, so chalk.red is not called
      expect(chalk.red).not.toHaveBeenCalled();
      expect(mockOraInstance.fail).toHaveBeenCalledWith(undefined);
    });
  });

  describe('warn method', () => {
    it('should warn without text', () => {
      const spinner = new Spinner('Loading');
      spinner.warn();

      expect(mockOraInstance.warn).toHaveBeenCalledWith(undefined);
    });

    it('should warn with custom text', () => {
      const spinner = new Spinner('Loading');
      spinner.warn('Warning: Deprecated API used');

      expect(chalk.yellow).toHaveBeenCalledWith('Warning: Deprecated API used');
      expect(mockOraInstance.warn).toHaveBeenCalledWith('[YELLOW]Warning: Deprecated API used[/YELLOW]');
    });

    it('should handle complex warning messages', () => {
      const spinner = new Spinner('Checking');
      const warningText = '⚠️ Configuration file is missing optional fields';
      spinner.warn(warningText);

      expect(chalk.yellow).toHaveBeenCalledWith(warningText);
      expect(mockOraInstance.warn).toHaveBeenCalledWith(`[YELLOW]${warningText}[/YELLOW]`);
    });
  });

  describe('info method', () => {
    it('should show info without text', () => {
      const spinner = new Spinner('Loading');
      spinner.info();

      expect(mockOraInstance.info).toHaveBeenCalledWith(undefined);
    });

    it('should show info with custom text', () => {
      const spinner = new Spinner('Loading');
      spinner.info('Process completed in 2.5 seconds');

      expect(chalk.blue).toHaveBeenCalledWith('Process completed in 2.5 seconds');
      expect(mockOraInstance.info).toHaveBeenCalledWith('[BLUE]Process completed in 2.5 seconds[/BLUE]');
    });

    it('should handle informational messages with data', () => {
      const spinner = new Spinner('Analyzing');
      const infoText = 'ℹ️ Found 42 files, processed 38, skipped 4';
      spinner.info(infoText);

      expect(chalk.blue).toHaveBeenCalledWith(infoText);
      expect(mockOraInstance.info).toHaveBeenCalledWith(`[BLUE]${infoText}[/BLUE]`);
    });
  });

  describe('update method', () => {
    it('should update spinner text', () => {
      const spinner = new Spinner('Initial');
      spinner.update('Updated text');

      expect(mockOraInstance.text).toBe('Updated text');
    });

    it('should handle multiple updates', () => {
      const spinner = new Spinner('Step 1');
      spinner.update('Step 2');
      spinner.update('Step 3');
      spinner.update('Final step');

      expect(mockOraInstance.text).toBe('Final step');
    });

    it('should update with empty string', () => {
      const spinner = new Spinner('Original');
      spinner.update('');

      expect(mockOraInstance.text).toBe('');
    });

    it('should handle updates with dynamic content', () => {
      const spinner = new Spinner('Starting');
      const progress = ['Initializing...', 'Loading data...', 'Processing...', 'Finalizing...'];
      
      progress.forEach(text => spinner.update(text));

      expect(mockOraInstance.text).toBe('Finalizing...');
    });
  });

  describe('stop method', () => {
    it('should stop the spinner', () => {
      const spinner = new Spinner('Running');
      spinner.stop();

      expect(mockOraInstance.stop).toHaveBeenCalled();
    });

    it('should handle multiple stop calls', () => {
      const spinner = new Spinner('Running');
      spinner.stop();
      spinner.stop();
      spinner.stop();

      expect(mockOraInstance.stop).toHaveBeenCalledTimes(3);
    });
  });

  describe('clear method', () => {
    it('should clear the spinner', () => {
      const spinner = new Spinner('Clearing');
      spinner.clear();

      expect(mockOraInstance.clear).toHaveBeenCalled();
    });

    it('should handle multiple clear calls', () => {
      const spinner = new Spinner('Clearing');
      spinner.clear();
      spinner.clear();

      expect(mockOraInstance.clear).toHaveBeenCalledTimes(2);
    });
  });

  describe('Complex workflows', () => {
    it('should handle complete success workflow', () => {
      const spinner = new Spinner('Initializing project');
      
      spinner.start();
      spinner.update('Downloading dependencies');
      spinner.update('Installing packages');
      spinner.update('Configuring environment');
      spinner.succeed('Project setup completed');

      expect(mockOraInstance.start).toHaveBeenCalled();
      expect(mockOraInstance.text).toBe('Configuring environment');
      expect(mockOraInstance.succeed).toHaveBeenCalledWith('[GREEN]Project setup completed[/GREEN]');
    });

    it('should handle failure workflow', () => {
      const spinner = new Spinner('Connecting to API');
      
      spinner.start();
      spinner.update('Authenticating...');
      spinner.update('Fetching data...');
      spinner.fail('Connection failed: Network timeout');

      expect(mockOraInstance.start).toHaveBeenCalled();
      expect(mockOraInstance.text).toBe('Fetching data...');
      expect(mockOraInstance.fail).toHaveBeenCalledWith('[RED]Connection failed: Network timeout[/RED]');
    });

    it('should handle warning workflow', () => {
      const spinner = new Spinner('Validating configuration');
      
      spinner.start();
      spinner.update('Checking required fields...');
      spinner.update('Validating data types...');
      spinner.warn('Some optional fields are missing');

      expect(mockOraInstance.warn).toHaveBeenCalledWith('[YELLOW]Some optional fields are missing[/YELLOW]');
    });

    it('should handle info workflow', () => {
      const spinner = new Spinner('Building project');
      
      spinner.start();
      spinner.update('Compiling TypeScript...');
      spinner.update('Bundling assets...');
      spinner.info('Build completed with 0 errors, 2 warnings');

      expect(mockOraInstance.info).toHaveBeenCalledWith('[BLUE]Build completed with 0 errors, 2 warnings[/BLUE]');
    });

    it('should handle start-stop-restart pattern', () => {
      const spinner = new Spinner('Processing');
      
      spinner.start('Phase 1');
      spinner.stop();
      spinner.start('Phase 2');
      spinner.stop();
      spinner.start('Phase 3');
      spinner.succeed('All phases completed');

      expect(mockOraInstance.start).toHaveBeenCalledTimes(3);
      expect(mockOraInstance.stop).toHaveBeenCalledTimes(2);
      expect(mockOraInstance.succeed).toHaveBeenCalledWith('[GREEN]All phases completed[/GREEN]');
    });

    it('should handle clear and update pattern', () => {
      const spinner = new Spinner('Working');
      
      spinner.start();
      spinner.clear();
      spinner.update('Updated after clear');
      spinner.start('Restarted');

      expect(mockOraInstance.clear).toHaveBeenCalled();
      expect(mockOraInstance.text).toBe('Restarted');
    });
  });

  describe('Edge cases', () => {
    it('should handle null-like text values', () => {
      const spinner = new Spinner('Test');
      
      // These should not throw errors
      spinner.update(null as any);
      spinner.start(undefined);
      spinner.succeed(null as any);
      spinner.fail(undefined);

      expect(mockOraInstance.start).toHaveBeenCalled();
    });

    it('should handle rapid successive method calls', () => {
      const spinner = new Spinner('Rapid test');
      
      for (let i = 0; i < 100; i++) {
        spinner.update(`Update ${i}`);
      }
      
      spinner.start();
      spinner.clear();
      spinner.stop();
      spinner.succeed('Rapid test completed');

      expect(mockOraInstance.text).toBe('Update 99');
      expect(mockOraInstance.succeed).toHaveBeenCalledWith('[GREEN]Rapid test completed[/GREEN]');
    });

    it('should handle very long text content', () => {
      const longText = 'A'.repeat(1000);
      const spinner = new Spinner(longText);
      
      spinner.start();
      spinner.succeed(longText);

      expect(mockOraInstance.succeed).toHaveBeenCalledWith(`[GREEN]${longText}[/GREEN]`);
    });

    it('should handle unicode and emoji content', () => {
      const emojiText = '🚀 Deploying to production 🌟 with 100% success rate 🎯';
      const spinner = new Spinner(emojiText);
      
      spinner.start();
      spinner.succeed(emojiText);

      expect(mockOraInstance.succeed).toHaveBeenCalledWith(`[GREEN]${emojiText}[/GREEN]`);
    });
  });
});

describe('createSpinner function', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create and return a new Spinner instance', () => {
    const spinner = createSpinner('Test spinner');

    expect(spinner).toBeInstanceOf(Spinner);
    expect(ora).toHaveBeenCalledWith({
      text: 'Test spinner',
      spinner: 'dots',
      color: 'cyan',
    });
  });

  it('should create spinner with empty text', () => {
    const spinner = createSpinner('');

    expect(spinner).toBeInstanceOf(Spinner);
    expect(ora).toHaveBeenCalledWith({
      text: '',
      spinner: 'dots',
      color: 'cyan',
    });
  });

  it('should create multiple independent spinners', () => {
    const spinner1 = createSpinner('Spinner 1');
    const spinner2 = createSpinner('Spinner 2');
    const spinner3 = createSpinner('Spinner 3');

    expect(spinner1).toBeInstanceOf(Spinner);
    expect(spinner2).toBeInstanceOf(Spinner);
    expect(spinner3).toBeInstanceOf(Spinner);
    expect(ora).toHaveBeenCalledTimes(3);
  });

  it('should pass text correctly to constructor', () => {
    const testText = 'Factory function test';
    createSpinner(testText);

    expect(ora).toHaveBeenCalledWith({
      text: testText,
      spinner: 'dots',
      color: 'cyan',
    });
  });
});

describe('Integration tests', () => {
  it('should support typical CLI loading scenario', () => {
    const spinner = createSpinner('Loading project');
    
    // Simulate a typical loading workflow
    spinner.start();
    spinner.update('Reading configuration...');
    spinner.update('Validating dependencies...');
    spinner.update('Initializing components...');
    spinner.succeed('Project loaded successfully');

    expect(ora).toHaveBeenCalledWith({
      text: 'Loading project',
      spinner: 'dots',
      color: 'cyan',
    });
  });

  it('should support error handling scenario', () => {
    const spinner = createSpinner('Processing data');
    
    spinner.start();
    spinner.update('Parsing input...');
    spinner.update('Validating schema...');
    spinner.fail('Invalid data format detected');

    const mockInstance = (ora as jest.Mock).mock.results[0].value;
    expect(mockInstance.fail).toHaveBeenCalledWith('[RED]Invalid data format detected[/RED]');
  });

  it('should support multi-phase operation', () => {
    // Clear mock to reset call count for this test
    jest.clearAllMocks();
    
    // Create separate spinners for each phase (more realistic)
    const spinner1 = createSpinner('Phase 1: Preparation');
    const spinner2 = createSpinner('Phase 2: Processing');
    const spinner3 = createSpinner('Phase 3: Finalization');
    
    // Phase 1
    spinner1.start();
    spinner1.info('Phase 1 completed');
    
    // Phase 2
    spinner2.start();
    spinner2.warn('Phase 2 completed with warnings');
    
    // Phase 3
    spinner3.start();
    spinner3.succeed('All phases completed successfully');

    expect(ora).toHaveBeenCalledTimes(3);
    expect(chalk.blue).toHaveBeenCalledWith('Phase 1 completed');
    expect(chalk.yellow).toHaveBeenCalledWith('Phase 2 completed with warnings');
    expect(chalk.green).toHaveBeenCalledWith('All phases completed successfully');
  });
});