/*
 *                            *** MIT LICENSE ***
 * -------------------------------------------------------------------------
 * This code may be modified and distributed under the MIT license.
 * See the LICENSE file for details.
 * -------------------------------------------------------------------------
 *
 * @summary   Example entries
 *
 * @author    Alvis HT Tang <alvis@hilbert.space>
 * @license   MIT
 * @copyright Copyright (c) 2020 - All Rights Reserved.
 * -------------------------------------------------------------------------
 */

import { ENTRY, FIELD } from '#schema';
import { GenericEntry } from '#types';

@ENTRY({ key: 'timestamp' })
export class Entry extends GenericEntry {
  /** index key */
  @FIELD({ type: Date })
  public timestamp!: Date;
  /** value of the entry */
  @FIELD()
  public value!: string;
}

@ENTRY({ key: 'timestamp' })
export class AnotherEntry extends Entry {
  /** index key */
  @FIELD({ type: Date })
  public timestamp!: Date;
  /** value of the entry */
  @FIELD()
  public value!: string;
  @FIELD()
  public additional!: string;
}

export const jan1: Entry = {
  timestamp: new Date('2000-01-01T00:00:00z'),
  value: '2000-01-01',
};

export const jan2: Entry = {
  timestamp: new Date('2000-01-02T00:00:00z'),
  value: '2000-01-02',
};

export const jan3: Entry = {
  timestamp: new Date('2000-01-03T00:00:00z'),
  value: '2000-01-03',
};

export const feb1: Entry = {
  timestamp: new Date('2000-02-01T00:00:00z'),
  value: '2000-02-01',
};

export const feb2: Entry = {
  timestamp: new Date('2000-02-02T00:00:00z'),
  value: '2000-02-02',
};
