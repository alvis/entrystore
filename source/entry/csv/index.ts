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
import csvWithCallback from 'csv-stringify';
import { mapValues, uniqBy } from 'lodash';
import { basename, dirname, extname, relative } from 'path';
import { promisify } from 'util';

import { MissingSchemaError } from '#error';
import {
  decodeSchema,
  encodeSchema,
  ensureSchemaAgreed,
  getSchemaFromPrototype,
  validate,
} from '#schema';
import { EntryStore } from '../prototype';
import { dehydrate, hydrate } from './schema';

import type { QueueObject } from 'async';

import type { Partitioner } from '#partitioner';
import type { StorageAdapter } from '#storage';
import type {
  GenericEntry,
  Schema,
  SupportedKey,
  TypeIdentifier,
} from '#types';

/** supported data type in csv */
type NavivelySupportedDataType = string;

/** entry structure stored in CSV format */
type NativeEntry<Entry extends GenericEntry> = Record<
  keyof Entry,
  NavivelySupportedDataType
>;

const csv = promisify(
  csvWithCallback as (
    input: any[],
    options: csvWithCallback.Options,
    callback: ((err: Error) => void) | ((err: null, content: string) => void),
  ) => csvWithCallback.Stringifier,
);

const SCHEMA_FILE = 'schema.json';

/** a simple data store using CSV as the data format */
export class CSVStore<
  Entry extends GenericEntry,
  IndexKey extends Extract<keyof Entry, string> = Extract<keyof Entry, string>
> extends EntryStore<Entry, IndexKey> {
  /** data chunk partitioner */
  private partitioner: Partitioner<Extract<Entry[IndexKey], SupportedKey>>;

  /** unified storage API */
  private store: StorageAdapter;

  /** entry prototype */
  private prototype?: new (...args: any[]) => Entry;

  /** data schema */
  private schema?: Schema<Entry, IndexKey>;

  /** range of populated partitions */
  private get partitionRange(): Promise<
    ReturnType<Partitioner<Extract<Entry[IndexKey], SupportedKey>>['getRange']>
  > {
    return (async () => {
      const paths = await this.store.collection('csv');

      return this.partitioner.getRange(
        paths.map((path) =>
          relative(dirname(path), basename(path, extname(path))),
        ),
      );
    })();
  }

  /**
   * create a csv store
   * @param options options for the store
   * @param options.destination an unified storage controller
   * @param options.partitioner data chunk partitioner
   * @param options.prototype entry prototype
   */
  constructor(options: {
    destination: StorageAdapter;
    partitioner: Partitioner<Extract<Entry[IndexKey], SupportedKey>>;
    prototype?: new (...args: any[]) => Entry;
  }) {
    const { destination, partitioner, prototype } = options;

    super();

    this.store = destination;
    this.partitioner = partitioner;
    this.prototype = prototype;
  }

  /** list of fields in each entry */
  public get fields(): Promise<string[]> {
    return this.getFields();
  }

  /** first entry */
  public get first(): Promise<Entry | undefined> {
    return this.getFirst();
  }

  /** first entry key */
  public get firstKey(): Promise<Entry[IndexKey] | undefined> {
    const index = this.schema?.index;

    return this.first.then((entry) => index && entry?.[index]);
  }

  /** last entry */
  public get last(): Promise<Entry | undefined> {
    return this.getLast();
  }

  /** last entry key */
  public get lastKey(): Promise<Entry[IndexKey] | undefined> {
    const index = this.schema?.index;

    return this.last.then((entry) => index && entry?.[index]);
  }

  /**
   * get an entry by its key
   * @param key index of the entry
   * @returns a single entry
   */
  public async get(
    key: Extract<Entry[IndexKey], SupportedKey>,
  ): Promise<Entry | undefined> {
    const { index, map } = await this.ensureSchema();

    const encodedKey = hydrate(key);
    const partition = this.partitioner.getPartition(key);
    const csvEntries = await this.getCSVEntries(partition);

    const native = csvEntries.find((entry) => entry[index] === encodedKey);

    return native && dehydrateNative(map, native);
  }

  /**
   * submit a single entry or entries in bulk
   * @param entries array of entries
   */
  public async put(...entries: Entry[]): Promise<void> {
    const { index, map } = await this.ensureSchema();

    // validate each entry
    entries.forEach((entry) => validate(map, entry));

    const writerSet: Record<string, QueueObject<Entry>> = {};

    for (const entry of entries.sort(byKey(index))) {
      const partition = this.partitioner.getPartition(
        entry[index] as Extract<Entry[IndexKey], SupportedKey>,
      );

      // ensure the writer for the partition exists
      if (!Object.keys(writerSet).includes(partition)) {
        writerSet[partition] = this.createWriter(partition);
      }

      // queue the entry for writing to the file
      void writerSet[partition].push(entry);
    }

    await Promise.all(
      Object.values(writerSet).map(async (writer) => writer.drain()),
    );
  }

  /**
   * create a CSV writer for a partition
   * @param partition reference of the partition to which data will be written
   * @returns a CSV writer
   */
  private createWriter(partition: string): QueueObject<Entry> {
    return cargo(async (subEntries: Entry[]) => {
      const { index, map } = await this.ensureSchema();

      // validate each entry
      subEntries.forEach((entry) => validate(map, entry));

      const partitionExists = await this.store.exists(`${partition}.csv`);

      // get the first and last index key in the target partition
      const first = partitionExists
        ? await this.getFirst(partition)
        : undefined;
      const last = partitionExists ? await this.getLast(partition) : undefined;

      // sort the input
      const sortedEntries = subEntries.sort(byKey(index));

      // save the effort to overwrite the whole partition if all data is after the last entry
      const mode =
        first && last && sortedEntries[0][index] > last[index]
          ? 'append'
          : 'write';

      const entriesToWrite =
        mode === 'append'
          ? sortedEntries
          : await this.mixPartitionWith(partition, sortedEntries);

      // prepare the content
      const content = await csv(
        entriesToWrite.map((entry) => mapValues(entry, hydrate)),
        { header: mode === 'write' },
      );

      await this.store[mode](`${partition}.csv`, content);
    });
  }

  /**
   * parse a CSV file
   * @param content content of the CSV file
   * @returns entries stored in the CSV file
   */
  private async dehydrateCSV(
    content: string | Buffer,
  ): Promise<Array<NativeEntry<Entry>>> {
    return promisify(
      parse as (
        input: Buffer | string,
        options: parse.Options,
        callback:
          | ((err: Error) => void)
          | ((err: null, content: Array<NativeEntry<Entry>>) => void),
      ) => parse.Parser,
    )(content.toString(), {
      cast: false,
      columns: true,
    });
  }

  /**
   * return the schema from the cache or the schema file
   * @returns the data schema
   */
  private async ensureSchema(): Promise<Schema<Entry, IndexKey>> {
    // set schema only if it hasn't
    this.schema ??= await this.initialise();

    return this.schema;
  }

  /**
   * get all encoded entries from a partition
   * @param partition reference of the partition
   * @returns all entries stored in the partition
   */
  private async getCSVEntries(
    partition: string,
  ): Promise<Array<NativeEntry<Entry>>> {
    return (await this.store.exists(`${partition}.csv`))
      ? this.dehydrateCSV(await this.store.read(`${partition}.csv`))
      : [];
  }

  /**
   * get all fields stored in the storage device
   * @returns all associated fields
   */
  private async getFields(): Promise<string[]> {
    return Object.keys((await this.ensureSchema()).map);
  }

  /**
   * get the first entry of a partition
   * @param partition reference of the partition
   * @returns the first entry
   */
  private async getFirst(partition?: string): Promise<Entry | undefined> {
    const { map } = await this.ensureSchema();

    const target = partition ?? (await this.partitionRange)?.first;
    if (!target) {
      return undefined;
    }

    const HEADER_AND_FIRST_LINE = 2;
    const lines = await this.store.head(`${target}.csv`, HEADER_AND_FIRST_LINE);

    const [native] = await this.dehydrateCSV(lines);

    return dehydrateNative(map, native);
  }

  /**
   * get the last entry of a partition
   * @param partition reference of the partition
   * @returns the last entry
   */
  private async getLast(partition?: string): Promise<Entry | undefined> {
    const { map } = await this.ensureSchema();

    const target = partition ?? (await this.partitionRange)?.last;
    if (!target) {
      return undefined;
    }

    const firstLine = await this.store.head(`${target}.csv`, 1);
    const lastLine = await this.store.tail(`${target}.csv`, 1);

    const [native] = await this.dehydrateCSV(`${firstLine}${lastLine}`);

    return dehydrateNative(map, native);
  }

  /**
   * get schema of the data stored
   * @returns data schema
   */
  private async getSchema(): Promise<Schema | undefined> {
    try {
      const encoded = JSON.parse(
        (await this.store.read(SCHEMA_FILE)).toString(),
      ) as Record<string, TypeIdentifier> | undefined;

      return encoded && decodeSchema(encoded);
    } catch {
      // if schema.json doesn't exist
      return undefined;
    }
  }

  /**
   * initialise the data store
   * @returns data schema
   */
  private async initialise(): Promise<Schema<Entry, IndexKey>> {
    // check if the stored schema agrees with the supplied prototype
    const storedSchema = await this.getSchema();
    const providedSchema =
      this.prototype && getSchemaFromPrototype<Entry, IndexKey>(this.prototype);

    if (!storedSchema && providedSchema) {
      // create the schema file for first time initialisation
      await this.store.write(
        SCHEMA_FILE,
        JSON.stringify(encodeSchema(providedSchema)),
      );

      return providedSchema;
    }

    ensureSchemaAgreed(providedSchema, storedSchema);

    const schema = providedSchema ?? storedSchema;

    if (!schema) {
      throw new MissingSchemaError();
    }

    return schema;
  }

  /**
   * build a partition with additional entries
   * @param partition reference of the partition
   * @param entries array of entries
   * @returns sorted and unique entries for the partition
   */
  private async mixPartitionWith(
    partition: string,
    entries: Entry[],
  ): Promise<Entry[]> {
    const { index, map } = await this.ensureSchema();

    const existingCSVEntries = await this.getCSVEntries(partition);
    const existingEntries = existingCSVEntries.map((native) =>
      dehydrateNative(map, native),
    );

    const uniqueEntries = uniqBy(
      [...entries, ...existingEntries],
      (entry) => entry[index],
    );

    return uniqueEntries.sort(byKey(index));
  }
}

/**
 * sort the entry by the index key
 * @param key the entry index key
 * @returns a sort function
 */
function byKey<T extends GenericEntry, K extends keyof T>(
  key: K,
): (a: T, b: T) => number {
  return (a: T, b: T) => {
    const keyA = a[key] as SupportedKey;
    const keyB = b[key] as SupportedKey;

    return keyA > keyB ? 1 : -1;
  };
}

/**
 * dehydrate a native entry according to the type map
 * @param map type map
 * @param native a hydrated entry
 * @returns the hydrated entry in its original form
 */
function dehydrateNative<Entry extends GenericEntry>(
  map: Schema<Entry, Extract<keyof Entry, string>>['map'],
  native: Record<keyof Entry, string>,
): Entry {
  return mapValues(native, (value, key) => dehydrate(map[key], value)) as Entry;
}
