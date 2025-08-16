import { TableBuilder, createTable, formatProjectTable, TableOptions } from '../../../../src/cli/ui/table';

// Mock cli-table3
jest.mock('cli-table3', () => {
  return jest.fn().mockImplementation((options) => ({
    push: jest.fn(),
    toString: jest.fn(() => 'mocked-table-output'),
    options,
  }));
});

// Mock chalk
jest.mock('chalk', () => {
  const mockChalk = {
    cyan: {
      bold: jest.fn((text) => `[CYAN_BOLD]${text}[/CYAN_BOLD]`)
    }
  };
  return {
    __esModule: true,
    default: mockChalk
  };
});

import Table from 'cli-table3';

describe('TableBuilder', () => {
  let mockTableInstance: any;
  let consoleLogSpy: jest.SpyInstance;

  beforeEach(() => {
    mockTableInstance = {
      push: jest.fn(),
      toString: jest.fn(() => 'test-table-output'),
    };
    (Table as jest.Mock).mockReturnValue(mockTableInstance);
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Constructor', () => {
    it('should create table with basic options', () => {
      const options: TableOptions = {
        head: ['Name', 'Age', 'City']
      };
      
      new TableBuilder(options);
      
      expect(Table).toHaveBeenCalledWith({
        head: ['[CYAN_BOLD]Name[/CYAN_BOLD]', '[CYAN_BOLD]Age[/CYAN_BOLD]', '[CYAN_BOLD]City[/CYAN_BOLD]'],
        style: {
          head: ['cyan'],
          border: ['grey'],
        },
        colWidths: undefined,
        wordWrap: true,
      });
    });

    it('should create table with custom style options', () => {
      const options: TableOptions = {
        head: ['Column 1', 'Column 2'],
        style: {
          head: ['red'],
          border: ['blue']
        }
      };
      
      new TableBuilder(options);
      
      expect(Table).toHaveBeenCalledWith(expect.objectContaining({
        style: {
          head: ['red'],
          border: ['blue'],
        }
      }));
    });

    it('should create table with column widths', () => {
      const options: TableOptions = {
        head: ['Name', 'Description'],
        colWidths: [20, 50]
      };
      
      new TableBuilder(options);
      
      expect(Table).toHaveBeenCalledWith(expect.objectContaining({
        colWidths: [20, 50]
      }));
    });

    it('should create table with wordWrap disabled', () => {
      const options: TableOptions = {
        head: ['Column'],
        wordWrap: false
      };
      
      new TableBuilder(options);
      
      expect(Table).toHaveBeenCalledWith(expect.objectContaining({
        wordWrap: false
      }));
    });

    it('should handle empty headers', () => {
      const options: TableOptions = {
        head: []
      };
      
      new TableBuilder(options);
      
      expect(Table).toHaveBeenCalledWith(expect.objectContaining({
        head: []
      }));
    });
  });

  describe('addRow method', () => {
    it('should add string row to table', () => {
      const table = new TableBuilder({ head: ['Name', 'Age'] });
      table.addRow('John', 'Doe');
      
      expect(mockTableInstance.push).toHaveBeenCalledWith(['John', 'Doe']);
    });

    it('should add mixed type row to table', () => {
      const table = new TableBuilder({ head: ['Name', 'Age', 'Score'] });
      table.addRow('Alice', 25, 95.5);
      
      expect(mockTableInstance.push).toHaveBeenCalledWith(['Alice', '25', '95.5']);
    });

    it('should handle empty strings', () => {
      const table = new TableBuilder({ head: ['Name', 'Value'] });
      table.addRow('', 'test');
      
      expect(mockTableInstance.push).toHaveBeenCalledWith(['', 'test']);
    });

    it('should handle zero values', () => {
      const table = new TableBuilder({ head: ['Name', 'Count'] });
      table.addRow('Item', 0);
      
      expect(mockTableInstance.push).toHaveBeenCalledWith(['Item', '0']);
    });

    it('should handle special characters', () => {
      const table = new TableBuilder({ head: ['Symbol', 'Unicode'] });
      table.addRow('✓', '→');
      
      expect(mockTableInstance.push).toHaveBeenCalledWith(['✓', '→']);
    });
  });

  describe('addRows method', () => {
    it('should add multiple rows to table', () => {
      const table = new TableBuilder({ head: ['Name', 'Age'] });
      const rows = [
        ['John', 30],
        ['Jane', 25],
        ['Bob', 35]
      ];
      
      table.addRows(rows);
      
      expect(mockTableInstance.push).toHaveBeenCalledTimes(3);
      expect(mockTableInstance.push).toHaveBeenNthCalledWith(1, ['John', '30']);
      expect(mockTableInstance.push).toHaveBeenNthCalledWith(2, ['Jane', '25']);
      expect(mockTableInstance.push).toHaveBeenNthCalledWith(3, ['Bob', '35']);
    });

    it('should handle empty rows array', () => {
      const table = new TableBuilder({ head: ['Name', 'Age'] });
      table.addRows([]);
      
      expect(mockTableInstance.push).not.toHaveBeenCalled();
    });

    it('should handle rows with different lengths', () => {
      const table = new TableBuilder({ head: ['A', 'B', 'C'] });
      const rows = [
        ['1', '2'],
        ['3', '4', '5', '6'],
        ['7']
      ];
      
      table.addRows(rows);
      
      expect(mockTableInstance.push).toHaveBeenNthCalledWith(1, ['1', '2']);
      expect(mockTableInstance.push).toHaveBeenNthCalledWith(2, ['3', '4', '5', '6']);
      expect(mockTableInstance.push).toHaveBeenNthCalledWith(3, ['7']);
    });
  });

  describe('toString method', () => {
    it('should return table string representation', () => {
      const table = new TableBuilder({ head: ['Name'] });
      const result = table.toString();
      
      expect(result).toBe('test-table-output');
      expect(mockTableInstance.toString).toHaveBeenCalled();
    });
  });

  describe('display method', () => {
    it('should log table to console', () => {
      const table = new TableBuilder({ head: ['Name'] });
      table.display();
      
      expect(consoleLogSpy).toHaveBeenCalledWith('test-table-output');
    });
  });

  describe('Full workflow', () => {
    it('should handle complete table creation and population', () => {
      const table = new TableBuilder({
        head: ['Project', 'Version', 'Status'],
        colWidths: [20, 10, 15],
        wordWrap: false
      });
      
      table.addRow('MyProject', '1.0.0', 'Active');
      table.addRow('TestProject', '2.1.0', 'Deprecated');
      table.addRows([
        ['NewProject', '0.1.0', 'Development'],
        ['OldProject', '3.0.0', 'Maintenance']
      ]);
      
      const output = table.toString();
      table.display();
      
      expect(mockTableInstance.push).toHaveBeenCalledTimes(4);
      expect(output).toBe('test-table-output');
      expect(consoleLogSpy).toHaveBeenCalledWith('test-table-output');
    });
  });
});

describe('createTable function', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create and return a new TableBuilder instance', () => {
    const options: TableOptions = { head: ['Test'] };
    const table = createTable(options);
    
    expect(table).toBeInstanceOf(TableBuilder);
    expect(Table).toHaveBeenCalledWith(expect.objectContaining({
      head: ['[CYAN_BOLD]Test[/CYAN_BOLD]']
    }));
  });

  it('should create table with all options', () => {
    const options: TableOptions = {
      head: ['Name', 'Value'],
      style: { head: ['green'], border: ['yellow'] },
      colWidths: [15, 25],
      wordWrap: false
    };
    
    const table = createTable(options);
    
    expect(table).toBeInstanceOf(TableBuilder);
    expect(Table).toHaveBeenCalledWith({
      head: ['[CYAN_BOLD]Name[/CYAN_BOLD]', '[CYAN_BOLD]Value[/CYAN_BOLD]'],
      style: { head: ['green'], border: ['yellow'] },
      colWidths: [15, 25],
      wordWrap: false
    });
  });
});

describe('formatProjectTable function', () => {
  let mockTableInstance: any;

  beforeEach(() => {
    mockTableInstance = {
      push: jest.fn(),
      toString: jest.fn(() => 'formatted-project-table'),
      addRow: jest.fn()
    };
    
    // Mock the TableBuilder class methods
    jest.spyOn(TableBuilder.prototype, 'addRow').mockImplementation(mockTableInstance.addRow);
    jest.spyOn(TableBuilder.prototype, 'toString').mockImplementation(mockTableInstance.toString);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should format projects into a table', () => {
    const projects = [
      {
        icon: '📦',
        name: 'MyProject',
        template: 'react',
        version: '1.0.0',
        updated: '2023-01-01',
        size: '150MB'
      },
      {
        icon: '🚀',
        name: 'AnotherProject',
        template: 'vue',
        version: '2.1.0',
        updated: '2023-02-15',
        size: '200MB'
      }
    ];
    
    const result = formatProjectTable(projects);
    
    expect(result).toBe('formatted-project-table');
    expect(TableBuilder.prototype.addRow).toHaveBeenCalledTimes(2);
    expect(TableBuilder.prototype.addRow).toHaveBeenNthCalledWith(1, 
      '📦 MyProject', 'react', '1.0.0', '2023-01-01', '150MB'
    );
    expect(TableBuilder.prototype.addRow).toHaveBeenNthCalledWith(2, 
      '🚀 AnotherProject', 'vue', '2.1.0', '2023-02-15', '200MB'
    );
  });

  it('should handle empty projects array', () => {
    const result = formatProjectTable([]);
    
    expect(result).toBe('formatted-project-table');
    expect(TableBuilder.prototype.addRow).not.toHaveBeenCalled();
  });

  it('should handle projects with missing properties', () => {
    const projects = [
      {
        icon: '',
        name: 'TestProject',
        template: undefined,
        version: null,
        updated: '',
        size: 0
      }
    ];
    
    const result = formatProjectTable(projects);
    
    expect(result).toBe('formatted-project-table');
    expect(TableBuilder.prototype.addRow).toHaveBeenCalledWith(
      ' TestProject', undefined, null, '', 0
    );
  });

  it('should create table with correct headers and column widths', () => {
    formatProjectTable([]);
    
    expect(Table).toHaveBeenCalledWith({
      head: [
        '[CYAN_BOLD]Project[/CYAN_BOLD]',
        '[CYAN_BOLD]Template[/CYAN_BOLD]',
        '[CYAN_BOLD]Version[/CYAN_BOLD]',
        '[CYAN_BOLD]Updated[/CYAN_BOLD]',
        '[CYAN_BOLD]Size[/CYAN_BOLD]'
      ],
      style: {
        head: ['cyan'],
        border: ['grey'],
      },
      colWidths: [25, 12, 10, 15, 10],
      wordWrap: true,
    });
  });

  it('should handle special characters in project data', () => {
    const projects = [
      {
        icon: '🎯',
        name: 'Special-Characters_Project',
        template: 'custom@latest',
        version: 'v1.0.0-beta.1',
        updated: '2023-12-31T23:59:59Z',
        size: '1.2GB'
      }
    ];
    
    formatProjectTable(projects);
    
    expect(TableBuilder.prototype.addRow).toHaveBeenCalledWith(
      '🎯 Special-Characters_Project',
      'custom@latest',
      'v1.0.0-beta.1',
      '2023-12-31T23:59:59Z',
      '1.2GB'
    );
  });
});