/*
 *                            *** MIT LICENSE ***
 * -------------------------------------------------------------------------
 * This code may be modified and distributed under the MIT license.
 * See the LICENSE file for details.
 * -------------------------------------------------------------------------
 *
 * @summary   SchemaMismatchedError
 *
 * @author    Alvis HT Tang <alvis@hilbert.space>
 * @license   MIT
 * @copyright Copyright (c) 2020 - All Rights Reserved.
 * -------------------------------------------------------------------------
 */

import { diff, formatters } from 'jsondiffpatch';

import type { Schema } from '#types';

/** error for a schema mismatch */
export class SchemaMismatchedError extends Error {
  /**
   * @param schema container for the schema in question
   * @param schema.expected the expected schema
   * @param schema.challenger the derived schema
   */
  constructor(schema: Record<'expected' | 'challenger', Schema>) {
    const { expected, challenger } = schema;

    const delta = formatters.console.format(
      diff(expected, challenger)!,
      expected,
    );

    super(
      `The schema derived from the prototype is different from the one stated in the database. Got\n` +
        `${delta}\n`,
    );

    Object.setPrototypeOf(this, new.target.prototype);
  }
}
