import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';

/**
 * Test runner for CLI commands in E2E tests
 */
export class CLITestRunner {
  private cliPath: string;
  private cwd: string;
  private env: NodeJS.ProcessEnv;

  constructor(options: {
    cliPath?: string;
    cwd?: string;
    env?: NodeJS.ProcessEnv;
  } = {}) {
    this.cliPath = options.cliPath || path.join(__dirname, '../../dist/cli/index.js');
    this.cwd = options.cwd || process.cwd();
    this.env = { ...process.env, ...options.env };
  }

  /**
   * Execute a CLI command and return the result
   */
  async run(args: string[], input?: string): Promise<CLIResult> {
    return new Promise((resolve, reject) => {
      const child = spawn('node', [this.cliPath, ...args], {
        cwd: this.cwd,
        env: this.env,
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';

      child.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      // Send input if provided
      if (input) {
        child.stdin?.write(input);
        child.stdin?.end();
      }

      child.on('close', (code) => {
        resolve(new CLIResult(code || 0, stdout, stderr));
      });

      child.on('error', (error) => {
        reject(error);
      });

      // Timeout after 10 seconds
      setTimeout(() => {
        child.kill();
        reject(new Error('CLI command timed out'));
      }, 10000);
    });
  }

  /**
   * Run a command and expect it to succeed (exit code 0)
   */
  async runSuccessfully(args: string[], input?: string): Promise<CLIResult> {
    const result = await this.run(args, input);
    if (result.exitCode !== 0) {
      throw new Error(`Command failed with exit code ${result.exitCode}: ${result.stderr}`);
    }
    return result;
  }

  /**
   * Run a command and expect it to fail (non-zero exit code)
   */
  async runWithFailure(args: string[], input?: string): Promise<CLIResult> {
    const result = await this.run(args, input);
    if (result.exitCode === 0) {
      throw new Error(`Command unexpectedly succeeded: ${result.stdout}`);
    }
    return result;
  }

  /**
   * Simulate interactive input for menu-driven commands
   */
  simulateInteractiveInput(inputs: string[]): string {
    // Each input followed by Enter
    return inputs.map(input => input + '\n').join('');
  }

  /**
   * Set working directory for subsequent commands
   */
  setWorkingDirectory(cwd: string): this {
    this.cwd = cwd;
    return this;
  }

  /**
   * Set environment variables for subsequent commands
   */
  setEnvironment(env: NodeJS.ProcessEnv): this {
    this.env = { ...process.env, ...env };
    return this;
  }
}

/**
 * Result of a CLI command execution
 */
export class CLIResult {
  constructor(
    public exitCode: number,
    public stdout: string,
    public stderr: string
  ) {}

  /**
   * Check if the command was successful
   */
  isSuccess(): boolean {
    return this.exitCode === 0;
  }

  /**
   * Check if the command failed
   */
  isFailure(): boolean {
    return this.exitCode !== 0;
  }

  /**
   * Check if stdout contains text
   */
  hasOutput(text: string): boolean {
    return this.stdout.includes(text);
  }

  /**
   * Check if stderr contains text
   */
  hasError(text: string): boolean {
    return this.stderr.includes(text);
  }

  /**
   * Get all output (stdout + stderr)
   */
  getAllOutput(): string {
    return this.stdout + this.stderr;
  }

  /**
   * Get lines from stdout
   */
  getOutputLines(): string[] {
    return this.stdout.split('\n').filter(line => line.trim() !== '');
  }

  /**
   * Get lines from stderr
   */
  getErrorLines(): string[] {
    return this.stderr.split('\n').filter(line => line.trim() !== '');
  }
}

/**
 * Helper functions for CLI testing
 */
export class CLITestHelpers {
  /**
   * Create a CLI runner for the current project
   */
  static createRunner(cwd?: string): CLITestRunner {
    return new CLITestRunner({ cwd });
  }

  /**
   * Simulate user selecting an option from a menu
   */
  static selectMenuOption(optionIndex: number): string {
    // Arrow keys + Enter for menu selection
    const arrows = Array(optionIndex).fill('\u001b[B').join(''); // Down arrows
    return arrows + '\n'; // Enter to select
  }

  /**
   * Simulate user entering text
   */
  static enterText(text: string): string {
    return text + '\n';
  }

  /**
   * Simulate user pressing ESC
   */
  static pressESC(): string {
    return '\u001b'; // ESC key
  }

  /**
   * Simulate Ctrl+C
   */
  static pressCtrlC(): string {
    return '\u0003'; // Ctrl+C
  }

  /**
   * Wait for a specified amount of time
   */
  static async wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}