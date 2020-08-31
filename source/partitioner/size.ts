/*
 *                            *** MIT LICENSE ***
 * -------------------------------------------------------------------------
 * This code may be modified and distributed under the MIT license.
 * See the LICENSE file for details.
 * -------------------------------------------------------------------------
 *
 * @summary   A partitioner for setting a partition by a numeric index
 *
 * @author    Alvis HT Tang <alvis@hilbert.space>
 * @license   MIT
 * @copyright Copyright (c) 2020 - All Rights Reserved.
 * -------------------------------------------------------------------------
 */

import type { Partitioner } from './prototype';

/** A partitioner for setting a partition by a numeric index */
export class FixedSizePartitioner implements Partitioner<number> {
  private size: number;

  /**
   * create a partitioner instance
   * @param options options for this partitioner
   * @param options.size number of maximum entries per each partition
   */
  constructor(options: { size: number }) {
    const { size } = options;

    this.size = size;
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

    const sortedPartitions = partitions
      .map((partition) => parseInt(partition))
      .sort((a, b) => a - b);

    return {
      first: sortedPartitions[0].toString(),
      last: sortedPartitions[sortedPartitions.length - 1].toString(),
    };
  }

  /**
   * get the partition where an entry should belong to given the index
   * @param index index of an entry
   * @returns the partition reference
   */
  public getPartition(index: number): string {
    return (index - (index % this.size)).toString();
  }
}
