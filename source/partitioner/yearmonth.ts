import { basename } from 'path';

import { DataType } from '../definitions';
import { Partitioner } from './prototype';

export class YearMonthPartitioner<Meta extends Record<string, DataType>>
  implements Partitioner<Meta> {
  private meta: (data: Meta) => Date;

  constructor(options: { meta(data: Meta): Date }) {
    this.meta = options.meta;
  }

  /**
   * get the last file path
   * @param paths files in the output directory
   * @return the path to the last file
   */
  public getLast(paths: string[]): string {
    const sortedPaths = paths.sort((a: string, b: string) => {
      const AYearMonth = this.extractYearMonth(a);
      const BYearMonth = this.extractYearMonth(b);

      return AYearMonth.year === BYearMonth.year &&
        AYearMonth.month === BYearMonth.month
        ? 0
        : AYearMonth.year * 12 + AYearMonth.month >
          BYearMonth.year * 12 + BYearMonth.month
        ? -1
        : 1;
    });

    return sortedPaths[0];
  }

  /**
   * get the path for the output csv
   * @param meta metadata of an entry
   * @return the absolute path to the file
   */
  public getPath(meta: Meta): string {
    const date = this.meta(meta);
    const year = (date.getUTCFullYear() + 0).toString().padStart(4, '0');
    const month = (date.getUTCMonth() + 1).toString().padStart(2, '0');

    return `${year}-${month}`;
  }

  /**
   * get the year and month based on a filename
   * @param path path to the file
   * @return year and month
   */
  private extractYearMonth(path: string): { year: number; month: number } {
    const [year, month] = basename(path)
      .split('-')
      .map(part => parseInt(part));

    return { year, month };
  }
}
