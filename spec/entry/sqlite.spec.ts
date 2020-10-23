/*
 *                            *** MIT LICENSE ***
 * -------------------------------------------------------------------------
 * This code may be modified and distributed under the MIT license.
 * See the LICENSE file for details.
 * -------------------------------------------------------------------------
 *
 * @summary   Tests on a CSVStore
 *
 * @author    Alvis HT Tang <alvis@hilbert.space>
 * @license   MIT
 * @copyright Copyright (c) 2020 - All Rights Reserved.
 * -------------------------------------------------------------------------
 */

import { resolve } from 'path';
import { Database } from 'sqlite3';
import { dirSync } from 'tmp';
import { URL } from 'url';
import { promisify } from 'util';

import { SQLiteStore } from '#entry';
import { dehydrate, hydrate } from '#entry/sqlite/schema';
import {
  MissingSchemaError,
  SchemaMismatchedError,
  UnsupportedTypeError,
  ValidationError,
} from '#error';
import { GenericEntry } from '#types';
import { jan1, jan2, jan3, Entry, AnotherEntry } from './examples';

// create a temporary folder containing all the testing files
const tmp = dirSync({ unsafeCleanup: true }).name;

function getStore<Entry extends GenericEntry>(options: {
  identifier: string;
  prototype?: new (...args: any[]) => Entry;
}): { store: SQLiteStore<Entry>; db: Database } {
  const { identifier, prototype } = options;

  const filepath = resolve(tmp, `${identifier}.db`);

  return {
    store: new SQLiteStore<Entry>({
      filepath,
      prototype,
    }),
    db: new Database(filepath),
  };
}

describe('cl:SQLiteStore', () => {
  describe('schema', () => {
    it('hydrates supported data into the natively supported form', async () => {
      expect(hydrate(false)).toEqual(0);
      expect(hydrate(true)).toEqual(1);
      expect(hydrate(0)).toEqual(0);
      expect(hydrate('string')).toEqual('string');
      expect(hydrate(new Date(0))).toEqual(0);
      expect(hydrate(new URL('https://link/'))).toEqual('https://link/');

      expect(
        // @ts-expect-error
        () => hydrate({ nested: { message: 'unsupported' } }),
      ).toThrow(UnsupportedTypeError);
    });

    it('dehydrates a content stored in the native form back to its original form', async () => {
      expect(dehydrate('Boolean', 0)).toEqual(false);
      expect(dehydrate('Boolean', 1)).toEqual(true);
      expect(dehydrate('Number', 0)).toEqual(0);
      expect(dehydrate('String', 'string')).toEqual('string');
      expect(dehydrate('Date', 0)).toEqual(new Date(0));
      expect(dehydrate('URL', 'https://link/')).toEqual(
        new URL('https://link/'),
      );

      expect(
        // @ts-expect-error
        () => hydrate({ nested: { message: 'unsupported' } }),
      ).toThrow(UnsupportedTypeError);
    });
  });

  describe('empty store', () => {
    const { store } = getStore({ identifier: 'empty', prototype: Entry });

    it('can return declared fields from the prototype', async () =>
      expect(await store.fields).toEqual(['timestamp', 'value']));

    it('returns undefined for any queries', async () => {
      expect(await store.first).toEqual(undefined);
      expect(await store.last).toEqual(undefined);
      expect(await store.firstKey).toEqual(undefined);
      expect(await store.lastKey).toEqual(undefined);
      expect(await store.get(new Date('2000-01-01T00:00:00z'))).toEqual(
        undefined,
      );
    });
  });

  describe('empty schema', () => {
    // NOTE there is no prototype provided
    const { store } = getStore({ identifier: 'schema' });

    it('throws an error if there is no schema provided at all', async () => {
      await expect(store.fields).rejects.toThrow(MissingSchemaError);
      await expect(store.first).rejects.toThrow(MissingSchemaError);
      await expect(store.firstKey).rejects.toThrow(MissingSchemaError);
      await expect(store.last).rejects.toThrow(MissingSchemaError);
      await expect(store.lastKey).rejects.toThrow(MissingSchemaError);
      await expect(store.get('key')).rejects.toThrow(MissingSchemaError);
      await expect(store.put({})).rejects.toThrow(MissingSchemaError);
    });
  });

  describe('write operations', () => {
    it('creates the schema table at initialisation', async () => {
      const { store, db } = getStore({
        identifier: 'write',
        prototype: Entry,
      });
      await expect(store.put(jan1)).resolves.toEqual(undefined);
      const get = promisify<any, any>(db.get.bind(db));

      const { sql: schemaTableSQL } = await get(
        "SELECT sql FROM sqlite_master WHERE name = 'schema'",
      );
      expect(schemaTableSQL).toEqual(
        'CREATE TABLE schema (timestamp TEXT,value TEXT)',
      );

      const { sql: recordTableSQL } = await get(
        "SELECT sql FROM sqlite_master WHERE name = 'records'",
      );
      expect(recordTableSQL).toEqual(
        'CREATE TABLE records (timestamp NUMERIC PRIMARY KEY,value TEXT)',
      );

      expect(await get('SELECT * FROM schema')).toEqual({
        timestamp: '*Date',
        value: 'String',
      });
    });

    it('can write without any entry', async () => {
      const { store } = getStore({ identifier: 'write', prototype: Entry });
      await expect(store.put()).resolves.toEqual(undefined);
    });

    it('can write a single entry', async () => {
      const { store } = getStore({ identifier: 'write', prototype: Entry });
      await expect(store.put(jan1)).resolves.toEqual(undefined);
    });

    it('can write multiple entries', async () => {
      const { store } = getStore({ identifier: 'write', prototype: Entry });
      await expect(store.put(jan2, jan3)).resolves.toEqual(undefined);
    });

    it('can write multiple entries in batches', async () => {
      const { store } = getStore({ identifier: 'write', prototype: Entry });

      const entries: Entry[] = new Array(65535).fill(undefined).map(
        (_, key): Entry => ({
          timestamp: new Date(key),
          value: new Date(key).toISOString(),
        }),
      );
      await expect(store.put(...entries)).resolves.toEqual(undefined);
    });

    it('can perform multiple writes at the same time', async () => {
      const { store } = getStore({ identifier: 'multi', prototype: Entry });

      const write1 = store.put(jan1);
      const write2 = store.put(jan2);
      const write3 = store.put(jan3);
      await expect(Promise.all([write1, write2, write3])).resolves.toEqual([
        undefined,
        undefined,
        undefined,
      ]);
    });

    it('can read the entry just wrote to the store', async () => {
      const { store } = getStore({
        identifier: 'write-read',
        prototype: Entry,
      });

      await store.put(jan1);
      expect(await store.get(new Date('2000-01-01T00:00:00z'))).toEqual(jan1);
    });

    it('throws an error when trying to put in data that is different from the schema', async () => {
      const { store } = getStore({ identifier: 'reject', prototype: Entry });

      await expect(
        // @ts-expect-error
        store.put({ timestamp: '2000-01-01T00:00:00z', value: '2000-01-01' }),
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('read operations', () => {
    const { store } = getStore({ identifier: 'read', prototype: Entry });

    beforeAll(async () => {
      await store.put(jan1, jan2, jan3);
    });

    it('can reconstruct the schema from an existing database', async () => {
      // NOTE there is no prototype provided, so it should be read from the database
      const { store: another } = getStore({ identifier: 'read' });

      expect(await another.get(jan1.timestamp)).toEqual(jan1);
    });

    it('throws an error if the provided prototype does not match the one embedded in the database', async () => {
      const { store: another } = getStore({
        identifier: 'read',
        prototype: AnotherEntry,
      });

      await expect(another.fields).rejects.toThrow(SchemaMismatchedError);
    });

    it('can get the entry by the key', async () => {
      expect(await store.get(jan1.timestamp)).toEqual(jan1);
    });

    it('can faithfully return the fields declared in the schema', async () =>
      expect(await store.fields).toEqual(['timestamp', 'value']));

    it('can return the first & last keys', async () => {
      expect(await store.firstKey).toEqual(jan1.timestamp);
      expect(await store.lastKey).toEqual(jan3.timestamp);
    });

    it('can read the first & last entries', async () => {
      expect(await store.first).toEqual(jan1);
      expect(await store.last).toEqual(jan3);
    });

    it('can read entry by the key', async () => {
      expect(await store.get(jan1.timestamp)).toEqual(jan1);
    });
  });
});
