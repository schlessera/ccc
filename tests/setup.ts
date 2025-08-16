// Jest setup file for test environment configuration
import { FileSystemTestUtils } from './utils/filesystem-mock';
import { mockUI } from './mocks/mock-ui';
import * as os from 'os';
import * as path from 'path';

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.CCC_TEST_MODE = 'true';

// Use a temporary directory for CCC config during tests
const tempDir = os.tmpdir();
const testConfigDir = path.join(tempDir, `ccc-test-${Date.now()}-${Math.random().toString(36).substring(7)}`);
process.env.CCC_CONFIG_DIR = testConfigDir;

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Global test setup
beforeEach(() => {
  // Reset filesystem mocks
  FileSystemTestUtils.restore();
  
  // Reset UI mocks
  mockUI.reset();
  
  // Clear any cached modules
  jest.resetModules();
});

afterEach(() => {
  // Clean up filesystem mocks
  FileSystemTestUtils.restore();
  
  // Verify all UI responses were consumed
  if (mockUI.hasUnconsumedResponses()) {
    console.warn(`Test left ${mockUI.getUnconsumedResponsesCount()} unconsumed UI responses`);
  }
});

// Global teardown
afterAll(() => {
  // Ensure filesystem is restored
  FileSystemTestUtils.restore();
});

// Mock @clack/prompts globally for all tests
jest.mock('@clack/prompts', () => require('./mocks/mock-ui').clackMocks);

// Custom matchers for filesystem testing
expect.extend({
  toBeDirectory(received: string) {
    const fs = require('fs-extra');
    const pass = fs.existsSync(received) && fs.statSync(received).isDirectory();
    
    return {
      message: () => 
        pass 
          ? `expected ${received} not to be a directory`
          : `expected ${received} to be a directory`,
      pass,
    };
  },
  
  toBeFile(received: string) {
    const fs = require('fs-extra');
    const pass = fs.existsSync(received) && fs.statSync(received).isFile();
    
    return {
      message: () =>
        pass
          ? `expected ${received} not to be a file`
          : `expected ${received} to be a file`,
      pass,
    };
  },
  
  toHaveFileContent(received: string, expectedContent: string) {
    const fs = require('fs-extra');
    
    if (!fs.existsSync(received)) {
      return {
        message: () => `expected file ${received} to exist`,
        pass: false,
      };
    }
    
    const actualContent = fs.readFileSync(received, 'utf-8');
    const pass = actualContent.includes(expectedContent);
    
    return {
      message: () =>
        pass
          ? `expected file ${received} not to contain "${expectedContent}"`
          : `expected file ${received} to contain "${expectedContent}", but got "${actualContent}"`,
      pass,
    };
  }
});

// Type declarations for custom matchers
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeDirectory(): R;
      toBeFile(): R;
      toHaveFileContent(expectedContent: string): R;
    }
  }
}