import ora, { Ora } from 'ora';
import chalk from 'chalk';

export class Spinner {
  private spinner: Ora;

  constructor(text: string) {
    this.spinner = ora({
      text,
      spinner: 'dots',
      color: 'cyan',
    });
  }

  start(text?: string): void {
    if (text) {
      this.spinner.text = text;
    }
    this.spinner.start();
  }

  succeed(text?: string): void {
    this.spinner.succeed(text ? chalk.green(text) : undefined);
  }

  fail(text?: string): void {
    this.spinner.fail(text ? chalk.red(text) : undefined);
  }

  warn(text?: string): void {
    this.spinner.warn(text ? chalk.yellow(text) : undefined);
  }

  info(text?: string): void {
    this.spinner.info(text ? chalk.blue(text) : undefined);
  }

  update(text: string): void {
    this.spinner.text = text;
  }

  stop(): void {
    this.spinner.stop();
  }

  clear(): void {
    this.spinner.clear();
  }
}

export function createSpinner(text: string): Spinner {
  return new Spinner(text);
}