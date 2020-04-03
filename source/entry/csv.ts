/*
 *                            *** MIT LICENSE ***
 * -------------------------------------------------------------------------
 * This code may be modified and distributed under the MIT license.
 * See the LICENSE file for details.
 * -------------------------------------------------------------------------
 *
 * @summary   A simple data store using CSV as the data format
 *
 * @author    Alvis HT Tang <alvis@hilbert.space>
 * @license   MIT
 * @copyright Copyright (c) 2020 - All Rights Reserved.
 * -------------------------------------------------------------------------
 */

import { cargo } from 'async';
import parse from 'csv-parse';
import stringify from 'csv-stringify';
import { mapValues } from 'lodash';
import { basename, dirname, extname, relative } from 'path';
import { promisify } from 'util';

import { EntryStore } from './prototype';

import { AsyncCargo } from 'async';
import { O } from 'ts-toolbelt';

import { Partitioner } from '#partitioner';
import { StorageAdapter } from '#storage';
import { GenericEntry, SupportedDataType } from '#types';
import { EntryStoreOptions } from './prototype';

/** entry structure stored in CSV format */
type CSVEntry<Entry extends GenericEntry> = Record<keyof Entry, string>;

/** options for a CSVStore */

export interface CSVStoreOptions<
  Entry extends GenericEntry,
  IndexKey extends keyof Entry
> extends EntryStoreOptions<Entry, IndexKey> {
  destination: StorageAdapter;
  partitioner: Partitioner<Entry[IndexKey]>;
  transformer: O.Filter<
    {
      read: Entry extends CSVEntry<Entry>
        ? undefined
        : O.Filter<
            {
              [K in keyof Entry]: Entry[K] extends string
                ? undefined
                : (value: string) => Entry[K];
            },
            undefined
          >;
      write?: Entry extends CSVEntry<Entry>
        ? undefined
        : Partial<
            O.Filter<
              {
                [K in keyof Entry]: Entry[K] extends string
                  ? undefined
                  : (value: Entry[K]) => string;
              },
              undefined
            >
          >;
    },
    undefined
  >;
}

/** a simple data store using CSV as the data format */
export class CSVStore<
  Entry extends GenericEntry,
  IndexKey extends keyof Entry
> extends EntryStore<Entry, IndexKey> {
  private store: StorageAdapter;
  private partitioner: Partitioner<Entry[IndexKey]>;
  private transformer: {
    read: {
      [K in keyof Entry]?: (value: string) => Entry[K];
    };
    write: {
      [K in keyof Entry]?: (value: Entry[K]) => string;
    };
  };

  /** range of populated partitions */
  private get partitionRange(): Promise<
    ReturnType<Partitioner<Entry[IndexKey]>['getRange']>
  > {
    return (async () => {
      const paths = await this.store.collection('csv');

      return this.partitioner.getRange(
        paths.map((path) =>
          relative(dirname(path), basename(path, extname(path)))
        )
      );
    })();
  }

  constructor(options: CSVStoreOptions<Entry, IndexKey>) {
    const { indexKey, destination, partitioner, transformer } = options;

    super({ indexKey });

    this.store = destination;
    this.partitioner = partitioner;
    this.transformer = { read: {}, write: {}, ...transformer };
  }

  /** list of fields in each entry */
  public get fields(): Promise<string[] | undefined> {
    return (async () => {
      const range = await this.partitionRange;
      if (!range) {
        return;
      }

      const lines = await this.store.head(`${range.first}.csv`, 2);

      const csvEntries = await this.dehydrateCSV(lines);

      const firstEntry = this.dehydrateEntry(csvEntries[0]);
      const fields = Object.keys(firstEntry);

      return fields;
    })();
  }

  /** first entry key */
  public get firstKey(): Promise<Entry[IndexKey] | undefined> {
    return (async () => {
      const range = await this.partitionRange;
      if (!range) {
        return;
      }

      const lines = await this.store.head(`${range.first}.csv`, 2);

      const csvEntries = await this.dehydrateCSV(lines);

      const firstEntry = this.dehydrateEntry(csvEntries[0]);
      const key = firstEntry[this.indexKey];

      return key;
    })();
  }

  /** last entry key */
  public get lastKey(): Promise<Entry[IndexKey] | undefined> {
    return (async () => {
      const range = await this.partitionRange;
      if (!range) {
        return;
      }

      const firstLine = await this.store.head(`${range.last}.csv`, 1);
      const lastLine = await this.store.tail(`${range.last}.csv`, 1);

      const csvEntries = await this.dehydrateCSV(`${firstLine}\n${lastLine}`);

      const lastEntry = this.dehydrateEntry(csvEntries[csvEntries.length - 1]);
      const key = lastEntry[this.indexKey];

      return key;
    })();
  }

  /**
   * get an entry by its key
   * @param key index of the entry
   * @returns a single entry
   */
  public async get(key: Entry[IndexKey]): Promise<Entry | undefined> {
    const keyTransformer = this.transformer.write[this.indexKey] ?? this.encode;
    const encodedKey = keyTransformer(key);
    const partition = this.partitioner.getPartition(key);
    const csvEntries = await this.getCSVEntries(partition);

    const result = csvEntries.find(
      (entry) => entry[this.indexKey] === encodedKey
    );

    return result ? this.dehydrateEntry(result) : undefined;
  }

  /**
   * submit a single entry or entries in bulk
   * @param entries array of entries
   */
  public async put(...entries: Entry[]): Promise<void> {
    const writerSet: Record<string, AsyncCargo> = {};

    for (const entry of entries) {
      const partition = this.partitioner.getPartition(entry[this.indexKey]);

      // ensure the writer for the partition exists
      if (!Object.keys(writerSet).includes(partition)) {
        writerSet[partition] = cargo((async (
          subEntries: Array<CSVEntry<Entry>>
        ) => {
          const headerNeeded = !(await this.store.exists(`${partition}.csv`));

          // prepare the content
          const content = await promisify(
            stringify as (
              input: any[],
              options: stringify.Options,
              callback:
                | ((err: Error) => void)
                | ((err: null, content: string) => void)
            ) => stringify.Stringifier
          )(subEntries, {
            header: headerNeeded,
          });

          await this.store.append(`${partition}.csv`, content);
        }) as any);
      }

      // queue the entry for writing to the file
      writerSet[partition].push(this.hydrateEntry(entry));
    }

    await Promise.all(
      Object.values(writerSet).map(async (writer) => writer.drain())
    );
  }

  /**
   * parse a CSV file
   * @param content content of the CSV file
   * @returns entries stored in the CSV file
   */
  private async dehydrateCSV(
    content: string | Buffer
  ): Promise<Array<CSVEntry<Entry>>> {
    const csvEntries = await promisify(
      parse as (
        input: Buffer | string,
        options: parse.Options,
        callback: ((err: Error) => void) | ((err: null, content: any[]) => void)
      ) => parse.Parser
    )(content.toString(), {
      cast: false,
      columns: true,
    });

    return csvEntries;
  }

  /**
   * parse a csv entry to its original format
   * @param entry an stringified entry
   * @returns an entry in its original
   */
  private dehydrateEntry(entry: CSVEntry<Entry>): Entry {
    return mapValues(entry, (value, key) => {
      const transformer =
        this.transformer.read[key] ?? ((value: string): string => value);

      return transformer(value);
    }) as Entry;
  }

  /**
   * stringify content
   * @param value content to be stringified
   * @returns stringified content
   */
  private encode(value: SupportedDataType): string {
    return value instanceof Date
      ? (value.getTime() / 1000).toString()
      : value.toString();
  }

  /**
   * get all encoded entries from a partition
   * @param partition reference of the partition
   * @returns all entries stored in the partition
   */
  private async getCSVEntries(
    partition: string
  ): Promise<Array<CSVEntry<Entry>>> {
    if (!(await this.store.exists(`${partition}.csv`))) {
      return [];
    }

    const file = await this.store.read(`${partition}.csv`);
    const csvEntries = await this.dehydrateCSV(file);

    return csvEntries;
  }

  /**
   * stringify an entry to csv format
   * @param entry the actual entry
   * @returns an entry in csv format
   */
  private hydrateEntry(entry: Entry): CSVEntry<Entry> {
    return mapValues(entry, (value, key: keyof Entry): string => {
      const transformer = this.transformer.write[key] ?? this.encode;

      return transformer(value);
    });
  }
}
