/*
 *                            *** MIT LICENSE ***
 * -------------------------------------------------------------------------
 * This code may be modified and distributed under the MIT license.
 * See the LICENSE file for details.
 * -------------------------------------------------------------------------
 *
 * @summary   MissingSchemaError
 *
 * @author    Alvis HT Tang <alvis@hilbert.space>
 * @license   MIT
 * @copyright Copyright (c) 2020 - All Rights Reserved.
 * -------------------------------------------------------------------------
 */

/* istanbul ignore file */

/** error for schema unavailability */
export class MissingSchemaError extends Error {
  constructor() {
    super(
      `There is no schema available. You must provide an entry prototype for first time initialisation.`,
    );

    Object.setPrototypeOf(this, new.target.prototype);
  }
}
