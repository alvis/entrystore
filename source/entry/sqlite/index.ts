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

import { queue } from 'async';
import { chunk, isEqual } from 'lodash';
import { basename } from 'path';
import { mapValues } from 'lodash';
import { open } from 'sqlite';
import sqlite3 from 'sqlite3';
import { promisify } from 'util';

import { MissingSchemaError } from '#error';
import {
  decodeSchema,
  encodeSchema,
  ensureSchemaAgreed,
  getSchemaFromPrototype,
  validate,
} from '#schema';
import { createLogger } from '#utilities';
import { EntryStore } from '../prototype';
import { dehydrate, hydrate } from './schema';

import type { Database } from 'sqlite';

import type { GenericEntry, Schema, TypeIdentifier } from '#types';
import type { NativeEntry } from './schema';

/** options for a CSVStore */
export interface SQLiteStoreOptions<Entry extends GenericEntry> {
  /** file path to the database file */
  filepath: string;
  /** entry prototype */
  prototype?: new (...args: any[]) => Entry;
}

/** maximum number of parameters accepted by sqlite */
const MAX_INPUT = 999;

/** a simple data store using CSV as the data format */
export class SQLiteStore<
  Entry extends GenericEntry,
  IndexKey extends Extract<keyof Entry, string> = Extract<keyof Entry, string>
> extends EntryStore<Entry, IndexKey> {
  /** absolute path of the database file */
  private filepath: string;

  /** entry prototype */
  private prototype?: new (...args: any[]) => Entry;

  /** data schema */
  private schema?: Schema<Entry, IndexKey>;

  /** a controlled queue to ensure write operations are sequential */
  private queue = queue(async (fn: () => Promise<void>) => fn(), 1);

  /**
   * create a sqlite backed entry store
   * @param options options for the store
   */
  constructor(options: SQLiteStoreOptions<Entry>) {
    super();

    const { filepath, prototype } = options;

    this.filepath = filepath;
    this.prototype = prototype;
  }

  /** list of fields in each entry */
  public get fields(): Promise<string[]> {
    return this.exec(async (db) => this.getFields(db));
  }

  /** first entry */
  public get first(): Promise<Entry | undefined> {
    return this.exec(async (db) => this.getTop(db, 'ASC'));
  }

  /** first entry key */
  public get firstKey(): Promise<Entry[IndexKey] | undefined> {
    return this.first.then((entry) => entry?.[this.schema!.index]);
  }

  /** last entry */
  public get last(): Promise<Entry | undefined> {
    return this.exec(async (db) => this.getTop(db, 'DESC'));
  }

  /** last entry key */
  public get lastKey(): Promise<Entry[IndexKey] | undefined> {
    return this.last.then((entry) => entry?.[this.schema!.index]);
  }

  /**
   * get an entry by its key
   * @param key index of the entry
   * @returns a single entry
   */
  public async get(
    key: NonNullable<Entry[IndexKey]>,
  ): Promise<Entry | undefined> {
    return this.exec(async (db) => {
      const { index, map } = await this.ensureSchema(db);

      const native = await db.get<NativeEntry<Entry>>(
        `SELECT * FROM records WHERE ${index} = $key`,
        {
          $key: hydrate(key),
        },
      );

      return (
        native &&
        (mapValues(native, (value, key) => dehydrate(map[key], value)) as Entry)
      );
    });
  }

  /**
   * submit a single entry or entries in bulk
   * @param entries array of entries
   */
  public async put(...entries: Entry[]): Promise<void> {
    if (entries.length > 0) {
      await promisify(this.queue.push.bind(this.queue))(async () =>
        this.exec(async (db) => {
          const { map } = await this.ensureSchema(db);

          // validate each entry
          entries.forEach((entry) => validate(map, entry));

          // get column names
          const fields = Object.keys(map);

          // split it into chunks
          const subsets = chunk(entries, Math.floor(MAX_INPUT / fields.length));

          for (const subset of subsets) {
            const holder = `(${new Array(fields.length).fill('?').join()})`;
            const holders = new Array<string>(subset.length).fill(holder);
            const parameters = subset
              .map((entry) => mapValues(entry, hydrate))
              .flatMap((entry) => fields.map((field) => entry[field]));

            await db.run(
              `INSERT INTO records (${fields.join()}) VALUES ${holders.join()} ON CONFLICT DO NOTHING`,
              parameters,
            );
          }
        }),
      );
    }
  }

  /**
   * create the schema table
   * @param db an active database instance
   * @param schema data schema
   */
  private async createSchemaTable(db: Database, schema: Schema): Promise<void> {
    const definitions = Object.keys(schema.map).map((key) => `${key} TEXT`);

    await db.run(`CREATE TABLE schema (${definitions.join()})`);
    await db.run(
      `INSERT INTO schema
       (${Object.keys(schema.map).join()})
       VALUES (${definitions.map((_) => '?').join()})`,
      ...Object.values(encodeSchema(schema)),
    );
  }

  /**
   * create the record table
   * @param db an active database instance
   * @param schema data schema
   */
  private async createRecordTable(db: Database, schema: Schema): Promise<void> {
    const definitions = Object.entries(schema.map).map(
      ([key, type]) =>
        `${key} ${
          ['Boolean', 'Date', 'Number'].includes(type.type) ? 'NUMERIC' : 'TEXT'
        }` + (key === schema.index ? ' PRIMARY KEY' : ''),
    );
    await db.run(`CREATE TABLE records (${definitions.join()})`);
  }

  /**
   * return the schema from the cache or database
   * @param db an active database instance
   * @returns the data schema
   */
  private async ensureSchema(db: Database): Promise<Schema<Entry, IndexKey>> {
    // set schema only if it hasn't
    this.schema ??= await this.initialise(db);

    return this.schema;
  }

  /**
   * open the database file and execute any queries in the callback function
   * @param callback a callback to be called when the file is opened
   * @returns the returns from the callback
   */
  private async exec<T>(callback: (db: Database) => Promise<T>): Promise<T> {
    let db: Database | undefined;

    const { log, warn } = createLogger(__dirname, basename(this.filepath));

    try {
      // open the database
      db = await open({
        filename: this.filepath,
        driver: sqlite3.Database,
      });

      // debug
      db.on('trace', log);

      // execute any queries
      return await callback(db);
    } catch (error) {
      warn(error);

      throw error;
    } finally {
      /* istanbul ignore next */
      // responsibly close the file
      await db?.close();
    }
  }

  /**
   * get all fields stored in the storage device
   * @param db an active database instance
   * @returns all associated fields
   */
  private async getFields(db: Database): Promise<string[]> {
    return Object.keys((await this.ensureSchema(db)).map);
  }

  /**
   * get the first or last entry of a partition
   * @param db an active database instance
   * @param order order of sorting
   * @returns the first entry
   */
  private async getTop(
    db: Database,
    order: 'ASC' | 'DESC',
  ): Promise<Entry | undefined> {
    const { index, map } = await this.ensureSchema(db);

    const native = await db.get<NativeEntry<Entry>>(
      `SELECT * from records ORDER BY ${index} ${order} LIMIT 1`,
    );

    return (
      native &&
      (mapValues(native, (value, key) => dehydrate(map[key], value)) as Entry)
    );
  }

  /**
   * get schema of the data stored
   * @param db an active database instance
   * @returns data schema
   */
  private async getSchema(db: Database): Promise<Schema | undefined> {
    try {
      const encoded = await db.get<Record<string, TypeIdentifier>>(
        'SELECT * FROM schema',
      );

      /* ----- section ----- */

      if (encoded) {
        const compatiable = mapValues(encoded, (value) =>
          value.includes('!') ? `*${value.replace('!', '')}` : value,
        ) as typeof encoded;

        const schema = decodeSchema(compatiable);
        if (!isEqual(compatiable, encoded)) {
          const definitions = Object.keys(schema.map).map(
            (key) => `${key} TEXT`,
          );

          await db.run(`DELETE FROM schema`);

          await db.run(
            `INSERT INTO schema
          (${Object.keys(schema.map).join()})
          VALUES (${definitions.map((_) => '?').join()})`,
            ...Object.values(encodeSchema(schema)),
          );
        }

        return schema;
      }
      // ---------------------------------------- //

      return undefined;
      // return encoded && decodeSchema(encoded);
    } catch {
      // if the table doesn't exist
      return undefined;
    }
  }

  /**
   * initialise the database
   * @param db an active database instance
   * @returns data schema
   */
  private async initialise(db: Database): Promise<Schema<Entry, IndexKey>> {
    // check if the stored schema agrees with the supplied prototype
    const storedSchema = await this.getSchema(db);
    const providedSchema =
      this.prototype && getSchemaFromPrototype<Entry, IndexKey>(this.prototype);

    if (!storedSchema && providedSchema) {
      // create the tables for first time initialisation
      await Promise.all([
        this.createSchemaTable(db, providedSchema),
        this.createRecordTable(db, providedSchema),
      ]);

      return providedSchema;
    }

    ensureSchemaAgreed(providedSchema, storedSchema);

    const schema = providedSchema ?? storedSchema;

    if (!schema) {
      throw new MissingSchemaError();
    }

    return schema;
  }
}
