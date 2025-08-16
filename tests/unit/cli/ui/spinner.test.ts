import { Spinner, createSpinner } from '../../../../src/cli/ui/spinner';

// Mock ora and chalk
jest.mock('ora', () => {
  const mockOra = {
    start: jest.fn(),
    succeed: jest.fn(),
    fail: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    stop: jest.fn(),
    clear: jest.fn(),
    text: '',
  };
  return {
    __esModule: true,
    default: jest.fn(() => mockOra),
  };
});

jest.mock('chalk', () => {
  const mockChalk = {
    green: jest.fn((text) => `[GREEN]${text}[/GREEN]`),
    red: jest.fn((text) => `[RED]${text}[/RED]`),
    yellow: jest.fn((text) => `[YELLOW]${text}[/YELLOW]`),
    blue: jest.fn((text) => `[BLUE]${text}[/BLUE]`),
  };
  return {
    __esModule: true,
    default: mockChalk
  };
});

import ora from 'ora';

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
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Constructor', () => {
    it('should create a new spinner with correct options', () => {
      new Spinner('Loading...');
      
      expect(ora).toHaveBeenCalledWith({
        text: 'Loading...',
        spinner: 'dots',
        color: 'cyan',
      });
    });

    it('should handle empty text in constructor', () => {
      new Spinner('');
      
      expect(ora).toHaveBeenCalledWith({
        text: '',
        spinner: 'dots',
        color: 'cyan',
      });
    });
  });

  describe('Start method', () => {
    it('should start the spinner without changing text', () => {
      const spinner = new Spinner('Initial text');
      spinner.start();
      
      expect(mockOraInstance.start).toHaveBeenCalled();
      expect(mockOraInstance.text).toBe('');
    });

    it('should start the spinner and update text', () => {
      const spinner = new Spinner('Initial text');
      spinner.start('New text');
      
      expect(mockOraInstance.text).toBe('New text');
      expect(mockOraInstance.start).toHaveBeenCalled();
    });

    it('should handle undefined text parameter', () => {
      const spinner = new Spinner('Initial text');
      spinner.start(undefined);
      
      expect(mockOraInstance.start).toHaveBeenCalled();
    });
  });

  describe('Succeed method', () => {
    it('should call succeed without text', () => {
      const spinner = new Spinner('Loading...');
      spinner.succeed();
      
      expect(mockOraInstance.succeed).toHaveBeenCalledWith(undefined);
    });

    it('should call succeed with formatted text', () => {
      const spinner = new Spinner('Loading...');
      spinner.succeed('Success message');
      
      expect(mockOraInstance.succeed).toHaveBeenCalledWith('[GREEN]Success message[/GREEN]');
    });

    it('should handle empty string text', () => {
      const spinner = new Spinner('Loading...');
      spinner.succeed('');
      
      expect(mockOraInstance.succeed).toHaveBeenCalledWith(undefined);
    });
  });

  describe('Fail method', () => {
    it('should call fail without text', () => {
      const spinner = new Spinner('Loading...');
      spinner.fail();
      
      expect(mockOraInstance.fail).toHaveBeenCalledWith(undefined);
    });

    it('should call fail with formatted text', () => {
      const spinner = new Spinner('Loading...');
      spinner.fail('Error message');
      
      expect(mockOraInstance.fail).toHaveBeenCalledWith('[RED]Error message[/RED]');
    });
  });

  describe('Warn method', () => {
    it('should call warn without text', () => {
      const spinner = new Spinner('Loading...');
      spinner.warn();
      
      expect(mockOraInstance.warn).toHaveBeenCalledWith(undefined);
    });

    it('should call warn with formatted text', () => {
      const spinner = new Spinner('Loading...');
      spinner.warn('Warning message');
      
      expect(mockOraInstance.warn).toHaveBeenCalledWith('[YELLOW]Warning message[/YELLOW]');
    });
  });

  describe('Info method', () => {
    it('should call info without text', () => {
      const spinner = new Spinner('Loading...');
      spinner.info();
      
      expect(mockOraInstance.info).toHaveBeenCalledWith(undefined);
    });

    it('should call info with formatted text', () => {
      const spinner = new Spinner('Loading...');
      spinner.info('Info message');
      
      expect(mockOraInstance.info).toHaveBeenCalledWith('[BLUE]Info message[/BLUE]');
    });
  });

  describe('Update method', () => {
    it('should update spinner text', () => {
      const spinner = new Spinner('Initial');
      spinner.update('Updated text');
      
      expect(mockOraInstance.text).toBe('Updated text');
    });

    it('should handle empty string update', () => {
      const spinner = new Spinner('Initial');
      spinner.update('');
      
      expect(mockOraInstance.text).toBe('');
    });
  });

  describe('Stop method', () => {
    it('should stop the spinner', () => {
      const spinner = new Spinner('Loading...');
      spinner.stop();
      
      expect(mockOraInstance.stop).toHaveBeenCalled();
    });
  });

  describe('Clear method', () => {
    it('should clear the spinner', () => {
      const spinner = new Spinner('Loading...');
      spinner.clear();
      
      expect(mockOraInstance.clear).toHaveBeenCalled();
    });
  });

  describe('Method chaining workflow', () => {
    it('should handle complete spinner lifecycle', () => {
      const spinner = new Spinner('Initial text');
      
      spinner.start('Starting...');
      expect(mockOraInstance.text).toBe('Starting...');
      expect(mockOraInstance.start).toHaveBeenCalled();
      
      spinner.update('Processing...');
      expect(mockOraInstance.text).toBe('Processing...');
      
      spinner.succeed('Completed!');
      expect(mockOraInstance.succeed).toHaveBeenCalledWith('[GREEN]Completed![/GREEN]');
    });

    it('should handle error workflow', () => {
      const spinner = new Spinner('Loading...');
      
      spinner.start();
      spinner.update('Processing...');
      spinner.fail('Operation failed');
      
      expect(mockOraInstance.start).toHaveBeenCalled();
      expect(mockOraInstance.text).toBe('Processing...');
      expect(mockOraInstance.fail).toHaveBeenCalledWith('[RED]Operation failed[/RED]');
    });

    it('should handle warning workflow', () => {
      const spinner = new Spinner('Checking...');
      
      spinner.start();
      spinner.warn('Some issues found');
      
      expect(mockOraInstance.start).toHaveBeenCalled();
      expect(mockOraInstance.warn).toHaveBeenCalledWith('[YELLOW]Some issues found[/YELLOW]');
    });

    it('should handle info workflow', () => {
      const spinner = new Spinner('Analyzing...');
      
      spinner.start();
      spinner.info('Additional information');
      
      expect(mockOraInstance.start).toHaveBeenCalled();
      expect(mockOraInstance.info).toHaveBeenCalledWith('[BLUE]Additional information[/BLUE]');
    });
  });

  describe('Edge cases', () => {
    it('should handle multiple text updates', () => {
      const spinner = new Spinner('Initial');
      
      spinner.update('First update');
      expect(mockOraInstance.text).toBe('First update');
      
      spinner.update('Second update');
      expect(mockOraInstance.text).toBe('Second update');
      
      spinner.update('Final update');
      expect(mockOraInstance.text).toBe('Final update');
    });

    it('should handle stopping without starting', () => {
      const spinner = new Spinner('Test');
      spinner.stop();
      
      expect(mockOraInstance.stop).toHaveBeenCalled();
    });

    it('should handle clearing without starting', () => {
      const spinner = new Spinner('Test');
      spinner.clear();
      
      expect(mockOraInstance.clear).toHaveBeenCalled();
    });

    it('should handle multiple starts', () => {
      const spinner = new Spinner('Test');
      
      spinner.start('First start');
      spinner.start('Second start');
      
      expect(mockOraInstance.start).toHaveBeenCalledTimes(2);
      expect(mockOraInstance.text).toBe('Second start');
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
    const spinner1 = createSpinner('First');
    const spinner2 = createSpinner('Second');
    
    expect(spinner1).toBeInstanceOf(Spinner);
    expect(spinner2).toBeInstanceOf(Spinner);
    expect(spinner1).not.toBe(spinner2);
    expect(ora).toHaveBeenCalledTimes(2);
  });
});