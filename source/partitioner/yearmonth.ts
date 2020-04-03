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

import type { SupportedData } from '#types';
import type { Partitioner } from './prototype';

/** options for YearMonthPartitionerOptions */
interface YearMonthPartitionerOptions<Index extends SupportedData> {
  adapter?: (Index: Index) => Date;
}

/** A partitioner for setting a partition in YYYY-MM format */
export class YearMonthPartitioner<Index extends SupportedData>
  implements Partitioner<Index> {
  private options: Required<YearMonthPartitionerOptions<Index>>;

  /**
   * create a partitioner instance
   * @param options options for this partitioner
   */
  constructor(options?: YearMonthPartitionerOptions<Index>) {
    const MILLISECONDS = 1000;
    const {
      adapter = (index: Index) => {
        if (typeof index === 'string' || index instanceof Date) {
          return new Date(index);
        } else if (typeof index === 'number') {
          return new Date(index * MILLISECONDS);
        } else {
          throw new Error(`cannot convert ${JSON.stringify(index)} into Date`);
        }
      },
    } = { ...options };

    this.options = {
      ...options,
      adapter,
    };
  }

  /**
   * get the first and last partition from a list of partition references
   * @param partitions references of partitions
   * @returns the first & last partition reference
   */
  public getRange(
    partitions: string[],
  ): { first: string; last: string } | undefined {
    if (partitions.length === 0) {
      return undefined;
    }

    const TWELVE_MONTHS = 12;
    const sortedPaths = partitions.sort((a: string, b: string) => {
      const { year: yearA, month: monthA } = this.extractYearMonth(a);
      const { year: yearB, month: monthB } = this.extractYearMonth(b);

      return yearA * TWELVE_MONTHS + monthA - yearB * TWELVE_MONTHS - monthB;
    });

    return { first: sortedPaths[0], last: sortedPaths[sortedPaths.length - 1] };
  }

  /**
   * get the partition where an entry should belong to given the index
   * @param index index of an entry
   * @returns the partition reference
   */
  public getPartition(index: Index): string {
    const YYYY = 4;
    const MM = 2;
    const date = this.options.adapter(index);
    const year = (date.getUTCFullYear() + 0).toString().padStart(YYYY, '0');
    const month = (date.getUTCMonth() + 1).toString().padStart(MM, '0');

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
