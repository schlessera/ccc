import chalk from 'chalk';

export class ProgressBar {
  private total: number;
  private current: number;
  private barLength: number;
  private label: string;

  constructor(total: number, label: string = '', barLength: number = 40) {
    this.total = total;
    this.current = 0;
    this.barLength = barLength;
    this.label = label;
  }

  update(current: number, message?: string): void {
    this.current = Math.min(current, this.total);
    this.render(message);
  }

  increment(message?: string): void {
    this.update(this.current + 1, message);
  }

  private render(message?: string): void {
    const percentage = Math.floor((this.current / this.total) * 100);
    const filledLength = Math.floor((this.current / this.total) * this.barLength);
    const emptyLength = this.barLength - filledLength;

    const filled = chalk.green('▓'.repeat(filledLength));
    const empty = chalk.gray('░'.repeat(emptyLength));
    const bar = `${filled}${empty}`;

    const status = message || this.label;
    const line = `  ${bar} ${percentage}% ${status}`;

    process.stdout.write('\r' + line);

    if (this.current >= this.total) {
      process.stdout.write('\n');
    }
  }

  complete(message?: string): void {
    this.update(this.total, message);
  }
}

export function createProgressBar(total: number, label?: string): ProgressBar {
  return new ProgressBar(total, label);
}

export function showProgress(steps: string[]): void {
  const progress = createProgressBar(steps.length, 'Processing...');
  
  steps.forEach((step, index) => {
    // Simulate work
    setTimeout(() => {
      progress.update(index + 1, step);
    }, index * 500);
  });
}