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

import { writeFile, readdir, readFile } from 'fs-extra';
import { resolve } from 'path';
import { dir } from 'tmp-promise';

import { CSVStore } from './csv';
import { YearMonthPartitioner } from '#partitioner';
import { LocalStorage } from '#storage';

import { DirectoryResult } from 'tmp-promise';

import { CSVStoreOptions } from './csv';

/** data structure */
type Entry = {
  /** index key */
  timestamp: Date;
  /** value of the entry */
  value: string;
};

/**
 * initialise a temporary folder and create a csv store for testing
 * @param options options to CSVStore
 */
async function init(
  options?: Partial<CSVStoreOptions<Entry, 'timestamp'>>
): Promise<{
  tmp: DirectoryResult;
  destination: LocalStorage;
  store: CSVStore<Entry, 'timestamp'>;
}> {
  // create a temporary folder containing all the testing files
  const tmp = await dir({ unsafeCleanup: true });

  // initiate the instance
  const destination = new LocalStorage({ root: tmp.path });

  // create a CSV store with a local device as the storage backend
  const store = new CSVStore<Entry, 'timestamp'>({
    // the index key of each index
    indexKey: 'timestamp',
    // where the data will be stored
    destination,
    // partition files into YYYY-MM format
    partitioner: new YearMonthPartitioner({
      adapter: (index: Date): Date => index,
    }),
    transformer: {
      read: {
        timestamp: (timestamp: string): Date => new Date(parseInt(timestamp)),
      },
      write: {
        timestamp: (timestamp: Date): string => timestamp.getTime().toString(),
      },
    },
    ...options,
  });

  return { tmp, destination, store };
}

describe('Default Options on CSVStore', () => {
  let store: CSVStore<Entry, 'timestamp'>;
  let tmp: DirectoryResult;

  beforeAll(async () => {
    ({ store, tmp } = await init({
      transformer: {
        read: {
          timestamp: (timestamp: string): Date =>
            new Date(parseFloat(timestamp) * 1000),
        },
      },
    }));
  });

  test('default encoder', async () => {
    const entry: Entry = {
      timestamp: new Date('2000-01-01T00:00:00z'),
      value: '2000-01-01',
    };

    await store.put(entry);

    expect(await readdir(tmp.path)).toEqual(['2000-01.csv']);

    expect(await readFile(resolve(tmp.path, '2000-01.csv'))).toEqual(
      Buffer.from('timestamp,value\n946684800,2000-01-01\n')
    );

    expect(await store.get(new Date('2000-01-01T00:00:00z'))).toEqual({
      timestamp: new Date('2000-01-01T00:00:00z'),
      value: '2000-01-01',
    });
  });
});

describe('Empty CSVStore', () => {
  let store: CSVStore<Entry, 'timestamp'>;

  beforeAll(async () => {
    ({ store } = await init());
  });

  test('fields', async () => {
    expect(await store.fields).toEqual(undefined);
  });

  test('firstKey', async () => {
    expect(await store.firstKey).toEqual(undefined);
  });

  test('lastKey', async () => {
    expect(await store.lastKey).toEqual(undefined);
  });

  test('get', async () => {
    expect(await store.get(new Date('2000-01-01T00:00:00z'))).toEqual(
      undefined
    );
  });
});

describe('Read operations on CSVStore', () => {
  let store: CSVStore<Entry, 'timestamp'>;
  let tmp: DirectoryResult;

  beforeAll(async () => {
    ({ store, tmp } = await init());

    // set up initial files for testing
    await writeFile(
      resolve(tmp.path, '2000-01.csv'),
      'timestamp,value\n946684800000,2000-01-01\n946771200000,2000-01-02\n'
    );
    await writeFile(
      resolve(tmp.path, '2000-02.csv'),
      'timestamp,value\n949363200000,2000-02-01\n949449600000,2000-02-02\n'
    );
  });

  test('fields', async () => {
    expect(await store.fields).toEqual(['timestamp', 'value']);
  });

  test('firstKey', async () => {
    expect(await store.firstKey).toEqual(new Date('2000-01-01T00:00:00z'));
  });

  test('lastKey', async () => {
    expect(await store.lastKey).toEqual(new Date('2000-02-02T00:00:00z'));
  });

  test('get', async () => {
    expect(await store.get(new Date('2000-01-01T00:00:00z'))).toEqual({
      timestamp: new Date('2000-01-01T00:00:00z'),
      value: '2000-01-01',
    });
    expect(await store.get(new Date('2000-02-02T00:00:00z'))).toEqual({
      timestamp: new Date('2000-02-02T00:00:00z'),
      value: '2000-02-02',
    });
  });
});

describe('Append operations on CSVStore', () => {
  let tmp: DirectoryResult;
  let store: CSVStore<Entry, 'timestamp'>;

  beforeAll(async () => {
    ({ tmp, store } = await init());

    // set up initial files for testing
    await writeFile(
      resolve(tmp.path, '2000-01.csv'),
      'timestamp,value\n946684800000,2000-01-01\n946771200000,2000-01-02\n'
    );
  });

  test('append data as individual chunks', async () => {
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

    expect(await readdir(tmp.path)).toEqual([
      '2000-01.csv',
      '2000-02.csv',
      '2000-03.csv',
    ]);

    expect(await readFile(resolve(tmp.path, '2000-01.csv'))).toEqual(
      Buffer.from(
        'timestamp,value\n946684800000,2000-01-01\n946771200000,2000-01-02\n946728000000,2000-01-01\n'
      )
    );

    expect(await readFile(resolve(tmp.path, '2000-02.csv'))).toEqual(
      Buffer.from('timestamp,value\n949406400000,2000-02-01\n')
    );

    expect(await readFile(resolve(tmp.path, '2000-03.csv'))).toEqual(
      Buffer.from('timestamp,value\n951912000000,2000-03-01\n')
    );
  });
});

describe('Write operation on CSVStore', () => {
  let tmp: DirectoryResult;
  let store: CSVStore<Entry, 'timestamp'>;

  beforeAll(async () => {
    ({ tmp, store } = await init());
  });

  test('write data as individual chunks', async () => {
    /* ----- single entry ----- */

    const entry: Entry = {
      timestamp: new Date('2000-01-01T00:00:00z'),
      value: '2000-01-01',
    };

    await store.put(entry);

    expect(await readFile(resolve(tmp.path, '2000-01.csv'))).toEqual(
      Buffer.from('timestamp,value\n946684800000,2000-01-01\n')
    );

    expect(await readdir(tmp.path)).toEqual(['2000-01.csv']);

    // ---------------------------------------- //

    /* ----- multiple entries ----- */

    const entries: Entry[] = [
      {
        timestamp: new Date('2000-01-02T00:00:00z'),
        value: '2000-01-02',
      },
      {
        timestamp: new Date('2000-01-03T00:00:00z'),
        value: '2000-01-03',
      },
      {
        timestamp: new Date('2000-02-01T00:00:00z'),
        value: '2000-02-01',
      },
    ];
    await store.put(...entries);

    expect(await readdir(tmp.path)).toEqual(['2000-01.csv', '2000-02.csv']);

    expect(await readFile(resolve(tmp.path, '2000-01.csv'))).toEqual(
      Buffer.from(
        'timestamp,value\n946684800000,2000-01-01\n946771200000,2000-01-02\n946857600000,2000-01-03\n'
      )
    );

    expect(await readFile(resolve(tmp.path, '2000-02.csv'))).toEqual(
      Buffer.from('timestamp,value\n949363200000,2000-02-01\n')
    );

    // ---------------------------------------- //
  });
});
