/*
 *                            *** MIT LICENSE ***
 * -------------------------------------------------------------------------
 * This code may be modified and distributed under the MIT license.
 * See the LICENSE file for details.
 * -------------------------------------------------------------------------
 *
 * @summary   A local storage adapter
 *
 * @author    Alvis HT Tang <alvis@hilbert.space>
 * @license   MIT
 * @copyright Copyright (c) 2020 - All Rights Reserved.
 * -------------------------------------------------------------------------
 */

import {
  appendFile,
  pathExists,
  readFile,
  stat,
  writeFile,
  ensureFile,
} from 'fs-extra';
import glob from 'glob';
import { resolve } from 'path';
import { head, tail } from 'shelljs';
import { promisify } from 'util';

import { StorageAdapter } from './prototype';

interface LocalStorageOptions {
  /** root directory of all saved files */
  root: string;
}

export class LocalStorage extends StorageAdapter {
  private root: string;

  constructor(options: LocalStorageOptions) {
    const { root } = { ...options };

    super();

    this.root = root;
  }

  /**
   * collection of files stored in the store
   * @param extension files with this extension only
   * @returns list of files
   */
  public async collection(extension?: string): Promise<string[]> {
    return promisify(glob)(`*.${extension ?? '*'}`, {
      cwd: this.root,
      root: this.root,
      matchBase: true,
    });
  }

  /**
   * check if the file exists
   * @param path relative path to the file
   * @returns whether the path exists
   */
  public async exists(path: string): Promise<boolean> {
    return pathExists(resolve(this.root, path));
  }

  /**
   * get the file size
   * @param path relative path to the file
   * @returns file size in byte
   */
  public async size(path: string): Promise<number> {
    const { size } = await stat(resolve(this.root, path));

    return size;
  }

  /** get the content of a file
   * @param path relative path to the file
   * @returns content of the file
   */
  public async read(path: string): Promise<Buffer> {
    return readFile(resolve(this.root, path));
  }

  /**
   * get the first few lines from a file
   * @param path relative path to the file
   * @param lines number of lines to be taken
   * @returns part of the file in the head
   */
  public async head(path: string, lines: number = 1): Promise<string> {
    return head({ '-n': lines }, resolve(this.root, path)).toString().trimEnd();
  }

  /**
   * get the last few lines from a file
   * @param path relative path to the file
   * @param lines number of lines to be taken
   * @returns part of the file in the tail
   */
  public async tail(path: string, lines: number = 1): Promise<string> {
    return tail({ '-n': lines }, resolve(this.root, path)).toString().trimEnd();
  }

  /**
   *  overwrite a file with the given content
   * @param path relative path to the file
   * @param content content to be written
   */
  public async write(path: string, content: Buffer | string): Promise<void> {
    return writeFile(resolve(this.root, path), content);
  }

  /**
   * append the given content to a file
   * @param path relative path to the file
   * @param content content of the file
   */
  public async append(path: string, content: Buffer | string): Promise<void> {
    await ensureFile(resolve(this.root, path));

    return appendFile(resolve(this.root, path), content);
  }
}
