/*
 *                            *** MIT LICENSE ***
 * -------------------------------------------------------------------------
 * This code may be modified and distributed under the MIT license.
 * See the LICENSE file for details.
 * -------------------------------------------------------------------------
 *
 * @summary   ValidationError
 *
 * @author    Alvis HT Tang <alvis@hilbert.space>
 * @license   MIT
 * @copyright Copyright (c) 2020 - All Rights Reserved.
 * -------------------------------------------------------------------------
 */

import { diff, formatters } from 'jsondiffpatch';

import type { GenericEntry, TypeMap } from '#types';

const INDENT = 2;

/** error for mismatched data  */
export class ValidationError extends Error {
  /**
   * @param options error detail
   * @param options.entry the entry in question
   * @param options.typeMap the expected type map and the derived
   */
  constructor(options: {
    entry: GenericEntry;
    typeMap: Record<'expected' | 'derived', TypeMap>;
  }) {
    const { entry, typeMap } = options;
    const delta = formatters.console.format(
      diff(typeMap.expected, typeMap.derived)!,
      typeMap.expected,
    );

    super(
      `Supplied data does not conformed to the schema. Got\n` +
        `${delta}\n` +
        `from\n` +
        JSON.stringify(entry, null, INDENT),
    );

    Object.setPrototypeOf(this, new.target.prototype);
  }
}
