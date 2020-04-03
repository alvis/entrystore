/*
 *                            *** MIT LICENSE ***
 * -------------------------------------------------------------------------
 * This code may be modified and distributed under the MIT license.
 * See the LICENSE file for details.
 * -------------------------------------------------------------------------
 *
 * @summary   Prototype of a simple data store interface
 *
 * @author    Alvis HT Tang <alvis@hilbert.space>
 * @license   MIT
 * @copyright Copyright (c) 2020 - All Rights Reserved.
 * -------------------------------------------------------------------------
 */

/* istanbul ignore file */

import { GenericEntry } from '#types';

/** options for a simple entry store */
export interface EntryStoreOptions<
  Entry extends GenericEntry,
  IndexKey extends keyof Entry
> {
  /** index key of an entry */
  indexKey: IndexKey;
}

const IndexKey = Symbol('IndexKey');

/** prototype for a simple entry store */
export abstract class EntryStore<
  Entry extends GenericEntry,
  IndexKey extends keyof Entry
> {
  /** index key of an entry */
  private [IndexKey]: IndexKey;

  constructor(options: EntryStoreOptions<Entry, IndexKey>) {
    const { indexKey } = { ...options };

    this[IndexKey] = indexKey;
  }

  /** the index key of each entry */
  public get indexKey(): IndexKey {
    return this[IndexKey];
  }

  /** list of fields in each entry */
  public abstract get fields(): Promise<string[] | undefined>;

  /** first entry key */
  public abstract get firstKey(): Promise<Entry[IndexKey] | undefined>;

  /** last entry key */
  public abstract get lastKey(): Promise<Entry[IndexKey] | undefined>;

  /**
   * get an entry by its key
   * @param key index of the entry
   * @returns a single entry
   */
  public abstract async get(key: Entry[IndexKey]): Promise<Entry | undefined>;

  /**
   * submit a single entry or entries in bulk
   * @param entries array of entries
   */
  public abstract async put(...entries: Entry[]): Promise<void>;
}
