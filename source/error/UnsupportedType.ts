/*
 *                            *** MIT LICENSE ***
 * -------------------------------------------------------------------------
 * This code may be modified and distributed under the MIT license.
 * See the LICENSE file for details.
 * -------------------------------------------------------------------------
 *
 * @summary   UnsupportedTypeError
 *
 * @author    Alvis HT Tang <alvis@hilbert.space>
 * @license   MIT
 * @copyright Copyright (c) 2020 - All Rights Reserved.
 * -------------------------------------------------------------------------
 */

/** error for data type unsupported */
export class UnsupportedTypeError extends Error {
  /**
   * @param options information about a value
   * @param options.value the value in question
   */
  constructor(options: { value: unknown }) {
    const { value } = options;

    const content = JSON.stringify(value);

    super(`Data type in ${content} is unsupported.`);

    Object.setPrototypeOf(this, new.target.prototype);
  }
}
