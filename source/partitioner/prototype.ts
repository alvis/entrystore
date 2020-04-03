/*
 *                            *** MIT LICENSE ***
 * -------------------------------------------------------------------------
 * This code may be modified and distributed under the MIT license.
 * See the LICENSE file for details.
 * -------------------------------------------------------------------------
 *
 * @summary   Prototype of a partitioner that determines the partition
 *            where an entry should reside
 *
 * @author    Alvis HT Tang <alvis@hilbert.space>
 * @license   MIT
 * @copyright Copyright (c) 2020 - All Rights Reserved.
 * -------------------------------------------------------------------------
 */

import type { SupportedData } from '#types';

/** prototype of a partitioner that determines where an entry should be stored */
export abstract class Partitioner<Index extends SupportedData> {
  /**
   * get the first and last partition from a list of partition references
   * @param partitions references of partitions
   * @returns the first & last partition reference
   */
  public abstract getRange(
    partitions: string[],
  ): { first: string; last: string } | undefined;

  /**
   * get the partition where an entry should belong to given the index
   * @param index index of an entry
   * @returns the partition reference
   */
  public abstract getPartition(index: Index): string;
}
