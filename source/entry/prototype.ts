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

/** prototype for a simple entry store */
export abstract class EntryStore<
  Entry extends GenericEntry,
  IndexKey extends Extract<keyof Entry, string> = Extract<keyof Entry, string>
> {
  /** list of fields in each entry */
  public abstract get fields(): Promise<string[]>;

  /** first entry */
  public abstract get first(): Promise<Entry | undefined>;

  /** first entry key */
  public abstract get firstKey(): Promise<Entry[IndexKey] | undefined>;

  /** last entry */
  public abstract get last(): Promise<Entry | undefined>;

  /** last entry key */
  public abstract get lastKey(): Promise<Entry[IndexKey] | undefined>;

  /**
   * get an entry by its key
   * @param key index of the entry
   * @returns a single entry
   */
  public abstract get(key: Entry[IndexKey]): Promise<Entry | undefined>;

  /**
   * submit a single entry or entries in bulk
   * @param entries array of entries
   */
  public abstract put(...entries: Entry[]): Promise<void>;
}
