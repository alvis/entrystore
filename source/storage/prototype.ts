/*
 *                            *** MIT LICENSE ***
 * -------------------------------------------------------------------------
 * This code may be modified and distributed under the MIT license.
 * See the LICENSE file for details.
 * -------------------------------------------------------------------------
 *
 * @summary   An unified interface for an file storage device
 *
 * @author    Alvis HT Tang <alvis@hilbert.space>
 * @license   MIT
 * @copyright Copyright (c) 2020 - All Rights Reserved.
 * -------------------------------------------------------------------------
 */

/**
 *
 */
export abstract class StorageAdapter {
  /**
   * collection of files stored in the store
   * @param extension files with this extension only
   * @returns list of files
   */
  public abstract collection(extension?: string): Promise<string[]>;

  /**
   * check if the file exists
   * @param path relative path to the file
   * @returns whether the path exists
   */
  public abstract exists(path: string): Promise<boolean>;

  /**
   * get the file size
   * @param path relative path to the file
   * @returns file size in byte
   */
  public abstract size(path: string): Promise<number>;

  /**
   * append the given content to a file
   * @param path relative path to the file
   * @param content content of the file
   */
  public abstract append(path: string, content: string | Buffer): Promise<void>;

  /** get the content of a file
   * @param path relative path to the file
   * @returns content of the file
   */
  public abstract read(path: string): Promise<Buffer>;

  /**
   * get the first few lines from a file
   * @param path relative path to the file
   * @param lines number of lines to be taken
   * @returns part of the file in the head
   */
  public abstract head(path: string, lines?: number): Promise<string>;

  /**
   * get the last few lines from a file
   * @param path relative path to the file
   * @param lines number of lines to be taken
   * @returns part of the file in the tail
   */
  public abstract tail(path: string, lines?: number): Promise<string>;

  /**
   *  overwrite a file with the given content
   * @param path relative path to the file
   * @param content content to be written
   */
  public abstract write(path: string, content: Buffer | string): Promise<void>;
}
