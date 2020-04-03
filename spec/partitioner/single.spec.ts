/*

 *                            *** MIT LICENSE ***
 * -------------------------------------------------------------------------
 * This code may be modified and distributed under the MIT license.
 * See the LICENSE file for details.
 * -------------------------------------------------------------------------
 *
 * @summary   Tests on SinglePartitioner
 *
 * @author    Alvis HT Tang <alvis@hilbert.space>
 * @license   MIT
 * @copyright Copyright (c) 2020 - All Rights Reserved.
 * -------------------------------------------------------------------------
 */

import { SinglePartitioner } from '#partitioner';

import type { Partitioner } from '#partitioner';

describe('cl:SinglePartitioner', () => {
  const partitioner: Partitioner<string> = new SinglePartitioner('single');

  describe('fn:getRange', () => {
    it('contains only one partition', () => {
      expect(partitioner.getRange([])).toEqual({
        first: 'single',
        last: 'single',
      });
    });
  });

  describe('fn:getPartition', () => {
    test('returns only one partition whatsoever', () => {
      expect(partitioner.getPartition('index')).toEqual('single');
    });
  });
});
