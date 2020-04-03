/*
 *                            *** MIT LICENSE ***
 * -------------------------------------------------------------------------
 * This code may be modified and distributed under the MIT license.
 * See the LICENSE file for details.
 * -------------------------------------------------------------------------
 *
 * @summary   Tests on YearMonthPartitioner
 *
 * @author    Alvis HT Tang <alvis@hilbert.space>
 * @license   MIT
 * @copyright Copyright (c) 2020 - All Rights Reserved.
 * -------------------------------------------------------------------------
 */

import { YearMonthPartitioner } from './yearmonth';

import { Partitioner } from './prototype';

describe('YearMonthPartitioner', () => {
  test('getRange', () => {
    const partitioner: Partitioner<Date> = new YearMonthPartitioner();
    expect(
      partitioner.getRange(['2000-06', '2000-12', '2000-01', '2000-06'])
    ).toEqual({
      first: '2000-01',
      last: '2000-12',
    });
  });

  test('getPartition:boolean', () => {
    const partitioner: Partitioner<boolean> = new YearMonthPartitioner();
    expect(() => partitioner.getPartition(true)).toThrow();
  });

  test('getPartition:string', () => {
    const partitioner: Partitioner<string> = new YearMonthPartitioner();
    expect(partitioner.getPartition('2000-01-01T00:00:00z')).toEqual('2000-01');
  });

  test('getPartition:number', () => {
    const partitioner: Partitioner<number> = new YearMonthPartitioner();
    expect(partitioner.getPartition(946684800)).toEqual('2000-01');
  });

  test('getPartition:Date', () => {
    const partitioner: Partitioner<Date> = new YearMonthPartitioner();
    expect(partitioner.getPartition(new Date('2000-01-01T00:00:00z'))).toEqual(
      '2000-01'
    );
  });

  test('getPartition:adapter', () => {
    const partitioner: Partitioner<number> = new YearMonthPartitioner({
      adapter: (index: number) => new Date(index),
    });
    expect(partitioner.getPartition(946684800000)).toEqual('2000-01');
  });
});
