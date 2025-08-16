import { Logger, LogLevel } from '../../../src/utils/logger';

// Mock chalk
jest.mock('chalk', () => {
  const mockChalk = {
    gray: jest.fn((text) => `[GRAY]${text}[/GRAY]`),
    green: jest.fn((text) => `[GREEN]${text}[/GREEN]`),
    yellow: jest.fn((text) => `[YELLOW]${text}[/YELLOW]`),
    red: jest.fn((text) => `[RED]${text}[/RED]`),
    cyan: {
      bold: jest.fn((text) => `[CYAN_BOLD]${text}[/CYAN_BOLD]`)
    }
  };
  return {
    __esModule: true,
    default: mockChalk
  };
});

describe('Logger', () => {
  let consoleLogSpy: jest.SpyInstance;
  let consoleWarnSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    // Reset Logger state
    (Logger as any).level = LogLevel.INFO;
    (Logger as any).quiet = false;
    (Logger as any).verbose = false;

    // Clear all mocks first
    jest.clearAllMocks();

    // Spy on console methods
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('LogLevel enum', () => {
    it('should have correct log level values', () => {
      expect(LogLevel.DEBUG).toBe(0);
      expect(LogLevel.INFO).toBe(1);
      expect(LogLevel.WARN).toBe(2);
      expect(LogLevel.ERROR).toBe(3);
    });
  });

  describe('Configuration methods', () => {
    it('should set quiet mode', () => {
      Logger.setQuiet(true);
      Logger.info('test message');
      expect(consoleLogSpy).not.toHaveBeenCalled();

      Logger.setQuiet(false);
      Logger.info('test message');
      expect(consoleLogSpy).toHaveBeenCalledWith('test message');
    });

    it('should set verbose mode', () => {
      Logger.setVerbose(true);
      expect((Logger as any).verbose).toBe(true);
      expect((Logger as any).level).toBe(LogLevel.DEBUG);

      Logger.debug('debug message');
      expect(consoleLogSpy).toHaveBeenCalledWith('[GRAY][DEBUG][/GRAY]', 'debug message');
    });

    it('should handle quiet mode for different log levels', () => {
      // Clear previous calls and reset state
      consoleLogSpy.mockClear();
      consoleWarnSpy.mockClear();
      consoleErrorSpy.mockClear();
      
      (Logger as any).level = LogLevel.INFO;
      (Logger as any).verbose = false;
      Logger.setQuiet(true);

      Logger.debug('debug');
      Logger.info('info');
      Logger.success('success');
      Logger.heading('heading');
      Logger.subheading('subheading');
      Logger.list(['item1', 'item2']);

      expect(consoleLogSpy).not.toHaveBeenCalled();

      // Warn and error should still work in quiet mode
      Logger.warn('warning');
      Logger.error('error');
      expect(consoleWarnSpy).toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalled();
    });
  });

  describe('Debug logging', () => {
    it('should log debug messages when level is DEBUG', () => {
      (Logger as any).level = LogLevel.DEBUG;
      Logger.debug('debug message', 'extra arg');
      expect(consoleLogSpy).toHaveBeenCalledWith('[GRAY][DEBUG][/GRAY]', 'debug message', 'extra arg');
    });

    it('should not log debug messages when level is higher than DEBUG', () => {
      (Logger as any).level = LogLevel.INFO;
      Logger.debug('debug message');
      expect(consoleLogSpy).not.toHaveBeenCalled();
    });

    it('should not log debug messages in quiet mode', () => {
      (Logger as any).level = LogLevel.DEBUG;
      Logger.setQuiet(true);
      Logger.debug('debug message');
      expect(consoleLogSpy).not.toHaveBeenCalled();
    });

    it('should handle multiple arguments in debug', () => {
      (Logger as any).level = LogLevel.DEBUG;
      Logger.debug('message', { key: 'value' }, [1, 2, 3]);
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[GRAY][DEBUG][/GRAY]', 
        'message', 
        { key: 'value' }, 
        [1, 2, 3]
      );
    });
  });

  describe('Info logging', () => {
    it('should log info messages when level is INFO or lower', () => {
      Logger.info('info message');
      expect(consoleLogSpy).toHaveBeenCalledWith('info message');
    });

    it('should not log info messages when level is higher than INFO', () => {
      (Logger as any).level = LogLevel.WARN;
      Logger.info('info message');
      expect(consoleLogSpy).not.toHaveBeenCalled();
    });

    it('should handle multiple arguments in info', () => {
      Logger.info('message', 'arg1', 'arg2');
      expect(consoleLogSpy).toHaveBeenCalledWith('message', 'arg1', 'arg2');
    });
  });

  describe('Success logging', () => {
    it('should log success messages with green checkmark', () => {
      Logger.success('operation completed');
      expect(consoleLogSpy).toHaveBeenCalledWith('[GREEN]✓[/GREEN]', 'operation completed');
    });

    it('should not log success messages in quiet mode', () => {
      Logger.setQuiet(true);
      Logger.success('operation completed');
      expect(consoleLogSpy).not.toHaveBeenCalled();
    });
  });

  describe('Warning logging', () => {
    it('should log warning messages when level is WARN or lower', () => {
      Logger.warn('warning message');
      expect(consoleWarnSpy).toHaveBeenCalledWith('[YELLOW]⚠️[/YELLOW]', 'warning message');
    });

    it('should not log warning messages when level is higher than WARN', () => {
      (Logger as any).level = LogLevel.ERROR;
      Logger.warn('warning message');
      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });

    it('should log warnings even in quiet mode', () => {
      Logger.setQuiet(true);
      Logger.warn('warning message');
      expect(consoleWarnSpy).toHaveBeenCalledWith('[YELLOW]⚠️[/YELLOW]', 'warning message');
    });
  });

  describe('Error logging', () => {
    it('should log error messages with string input', () => {
      Logger.error('error message');
      expect(consoleErrorSpy).toHaveBeenCalledWith('[RED]❌[/RED]', 'error message');
    });

    it('should log error messages with Error object input', () => {
      const error = new Error('test error');
      Logger.error(error);
      expect(consoleErrorSpy).toHaveBeenCalledWith('[RED]❌[/RED]', 'test error');
    });

    it('should log error stack trace in verbose mode', () => {
      const error = new Error('test error');
      error.stack = 'Error: test error\n    at test (file:1:1)';
      
      Logger.setVerbose(true);
      Logger.error(error);
      
      expect(consoleErrorSpy).toHaveBeenCalledWith('[RED]❌[/RED]', 'test error');
      expect(consoleErrorSpy).toHaveBeenCalledWith('[GRAY]Error: test error\n    at test (file:1:1)[/GRAY]');
    });

    it('should not log stack trace in non-verbose mode', () => {
      const error = new Error('test error');
      error.stack = 'Error: test error\n    at test (file:1:1)';
      
      Logger.error(error);
      
      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      expect(consoleErrorSpy).toHaveBeenCalledWith('[RED]❌[/RED]', 'test error');
    });

    it('should log errors even in quiet mode', () => {
      Logger.setQuiet(true);
      Logger.error('error message');
      expect(consoleErrorSpy).toHaveBeenCalledWith('[RED]❌[/RED]', 'error message');
    });
  });

  describe('Heading logging', () => {
    it('should log headings with cyan bold formatting', () => {
      Logger.heading('Main Heading');
      expect(consoleLogSpy).toHaveBeenCalledWith(); // Empty line
      expect(consoleLogSpy).toHaveBeenCalledWith('[CYAN_BOLD]Main Heading[/CYAN_BOLD]');
    });

    it('should not log headings in quiet mode', () => {
      Logger.setQuiet(true);
      Logger.heading('Main Heading');
      expect(consoleLogSpy).not.toHaveBeenCalled();
    });
  });

  describe('Subheading logging', () => {
    it('should log subheadings with gray formatting', () => {
      Logger.subheading('Sub heading');
      expect(consoleLogSpy).toHaveBeenCalledWith('[GRAY]Sub heading[/GRAY]');
    });

    it('should not log subheadings in quiet mode', () => {
      Logger.setQuiet(true);
      Logger.subheading('Sub heading');
      expect(consoleLogSpy).not.toHaveBeenCalled();
    });
  });

  describe('List logging', () => {
    it('should log list items with bullet points', () => {
      Logger.list(['item 1', 'item 2', 'item 3']);
      expect(consoleLogSpy).toHaveBeenCalledWith('  • item 1');
      expect(consoleLogSpy).toHaveBeenCalledWith('  • item 2');
      expect(consoleLogSpy).toHaveBeenCalledWith('  • item 3');
    });

    it('should handle empty list', () => {
      Logger.list([]);
      expect(consoleLogSpy).not.toHaveBeenCalled();
    });

    it('should not log lists in quiet mode', () => {
      Logger.setQuiet(true);
      Logger.list(['item 1', 'item 2']);
      expect(consoleLogSpy).not.toHaveBeenCalled();
    });
  });

  describe('Log level integration', () => {
    it('should respect log levels for different methods', () => {
      (Logger as any).level = LogLevel.WARN;

      Logger.debug('debug');
      Logger.info('info');
      Logger.warn('warning');
      Logger.error('error');

      expect(consoleLogSpy).not.toHaveBeenCalled(); // debug and info should not log
      expect(consoleWarnSpy).toHaveBeenCalledWith('[YELLOW]⚠️[/YELLOW]', 'warning');
      expect(consoleErrorSpy).toHaveBeenCalledWith('[RED]❌[/RED]', 'error');
    });

    it('should allow all logs when level is DEBUG', () => {
      (Logger as any).level = LogLevel.DEBUG;

      Logger.debug('debug');
      Logger.info('info');
      Logger.warn('warning');
      Logger.error('error');

      expect(consoleLogSpy).toHaveBeenCalledWith('[GRAY][DEBUG][/GRAY]', 'debug');
      expect(consoleLogSpy).toHaveBeenCalledWith('info');
      expect(consoleWarnSpy).toHaveBeenCalledWith('[YELLOW]⚠️[/YELLOW]', 'warning');
      expect(consoleErrorSpy).toHaveBeenCalledWith('[RED]❌[/RED]', 'error');
    });
  });

  describe('State management', () => {
    it('should maintain internal state correctly', () => {
      // Initial state
      expect((Logger as any).level).toBe(LogLevel.INFO);
      expect((Logger as any).quiet).toBe(false);
      expect((Logger as any).verbose).toBe(false);

      // After setting verbose
      Logger.setVerbose(true);
      expect((Logger as any).verbose).toBe(true);
      expect((Logger as any).level).toBe(LogLevel.DEBUG);

      // After setting quiet
      Logger.setQuiet(true);
      expect((Logger as any).quiet).toBe(true);
    });

    it('should handle state changes during runtime', () => {
      // Start with normal logging
      Logger.info('should log');
      expect(consoleLogSpy).toHaveBeenCalledWith('should log');

      // Enable quiet mode
      Logger.setQuiet(true);
      Logger.info('should not log');
      expect(consoleLogSpy).toHaveBeenCalledTimes(1); // Only first call

      // Disable quiet mode
      Logger.setQuiet(false);
      Logger.info('should log again');
      expect(consoleLogSpy).toHaveBeenCalledWith('should log again');
    });
  });

  describe('Edge cases', () => {
    it('should handle undefined and null arguments', () => {
      Logger.debug(undefined, null);
      (Logger as any).level = LogLevel.DEBUG;
      Logger.debug(undefined, null);
      expect(consoleLogSpy).toHaveBeenCalledWith('[GRAY][DEBUG][/GRAY]', undefined, null);
    });

    it('should handle Error objects without stack trace', () => {
      const error = new Error('test error');
      delete error.stack;
      
      Logger.setVerbose(true);
      Logger.error(error);
      
      // The logger will still call console.error twice
      expect(consoleErrorSpy).toHaveBeenCalledTimes(2);
      expect(consoleErrorSpy).toHaveBeenNthCalledWith(1, '[RED]❌[/RED]', 'test error');
      expect(consoleErrorSpy).toHaveBeenNthCalledWith(2, '[GRAY]undefined[/GRAY]');
    });

    it('should handle complex objects in logging', () => {
      const complexObj = { nested: { data: [1, 2, 3] }, func: () => {} };
      Logger.info('Complex object:', complexObj);
      expect(consoleLogSpy).toHaveBeenCalledWith('Complex object:', complexObj);
    });
  });
});