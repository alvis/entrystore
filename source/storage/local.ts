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
  close,
  open,
  pathExists,
  read,
  readFile,
  stat,
  writeFile,
  ensureFile,
} from 'fs-extra';
import glob from 'glob';
import { resolve } from 'path';
import { promisify } from 'util';

import { StorageAdapter } from './prototype';

interface LocalStorageOptions {
  /** root directory of all saved files */
  root: string;
}

const CHUNK = 2;

/**
 *
 */
export class LocalStorage extends StorageAdapter {
  private root: string;

  /**
   * create a local storage adapter
   * @param options options for the adapter
   */
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
    return pathExists(this.getAbsolutePath(path));
  }

  /**
   * get the file size
   * @param path relative path to the file
   * @returns file size in byte
   */
  public async size(path: string): Promise<number> {
    const { size } = await stat(this.getAbsolutePath(path));

    return size;
  }

  /** get the content of a file
   * @param path relative path to the file
   * @returns content of the file
   */
  public async read(path: string): Promise<Buffer> {
    return readFile(this.getAbsolutePath(path));
  }

  /**
   * get the first few lines from a file
   * @param path relative path to the file
   * @param lines number of lines to be taken
   * @returns part of the file in the head
   */
  public async head(path: string, lines = 1): Promise<string> {
    const absolutePath = this.getAbsolutePath(path);
    const { size } = await stat(absolutePath);
    const fd = await open(absolutePath, 'r');

    let content = '';
    let lastPosition = -1;
    let linesObtained = 0;
    while (linesObtained < lines && content.length < size) {
      const remaining = size - content.length - CHUNK;
      const chunkSize = CHUNK + Math.min(remaining, 0);
      const chunk = Buffer.alloc(chunkSize);
      const { buffer } = await read(fd, chunk, 0, chunk.length, content.length);
      content += buffer.toString().substring(0, chunkSize);

      let newPosition = content.indexOf('\n', lastPosition + 1);
      while (newPosition !== -1 && linesObtained < lines) {
        linesObtained++;
        lastPosition = newPosition;
        newPosition = content.indexOf('\n', lastPosition + 1);
      }
    }

    await close(fd);

    return lines !== linesObtained
      ? content
      : content.substring(0, lastPosition + 1);
  }

  /**
   * get the last few lines from a file
   * @param path relative path to the file
   * @param lines number of lines to be taken
   * @returns part of the file in the tail
   */
  public async tail(path: string, lines = 1): Promise<string> {
    const absolutePath = this.getAbsolutePath(path);
    const { size } = await stat(absolutePath);
    const fd = await open(absolutePath, 'r');

    let content = '';
    let lastPosition = 1;
    let linesObtained = 0;
    while (linesObtained < lines && content.length < size) {
      const remaining = size - content.length - CHUNK;
      const chunkSize = CHUNK + Math.min(remaining, 0);
      const chunk = Buffer.alloc(chunkSize);
      const { buffer } = await read(fd, chunk, 0, chunk.length, remaining);
      content = buffer.toString().substring(0, chunkSize) + content;

      let newPosition = content.lastIndexOf(
        '\n',
        content.length - lastPosition - 1,
      );
      while (newPosition !== -1 && linesObtained < lines) {
        linesObtained++;
        lastPosition = content.length - newPosition;
        newPosition = content.lastIndexOf('\n', newPosition - 1) || -1;
      }
    }

    await close(fd);

    return lines !== linesObtained
      ? content
      : content.substring(content.length - lastPosition + 1);
  }

  /**
   * overwrite a file with the given content
   * @param path relative path to the file
   * @param content content to be written
   */
  public async write(path: string, content: Buffer | string): Promise<void> {
    await ensureFile(this.getAbsolutePath(path));

    await writeFile(this.getAbsolutePath(path), content);
  }

  /**
   * append the given content to a file
   * @param path relative path to the file
   * @param content content of the file
   */
  public async append(path: string, content: Buffer | string): Promise<void> {
    await ensureFile(this.getAbsolutePath(path));

    await appendFile(this.getAbsolutePath(path), content);
  }

  /**
   * get the full path of a relative path
   * @param path relative path to the file
   * @returns full path of the file
   */
  private getAbsolutePath(path: string): string {
    return resolve(this.root, path);
  }
}
