/*
 *                            *** MIT LICENSE ***
 * -------------------------------------------------------------------------
 * This code may be modified and distributed under the MIT license.
 * See the LICENSE file for details.
 * -------------------------------------------------------------------------
 *
 * @summary   Tests on LocalStorage
 *
 * @author    Alvis HT Tang <alvis@hilbert.space>
 * @license   MIT
 * @copyright Copyright (c) 2020 - All Rights Reserved.
 * -------------------------------------------------------------------------
 */

import { ensureFile, rmdir, writeFile } from 'fs-extra';
import { resolve } from 'path';
import { dir } from 'tmp-promise';

import { LocalStorage } from './local';

import { DirectoryResult } from 'tmp-promise';

describe('LocalStorage', () => {
  let tmp: DirectoryResult;
  let store: LocalStorage;

  beforeAll(async () => {
    // create a temporary folder containing all the testing files
    tmp = await dir({ unsafeCleanup: true });

    // initiate the instance
    store = new LocalStorage({ root: tmp.path });

    // set up initial files for testing
    await Promise.all([
      ensureFile(resolve(tmp.path, '.dotfile')),
      ensureFile(resolve(tmp.path, 'file.ext')),
      ensureFile(resolve(tmp.path, 'subfolder', 'file')),
      ensureFile(resolve(tmp.path, 'subfolder', 'file.ext')),
    ]);

    await writeFile(
      resolve(tmp.path, 'file.ext'),
      Buffer.from('firstline\nsecondline\nthirdline', 'utf8')
    );
  });

  afterAll(async () => {
    // clear up the temporary files
    await rmdir(tmp.path);
  });

  test('collection (all files)', async () => {
    expect(await store.collection()).toEqual([
      'file.ext',
      'subfolder/file.ext',
    ]);
  });

  test('collection (with extension)', async () => {
    expect(await store.collection('ext')).toEqual([
      'file.ext',
      'subfolder/file.ext',
    ]);
  });

  test('exists', async () => {
    expect(await store.exists('file.ext')).toEqual(true);
    expect(await store.exists('non-existent')).toEqual(false);
  });

  test('size', async () => {
    const FILESIZE = 30;
    expect(await store.size('file.ext')).toEqual(FILESIZE);
    await expect(store.size('non-existent')).rejects.toThrow();
  });

  test('read', async () => {
    expect(await store.read('file.ext')).toEqual(
      Buffer.from('firstline\nsecondline\nthirdline', 'utf8')
    );
  });

  test('head', async () => {
    const TWOLINES = 2;
    expect(await store.head('file.ext')).toEqual('firstline');
    expect(await store.head('file.ext', TWOLINES)).toEqual(
      'firstline\nsecondline'
    );
  });

  test('tail', async () => {
    const TWOLINES = 2;
    expect(await store.tail('file.ext')).toEqual('thirdline');
    expect(await store.tail('file.ext', TWOLINES)).toEqual(
      'secondline\nthirdline'
    );
  });

  test('append', async () => {
    const FILENAME = 'append.ext';
    await expect(store.read(FILENAME)).rejects.toThrow();
    await store.append(FILENAME, 'first');
    expect(await store.read(FILENAME)).toEqual(Buffer.from('first', 'utf8'));
    await store.append(FILENAME, 'second');
    expect(await store.read(FILENAME)).toEqual(
      Buffer.from('firstsecond', 'utf8')
    );
  });

  test('write', async () => {
    await expect(store.read('write.ext')).rejects.toThrow();
    await store.write('write.ext', 'content');
    expect(await store.read('write.ext')).toEqual(
      Buffer.from('content', 'utf8')
    );
  });
});
