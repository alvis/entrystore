/*
 *                            *** MIT LICENSE ***
 * -------------------------------------------------------------------------
 * This code may be modified and distributed under the MIT license.
 * See the LICENSE file for details.
 * -------------------------------------------------------------------------
 *
 * @summary   Tests on EntryStore
 *
 * @author    Alvis HT Tang <alvis@hilbert.space>
 * @license   MIT
 * @copyright Copyright (c) 2020 - All Rights Reserved.
 * -------------------------------------------------------------------------
 */

import { EntryStore } from './prototype';

type Entry = {
  key: string;
};

class SimpleEntryStore extends EntryStore<Entry, 'key'> {
  constructor() {
    super({ indexKey: 'key' });
  }

  /** list of fields in each entry */
  public get fields(): Promise<undefined> {
    return Promise.resolve(undefined);
  }

  /** first entry key */
  public get firstKey(): Promise<undefined> {
    return Promise.resolve(undefined);
  }

  /** last entry key */
  public get lastKey(): Promise<undefined> {
    return Promise.resolve(undefined);
  }

  /**
   * get an entry by its key
   * @returns a single entry
   */
  public async get(): Promise<undefined> {
    return Promise.resolve(undefined);
  }

  /**
   * submit a single entry or entries in bulk
   */
  public async put(): Promise<void> {
    // do nothing
  }
}

describe('EntryStore', () => {
  const store = new SimpleEntryStore();

  test('indexKey', () => {
    expect(store.indexKey).toEqual('key');
  });
});
