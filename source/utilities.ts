/*
 *                            *** MIT LICENSE ***
 * -------------------------------------------------------------------------
 * This code may be modified and distributed under the MIT license.
 * See the LICENSE file for details.
 * -------------------------------------------------------------------------
 *
 * @summary   Collection of small helpers
 *
 * @author    Alvis HT Tang <alvis@hilbert.space>
 * @license   MIT
 * @copyright Copyright (c) 2020 - All Rights Reserved.
 * -------------------------------------------------------------------------
 */

/* istanbul ignore file */

import Debug from 'debug';
import { extname, relative, sep } from 'path';

import type { Debugger } from 'debug';

/**
 * generate loggers according to the file path
 * @param filepath path of the source file
 * @param namespace additional namespace attached
 * @returns loggers
 */
export function createLogger(
  filepath: string,
  namespace?: string,
): Record<'log' | 'warn', Debugger> {
  const relativePath = relative(
    __dirname,
    filepath.substring(0, filepath.lastIndexOf(extname(filepath))),
  );

  const log = Debug('entrystore').extend(
    [...relativePath.split(sep), ...(namespace ? [namespace] : [])].join(':'),
  );
  const warn = log.extend('ERROR');

  return { log, warn };
}
