import { ProgressBar, createProgressBar, showProgress } from '../../../../src/cli/ui/progress';

// Mock chalk
jest.mock('chalk', () => {
  const mockChalk = {
    green: jest.fn((text) => `[GREEN]${text}[/GREEN]`),
    gray: jest.fn((text) => `[GRAY]${text}[/GRAY]`),
  };
  return {
    __esModule: true,
    default: mockChalk
  };
});

describe('ProgressBar', () => {
  let mockStdoutWrite: jest.SpyInstance;

  beforeEach(() => {
    mockStdoutWrite = jest.spyOn(process.stdout, 'write').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Constructor', () => {
    it('should create progress bar with default parameters', () => {
      const progress = new ProgressBar(10);
      
      expect(progress).toBeInstanceOf(ProgressBar);
    });

    it('should create progress bar with custom label', () => {
      const progress = new ProgressBar(10, 'Custom label');
      
      expect(progress).toBeInstanceOf(ProgressBar);
    });

    it('should create progress bar with custom bar length', () => {
      const progress = new ProgressBar(10, 'Label', 20);
      
      expect(progress).toBeInstanceOf(ProgressBar);
    });

    it('should handle zero total', () => {
      const progress = new ProgressBar(0);
      
      expect(progress).toBeInstanceOf(ProgressBar);
    });
  });

  describe('Update method', () => {
    it('should update progress and render', () => {
      const progress = new ProgressBar(10, 'Testing');
      progress.update(5);
      
      expect(mockStdoutWrite).toHaveBeenCalled();
      const output = mockStdoutWrite.mock.calls[0][0];
      expect(output).toContain('50%');
      expect(output).toContain('Testing');
    });

    it('should update progress with custom message', () => {
      const progress = new ProgressBar(10);
      progress.update(3, 'Custom message');
      
      expect(mockStdoutWrite).toHaveBeenCalled();
      const output = mockStdoutWrite.mock.calls[0][0];
      expect(output).toContain('30%');
      expect(output).toContain('Custom message');
    });

    it('should not exceed total progress', () => {
      const progress = new ProgressBar(10);
      progress.update(15); // More than total
      
      expect(mockStdoutWrite).toHaveBeenCalled();
      const output = mockStdoutWrite.mock.calls[0][0];
      expect(output).toContain('100%');
    });

    it('should handle negative values', () => {
      const progress = new ProgressBar(10);
      progress.update(-5);
      
      expect(mockStdoutWrite).toHaveBeenCalled();
      const output = mockStdoutWrite.mock.calls[0][0];
      expect(output).toContain('0%'); // Should be clamped to 0
    });

    it('should add newline when progress is complete', () => {
      const progress = new ProgressBar(10);
      progress.update(10);
      
      expect(mockStdoutWrite).toHaveBeenCalledTimes(2);
      expect(mockStdoutWrite.mock.calls[1][0]).toBe('\n');
    });
  });

  describe('Increment method', () => {
    it('should increment progress by 1', () => {
      const progress = new ProgressBar(10);
      progress.increment();
      
      expect(mockStdoutWrite).toHaveBeenCalled();
      const output = mockStdoutWrite.mock.calls[0][0];
      expect(output).toContain('10%');
    });

    it('should increment with custom message', () => {
      const progress = new ProgressBar(10);
      progress.increment('Step completed');
      
      expect(mockStdoutWrite).toHaveBeenCalled();
      const output = mockStdoutWrite.mock.calls[0][0];
      expect(output).toContain('10%');
      expect(output).toContain('Step completed');
    });

    it('should handle multiple increments', () => {
      const progress = new ProgressBar(5);
      
      progress.increment('Step 1');
      let output = mockStdoutWrite.mock.calls[0][0];
      expect(output).toContain('20%');
      
      progress.increment('Step 2');
      output = mockStdoutWrite.mock.calls[1][0];
      expect(output).toContain('40%');
      
      progress.increment('Step 3');
      output = mockStdoutWrite.mock.calls[2][0];
      expect(output).toContain('60%');
    });

    it('should not increment beyond total', () => {
      const progress = new ProgressBar(2);
      
      progress.increment(); // 50% - call 0
      progress.increment(); // 100% - call 1, newline - call 2
      progress.increment(); // Should stay at 100% - call 3, newline - call 4
      
      // Check that the 100% output is in the third render call (index 3)
      const finalOutput = mockStdoutWrite.mock.calls[3][0];
      expect(finalOutput).toContain('100%');
    });
  });

  describe('Complete method', () => {
    it('should set progress to 100%', () => {
      const progress = new ProgressBar(10);
      progress.complete();
      
      expect(mockStdoutWrite).toHaveBeenCalledTimes(2); // Progress + newline
      const output = mockStdoutWrite.mock.calls[0][0];
      expect(output).toContain('100%');
      expect(mockStdoutWrite.mock.calls[1][0]).toBe('\n');
    });

    it('should complete with custom message', () => {
      const progress = new ProgressBar(10);
      progress.complete('All done!');
      
      expect(mockStdoutWrite).toHaveBeenCalled();
      const output = mockStdoutWrite.mock.calls[0][0];
      expect(output).toContain('100%');
      expect(output).toContain('All done!');
    });
  });

  describe('Rendering logic', () => {
    it('should render correct progress bar format', () => {
      const progress = new ProgressBar(10, 'Test', 20);
      progress.update(5);
      
      const output = mockStdoutWrite.mock.calls[0][0];
      expect(output).toMatch(/^\s+\[GREEN\]▓+\[\/GREEN\]\[GRAY\]░+\[\/GRAY\]\s+50%\s+Test$/);
    });

    it('should render empty bar at 0%', () => {
      const progress = new ProgressBar(10, 'Empty', 10);
      progress.update(0);
      
      const output = mockStdoutWrite.mock.calls[0][0];
      expect(output).toContain('0%');
      expect(output).toContain('[GRAY]░░░░░░░░░░[/GRAY]');
    });

    it('should render full bar at 100%', () => {
      const progress = new ProgressBar(10, 'Full', 10);
      progress.update(10);
      
      const output = mockStdoutWrite.mock.calls[0][0];
      expect(output).toContain('100%');
      expect(output).toContain('[GREEN]▓▓▓▓▓▓▓▓▓▓[/GREEN]');
    });

    it('should handle partial progress correctly', () => {
      const progress = new ProgressBar(100, 'Partial', 10);
      progress.update(33); // 33%
      
      const output = mockStdoutWrite.mock.calls[0][0];
      expect(output).toContain('33%');
      // Should have 3 filled characters (33% of 10)
      expect(output).toContain('[GREEN]▓▓▓[/GREEN]');
      expect(output).toContain('[GRAY]░░░░░░░[/GRAY]');
    });
  });

  describe('Edge cases', () => {
    it('should handle zero total gracefully', () => {
      const progress = new ProgressBar(0);
      progress.update(0);
      
      expect(mockStdoutWrite).toHaveBeenCalled();
      // Should not crash with division by zero
    });

    it('should handle single step progress', () => {
      const progress = new ProgressBar(1);
      progress.increment();
      
      const output = mockStdoutWrite.mock.calls[0][0];
      expect(output).toContain('100%');
    });

    it('should handle very small bar length', () => {
      const progress = new ProgressBar(10, 'Small', 1);
      progress.update(5);
      
      expect(mockStdoutWrite).toHaveBeenCalled();
      const output = mockStdoutWrite.mock.calls[0][0];
      expect(output).toContain('50%');
    });

    it('should handle very large total', () => {
      const progress = new ProgressBar(1000000);
      progress.update(500000);
      
      const output = mockStdoutWrite.mock.calls[0][0];
      expect(output).toContain('50%');
    });

    it('should handle empty label', () => {
      const progress = new ProgressBar(10, '');
      progress.update(5);
      
      const output = mockStdoutWrite.mock.calls[0][0];
      expect(output).toContain('50%');
    });
  });

  describe('Progress tracking accuracy', () => {
    it('should calculate percentages correctly', () => {
      const progress = new ProgressBar(13); // Odd number to test rounding
      
      progress.update(4); // 30.77% -> 30%
      let output = mockStdoutWrite.mock.calls[0][0];
      expect(output).toContain('30%');
      
      progress.update(7); // 53.85% -> 53%
      output = mockStdoutWrite.mock.calls[1][0];
      expect(output).toContain('53%');
    });

    it('should handle floating point precision', () => {
      const progress = new ProgressBar(3);
      
      progress.update(1); // 33.33%
      let output = mockStdoutWrite.mock.calls[0][0];
      expect(output).toContain('33%');
      
      progress.update(2); // 66.67%
      output = mockStdoutWrite.mock.calls[1][0];
      expect(output).toContain('66%');
    });
  });
});

describe('createProgressBar function', () => {
  it('should create and return a new ProgressBar instance', () => {
    const progress = createProgressBar(10);
    
    expect(progress).toBeInstanceOf(ProgressBar);
  });

  it('should create progress bar with label', () => {
    const progress = createProgressBar(10, 'Custom label');
    
    expect(progress).toBeInstanceOf(ProgressBar);
  });

  it('should create multiple independent progress bars', () => {
    const progress1 = createProgressBar(5, 'First');
    const progress2 = createProgressBar(10, 'Second');
    
    expect(progress1).toBeInstanceOf(ProgressBar);
    expect(progress2).toBeInstanceOf(ProgressBar);
    expect(progress1).not.toBe(progress2);
  });
});

describe('showProgress function', () => {
  let mockSetTimeout: jest.SpyInstance;

  beforeEach(() => {
    mockSetTimeout = jest.spyOn(global, 'setTimeout').mockImplementation((fn, _delay) => {
      // Execute immediately for testing
      if (typeof fn === 'function') {
        fn();
      }
      return 1 as any;
    });
    jest.spyOn(process.stdout, 'write').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should create progress bar and process steps', () => {
    const steps = ['Step 1', 'Step 2', 'Step 3'];
    showProgress(steps);
    
    expect(mockSetTimeout).toHaveBeenCalledTimes(3);
  });

  it('should handle empty steps array', () => {
    showProgress([]);
    
    expect(mockSetTimeout).not.toHaveBeenCalled();
  });

  it('should handle single step', () => {
    showProgress(['Only step']);
    
    expect(mockSetTimeout).toHaveBeenCalledTimes(1);
  });

  it('should set correct delays for steps', () => {
    const steps = ['Step 1', 'Step 2'];
    showProgress(steps);
    
    expect(mockSetTimeout).toHaveBeenNthCalledWith(1, expect.any(Function), 0);
    expect(mockSetTimeout).toHaveBeenNthCalledWith(2, expect.any(Function), 500);
  });
});