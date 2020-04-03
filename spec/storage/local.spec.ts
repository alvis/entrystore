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

import { ensureFile, writeFile } from 'fs-extra';
import { resolve } from 'path';
import { dirSync } from 'tmp';

import { LocalStorage } from '#storage';

// create a temporary folder containing all the testing files
const tmp = dirSync({ unsafeCleanup: true }).name;

describe('cl:LocalStorage', () => {
  let store: LocalStorage;

  beforeAll(async () => {
    // initiate the instance
    store = new LocalStorage({ root: tmp });

    // set up initial files for testing
    await Promise.all([
      ensureFile(resolve(tmp, '.dotfile')),
      ensureFile(resolve(tmp, 'file.ext')),
      ensureFile(resolve(tmp, 'file.oth')),
      ensureFile(resolve(tmp, 'subfolder', 'file')),
      ensureFile(resolve(tmp, 'subfolder', 'file.ext')),
    ]);

    await writeFile(
      resolve(tmp, 'file.ext'),
      Buffer.from('firstline\nsecondline\nthirdline\n', 'utf8'),
    );
  });

  describe('fn:collection', () => {
    it('returns all entires', async () => {
      expect(await store.collection()).toEqual([
        'file.ext',
        'file.oth',
        'subfolder/file.ext',
      ]);
    });

    it('returns entries with the specified extensions only', async () => {
      expect(await store.collection('ext')).toEqual([
        'file.ext',
        'subfolder/file.ext',
      ]);
    });
  });

  describe('fn:exists', () => {
    it('returns true for an existent entry', async () => {
      expect(await store.exists('file.ext')).toEqual(true);
    });

    it('returns false for a non-existent entry', async () => {
      expect(await store.exists('non-existent')).toEqual(false);
    });
  });

  describe('fn:size', () => {
    it('returns the file size', async () => {
      const FILESIZE = 31;
      expect(await store.size('file.ext')).toEqual(FILESIZE);
    });

    it('throws an error if a non-existent entry is given', async () => {
      await expect(store.size('non-existent')).rejects.toThrow();
    });
  });

  describe('fn:read', () => {
    it('returns the content buffer', async () => {
      expect(await store.read('file.ext')).toEqual(
        Buffer.from('firstline\nsecondline\nthirdline\n', 'utf8'),
      );
    });
  });

  describe('fn:head', () => {
    it('returns a limited number of lines', async () => {
      const TWO_LINES = 2;
      const MORE_LINES = 10;
      expect(await store.head('file.ext')).toEqual('firstline\n');
      expect(await store.head('file.ext', TWO_LINES)).toEqual(
        'firstline\nsecondline\n',
      );
      expect(await store.head('file.ext', MORE_LINES)).toEqual(
        'firstline\nsecondline\nthirdline\n',
      );
    });
  });

  describe('fn:tail', () => {
    it('returns a limited number of lines', async () => {
      const TWO_LINES = 2;
      const MORE_LINES = 10;
      expect(await store.tail('file.ext')).toEqual('thirdline\n');
      expect(await store.tail('file.ext', TWO_LINES)).toEqual(
        'secondline\nthirdline\n',
      );
      expect(await store.tail('file.ext', MORE_LINES)).toEqual(
        'firstline\nsecondline\nthirdline\n',
      );
    });
  });

  describe('fn:append', () => {
    it('appends data at the end of the file', async () => {
      const FILENAME = 'append.ext';

      await store.append(FILENAME, 'first');
      expect(await store.read(FILENAME)).toEqual(Buffer.from('first', 'utf8'));
      await store.append(FILENAME, 'second');
      expect(await store.read(FILENAME)).toEqual(
        Buffer.from('firstsecond', 'utf8'),
      );
    });
  });

  describe('fn:write', () => {
    it('writes data to the file', async () => {
      const FILENAME = 'write.ext';

      await store.write(FILENAME, 'content');
      expect(await store.read(FILENAME)).toEqual(
        Buffer.from('content', 'utf8'),
      );
    });

    it('overwrites file', async () => {
      const FILENAME = 'overwrite.ext';

      await store.write(FILENAME, 'old');
      expect(await store.read(FILENAME)).toEqual(Buffer.from('old', 'utf8'));
      await store.write(FILENAME, 'new');
      expect(await store.read(FILENAME)).toEqual(Buffer.from('new', 'utf8'));
    });
  });
});
