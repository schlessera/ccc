import chalk from 'chalk';

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

export class Logger {
  private static level: LogLevel = LogLevel.INFO;
  private static quiet = false;
  private static verbose = false;

  static setQuiet(quiet: boolean): void {
    this.quiet = quiet;
  }

  static setVerbose(verbose: boolean): void {
    this.verbose = verbose;
    if (verbose) {
      this.level = LogLevel.DEBUG;
    }
  }

  static debug(...args: any[]): void {
    if (this.level <= LogLevel.DEBUG && !this.quiet) {
      console.log(chalk.gray('[DEBUG]'), ...args);
    }
  }

  static info(...args: any[]): void {
    if (this.level <= LogLevel.INFO && !this.quiet) {
      console.log(...args);
    }
  }

  static success(message: string): void {
    if (!this.quiet) {
      console.log(chalk.green('✓'), message);
    }
  }

  static warn(message: string): void {
    if (this.level <= LogLevel.WARN) {
      console.warn(chalk.yellow('⚠️'), message);
    }
  }

  static error(message: string | Error): void {
    const msg = message instanceof Error ? message.message : message;
    console.error(chalk.red('❌'), msg);
    if (message instanceof Error && this.verbose) {
      console.error(chalk.gray(message.stack));
    }
  }

  static heading(text: string): void {
    if (!this.quiet) {
      console.log();
      console.log(chalk.cyan.bold(text));
    }
  }

  static subheading(text: string): void {
    if (!this.quiet) {
      console.log(chalk.gray(text));
    }
  }

  static list(items: string[]): void {
    if (!this.quiet) {
      items.forEach(item => console.log(`  • ${item}`));
    }
  }
}