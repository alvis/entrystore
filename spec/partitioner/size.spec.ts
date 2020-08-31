/*
 *                            *** MIT LICENSE ***
 * -------------------------------------------------------------------------
 * This code may be modified and distributed under the MIT license.
 * See the LICENSE file for details.
 * -------------------------------------------------------------------------
 *
 * @summary   Tests on SizePartitioner
 *
 * @author    Alvis HT Tang <alvis@hilbert.space>
 * @license   MIT
 * @copyright Copyright (c) 2020 - All Rights Reserved.
 * -------------------------------------------------------------------------
 */

import { FixedSizePartitioner } from '#partitioner';

import type { Partitioner } from '#partitioner';

describe('cl:FixedSizePartitioner', () => {
  describe('fn:getRange', () => {
    const partitioner: Partitioner<number> = new FixedSizePartitioner({
      size: 1000,
    });

    it('returns undefined for any empty query', () => {
      expect(partitioner.getRange([])).toEqual(undefined);
    });

    it('returns the first and last partitions given the keys', () => {
      expect(partitioner.getRange(['1000', '10000', '999'])).toEqual({
        first: '999',
        last: '10000',
      });
    });
  });

  describe('fn:getPartition', () => {
    const partitioner: Partitioner<number> = new FixedSizePartitioner({
      size: 1000,
    });

    it('returns the partition in string given the key', () => {
      expect(partitioner.getPartition(9999)).toEqual('9000');
    });
  });
});
