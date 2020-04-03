/*
 *                            *** MIT LICENSE ***
 * -------------------------------------------------------------------------
 * This code may be modified and distributed under the MIT license.
 * See the LICENSE file for details.
 * -------------------------------------------------------------------------
 *
 * @summary   A partitioner which only use a single partition for all data
 *
 * @author    Alvis HT Tang <alvis@hilbert.space>
 * @license   MIT
 * @copyright Copyright (c) 2020 - All Rights Reserved.
 * -------------------------------------------------------------------------
 */

import type { SupportedData } from '#types';
import type { Partitioner } from './prototype';

/** single named partition */
export class SinglePartitioner<Index extends SupportedData>
  implements Partitioner<Index> {
  private name: string;

  /**
   * create a named partition
   * @param name name of the partition
   */
  constructor(name: string) {
    this.name = name;
  }

  /**
   * get the first and last partition from a list of partition references
   * @returns the first & last partition reference
   */
  public getRange(): { first: string; last: string } {
    return { first: this.name, last: this.name };
  }

  /**
   * get the partition where an entry should belong to given the index
   * @returns the partition reference
   */
  public getPartition(): string {
    return this.name;
  }
}
