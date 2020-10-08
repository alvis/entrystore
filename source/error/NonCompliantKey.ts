/*
 *                            *** MIT LICENSE ***
 * -------------------------------------------------------------------------
 * This code may be modified and distributed under the MIT license.
 * See the LICENSE file for details.
 * -------------------------------------------------------------------------
 *
 * @summary   NonCompliantKeyError
 *
 * @author    Alvis HT Tang <alvis@hilbert.space>
 * @license   MIT
 * @copyright Copyright (c) 2020 - All Rights Reserved.
 * -------------------------------------------------------------------------
 */

/** error for a potentially escaped key */
export class NonCompliantKeyError extends Error {
  /**
   * @param options information about the key
   * @param options.key name of the key
   */
  constructor(options: { key: string | symbol }) {
    const { key } = options;

    super(`Key name ${key.toString()} is not alphanumeric.`);

    Object.setPrototypeOf(this, new.target.prototype);
  }
}
