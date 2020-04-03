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

import { SinglePartitioner } from './single';

import { Partitioner } from './prototype';

describe('SinglePartitioner', () => {
  const partitioner: Partitioner<string> = new SinglePartitioner('single');

  test('getRange', () => {
    expect(partitioner.getRange([])).toEqual({
      first: 'single',
      last: 'single',
    });
  });

  test('getPartition', () => {
    expect(partitioner.getPartition('index')).toEqual('single');
  });
});
