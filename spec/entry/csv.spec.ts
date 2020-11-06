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

import { writeFile, readdir, readFile, ensureDir } from 'fs-extra';
import { resolve } from 'path';
import { dirSync } from 'tmp';
import { URL } from 'url';

import { CSVStore } from '#entry';
import { dehydrate, hydrate } from '#entry/csv/schema';
import {
  MissingSchemaError,
  SchemaMismatchedError,
  ValidationError,
} from '#error';
import { YearMonthPartitioner } from '#partitioner';
import { encodeSchema, getSchemaFromPrototype } from '#schema';
import { LocalStorage } from '#storage';
import { jan1, jan2, jan3, feb1, feb2, Entry, AnotherEntry } from './examples';
import { meta, testSchema } from './schema';

import type { GenericEntry, SupportedKey } from '#types';

// create a temporary folder containing all the testing files
const tmp = dirSync({ unsafeCleanup: true }).name;

/**
 * initialise a temporary folder and create a csv store for testing
 * @param options options to CSVStore
 * @returns environment information
 */
function getStore<E extends GenericEntry>(options: {
  identifier: string;
  prototype?: new (...args: any[]) => E;
}): { store: CSVStore<E> } {
  const { identifier, prototype } = options;

  // create a CSV store with a local device as the storage backend
  const store = new CSVStore<E>({
    // where the data will be stored
    destination: new LocalStorage({ root: resolve(tmp, identifier) }),
    // partition files into YYYY-MM format
    partitioner: new YearMonthPartitioner<
      Extract<E[Extract<keyof E, string>], SupportedKey>
    >({
      adapter: (index): Date => index as Date,
    }),
    prototype,
  });

  return { store };
}

describe('cl:CSVStore', () => {
  testSchema(hydrate, dehydrate, [
    { meta: meta('Boolean'), original: false, hydrated: '0' },
    { meta: meta('Boolean'), original: true, hydrated: '1' },
    { meta: meta('Number'), original: 0, hydrated: '0' },
    { meta: meta('String'), original: 'string', hydrated: 'string' },
    { meta: meta('Date'), original: new Date(0), hydrated: '0' },
    {
      meta: meta('URL'),
      original: new URL('https://link/'),
      hydrated: 'https://link/',
    },
    {
      meta: meta('URL', { isList: true }),
      original: [new URL('https://link1/'), new URL('https://link2/')],
      hydrated: '["https://link1/","https://link2/"]',
    },
    {
      meta: meta('Embedded'),
      original: { string: 'string' },
      hydrated: '{"string":"string"}',
    },
  ]);

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
    it('can write data as individual chunks', async () => {
      const identifier = 'write';
      const { store } = getStore({ identifier, prototype: Entry });

      /* ----- single entry ----- */

      await store.put(jan1);

      expect(
        (await readFile(resolve(tmp, identifier, '2000-01.csv'))).toString(),
      ).toEqual('timestamp,value\n946684800,2000-01-01\n');

      expect(await readdir(resolve(tmp, identifier))).toEqual([
        '2000-01.csv',
        'schema.json',
      ]);

      // ---------------------------------------- //

      /* ----- multiple entries ----- */

      const entries: Entry[] = [jan2, jan3, feb1];
      await store.put(...entries);

      expect(await readdir(resolve(tmp, identifier))).toEqual([
        '2000-01.csv',
        '2000-02.csv',
        'schema.json',
      ]);

      expect(
        (await readFile(resolve(tmp, identifier, '2000-01.csv'))).toString(),
      ).toEqual(
        'timestamp,value\n946684800,2000-01-01\n946771200,2000-01-02\n946857600,2000-01-03\n',
      );

      expect(
        (await readFile(resolve(tmp, identifier, '2000-02.csv'))).toString(),
      ).toEqual('timestamp,value\n949363200,2000-02-01\n');

      // ---------------------------------------- //
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

  describe('append operations', () => {
    const identifier = 'append';
    const { store } = getStore({ identifier, prototype: Entry });

    it('can append data as individual chunks', async () => {
      // set up initial files for testing
      await ensureDir(resolve(tmp, identifier));
      await writeFile(
        resolve(tmp, 'append', '2000-01.csv'),
        'timestamp,value\n946684800,2000-01-01\n946771200,2000-01-02\n',
      );

      const entries: Entry[] = [
        {
          timestamp: new Date('2000-01-01T12:00:00z'),
          value: '2000-01-01',
        },
        {
          timestamp: new Date('2000-02-01T12:00:00z'),
          value: '2000-02-01',
        },
        {
          timestamp: new Date('2000-03-01T12:00:00z'),
          value: '2000-03-01',
        },
      ];

      await store.put(...entries);

      expect(await readdir(resolve(tmp, 'append'))).toEqual([
        '2000-01.csv',
        '2000-02.csv',
        '2000-03.csv',
        'schema.json',
      ]);

      expect(
        (await readFile(resolve(tmp, identifier, '2000-01.csv'))).toString(),
      ).toEqual(
        'timestamp,value\n946684800,2000-01-01\n946728000,2000-01-01\n946771200,2000-01-02\n',
      );

      expect(
        (await readFile(resolve(tmp, identifier, '2000-02.csv'))).toString(),
      ).toEqual('timestamp,value\n949406400,2000-02-01\n');

      expect(
        (await readFile(resolve(tmp, identifier, '2000-03.csv'))).toString(),
      ).toEqual('timestamp,value\n951912000,2000-03-01\n');
    });
  });

  describe('read operations', () => {
    const identifier = 'read';
    const { store } = getStore({ identifier, prototype: Entry });

    beforeAll(async () => {
      // set up initial files for testing
      await ensureDir(resolve(tmp, identifier));
      await writeFile(
        resolve(tmp, identifier, 'schema.json'),
        JSON.stringify(encodeSchema(getSchemaFromPrototype(Entry))),
      );
      await writeFile(
        resolve(tmp, identifier, '2000-01.csv'),
        'timestamp,value\n946684800,2000-01-01\n946771200,2000-01-02\n',
      );
      await writeFile(
        resolve(tmp, identifier, '2000-02.csv'),
        'timestamp,value\n949363200,2000-02-01\n949449600,2000-02-02\n',
      );
    });

    it('can reconstruct the schema from a schema file', async () => {
      // NOTE there is no prototype provided, so it should be read from the database
      const { store: another } = getStore({ identifier });

      expect(await another.get(jan1.timestamp)).toEqual(jan1);
    });

    it('throws an error if the provided prototype does not match the one embedded in the schema file', async () => {
      const { store: another } = getStore({
        identifier,
        prototype: AnotherEntry,
      });

      await expect(another.fields).rejects.toThrow(SchemaMismatchedError);
    });

    it('can faithfully return the fields declared in the schema', async () => {
      expect(await store.fields).toEqual(['timestamp', 'value']);
    });

    it('can return the first & last keys', async () => {
      expect(await store.firstKey).toEqual(jan1.timestamp);
      expect(await store.lastKey).toEqual(feb2.timestamp);
    });

    it('can read the first & last entries', async () => {
      expect(await store.first).toEqual(jan1);
      expect(await store.last).toEqual(feb2);
    });

    it('can read entry by the key', async () => {
      expect(await store.get(jan1.timestamp)).toEqual(jan1);
      expect(await store.get(feb1.timestamp)).toEqual(feb1);
    });
  });
});
