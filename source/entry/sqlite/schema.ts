/*
 *                            *** MIT LICENSE ***
 * -------------------------------------------------------------------------
 * This code may be modified and distributed under the MIT license.
 * See the LICENSE file for details.
 * -------------------------------------------------------------------------
 *
 * @summary   Collection of schema related helpers
 *
 * @author    Alvis HT Tang <alvis@hilbert.space>
 * @license   MIT
 * @copyright Copyright (c) 2020 - All Rights Reserved.
 * -------------------------------------------------------------------------
 */

import { URL } from 'url';

import { UnsupportedTypeError } from '#error';

import type { GenericEntry, SupportedData, TypeIdentifier } from '#types';

/** supported data type in sqlite */
type NativelySupportedDataType = boolean | number | string;

/** entry structure stored in CSV format */
export type NativeEntry<Entry extends GenericEntry> = Record<
  keyof Entry,
  NativelySupportedDataType
>;

/**
 * convert a value into a format supported by SQLite
 * @param value content to be converted
 * @returns transformed content
 */
export function hydrate(value: SupportedData): NativelySupportedDataType {
  if (typeof value === 'boolean') {
    return value ? 1 : 0;
  } else if (typeof value === 'number') {
    return value;
  } else if (typeof value === 'string') {
    return value;
  } else if (value instanceof Date) {
    return value.getTime();
  } else if (value instanceof URL) {
    return value.toString();
  }

  throw new UnsupportedTypeError({ value });
}

/**
 * convert a value stored in SQLite back its original form
 * @param type the type identifier of the value
 * @param value the transformed value stored in SQLite
 * @returns the dehydrated value in its original form
 */
export function dehydrate(
  type: TypeIdentifier,
  value: NativelySupportedDataType,
): SupportedData {
  switch (type) {
    case 'Boolean':
      return !!value;
    case 'Date':
      return new Date(value as number);
    case 'Number':
    case 'String':
      return value;
    case 'URL':
      return new URL(value as string);
    default:
      throw new UnsupportedTypeError({ value });
  }
}
