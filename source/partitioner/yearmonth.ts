/*
 *                            *** MIT LICENSE ***
 * -------------------------------------------------------------------------
 * This code may be modified and distributed under the MIT license.
 * See the LICENSE file for details.
 * -------------------------------------------------------------------------
 *
 * @summary   A partitioner for setting a partition in YYYY-MM format
 *
 * @author    Alvis HT Tang <alvis@hilbert.space>
 * @license   MIT
 * @copyright Copyright (c) 2020 - All Rights Reserved.
 * -------------------------------------------------------------------------
 */

import { SupportedDataType } from '#types';
import { Partitioner } from './prototype';

/** options for YearMonthPartitionerOptions */
interface YearMonthPartitionerOptions<Index extends SupportedDataType> {
  adapter?: (Index: Index) => Date;
}

/** A partitioner for setting a partition in YYYY-MM format */
export class YearMonthPartitioner<Index extends SupportedDataType>
  implements Partitioner<Index> {
  private options: Required<YearMonthPartitionerOptions<Index>>;

  constructor(options?: YearMonthPartitionerOptions<Index>) {
    this.options = {
      adapter: (index: Index) => {
        if (typeof index === 'string' || index instanceof Date) {
          return new Date(index);
        } else if (typeof index === 'number') {
          return new Date(index * 1000);
        } else {
          throw new Error(`cannot convert ${index} into Date`);
        }
      },
      ...options,
    };
  }

  /**
   * get the first and last partition from a list of partition references
   * @param partitions references of partitions
   * @returns the first & last partition reference
   */
  public getRange(
    partitions: string[]
  ): { first: string; last: string } | undefined {
    if (partitions.length === 0) {
      return undefined;
    }

    const sortedPaths = partitions.sort((a: string, b: string) => {
      const AYearMonth = this.extractYearMonth(a);
      const BYearMonth = this.extractYearMonth(b);

      return AYearMonth.year === BYearMonth.year &&
        AYearMonth.month === BYearMonth.month
        ? 0
        : AYearMonth.year * 12 + AYearMonth.month >
          BYearMonth.year * 12 + BYearMonth.month
        ? 1
        : -1;
    });

    return { first: sortedPaths[0], last: sortedPaths[sortedPaths.length - 1] };
  }

  /**
   * get the partition where an entry should belong to given the index
   * @param index index of an entry
   * @returns the partition reference
   */
  public getPartition(index: Index): string {
    const date = this.options.adapter(index);
    const year = (date.getUTCFullYear() + 0).toString().padStart(4, '0');
    const month = (date.getUTCMonth() + 1).toString().padStart(2, '0');

    return `${year}-${month}`;
  }

  /**
   * get the year and month based on a partition
   * @param partition reference of the partition
   * @returns year and month
   */
  private extractYearMonth(partition: string): { year: number; month: number } {
    const [year, month] = partition.split('-').map((part) => parseInt(part));

    return { year, month };
  }
}
