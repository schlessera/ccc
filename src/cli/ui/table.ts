import Table from 'cli-table3';
import chalk from 'chalk';

export interface TableOptions {
  head: string[];
  style?: {
    head?: string[];
    border?: string[];
  };
  colWidths?: number[];
  wordWrap?: boolean;
}

export class TableBuilder {
  private table: Table.Table;

  constructor(options: TableOptions) {
    this.table = new Table({
      head: options.head.map((h) => chalk.cyan.bold(h)),
      style: {
        head: options.style?.head || ['cyan'],
        border: options.style?.border || ['grey'],
      },
      colWidths: options.colWidths,
      wordWrap: options.wordWrap ?? true,
    } as Table.TableConstructorOptions);
  }

  addRow(...cells: (string | number)[]): void {
    this.table.push(cells.map((cell) => String(cell)));
  }

  addRows(rows: (string | number)[][]): void {
    rows.forEach((row) => this.addRow(...row));
  }

  toString(): string {
    return this.table.toString();
  }

  display(): void {
    console.log(this.toString());
  }
}

export function createTable(options: TableOptions): TableBuilder {
  return new TableBuilder(options);
}

export function formatProjectTable(projects: any[]): string {
  const table = createTable({
    head: ['Project', 'Template', 'Version', 'Updated', 'Size'],
    colWidths: [25, 12, 10, 15, 10],
  });

  projects.forEach((project) => {
    table.addRow(
      `${project.icon} ${project.name}`,
      project.template,
      project.version,
      project.updated,
      project.size
    );
  });

  return table.toString();
}