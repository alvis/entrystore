/*
 *                            *** MIT LICENSE ***
 * -------------------------------------------------------------------------
 * This code may be modified and distributed under the MIT license.
 * See the LICENSE file for details.
 * -------------------------------------------------------------------------
 *
 * @summary   TypeUndeterminedError
 *
 * @author    Alvis HT Tang <alvis@hilbert.space>
 * @license   MIT
 * @copyright Copyright (c) 2020 - All Rights Reserved.
 * -------------------------------------------------------------------------
 */

/** error for unsupported data type */
export class TypeUndeterminedError extends Error {
  constructor() {
    super(
      `Failed to determine the type of all data fields. An explicit declaration may be required.`,
    );

    Object.setPrototypeOf(this, new.target.prototype);
  }
}
