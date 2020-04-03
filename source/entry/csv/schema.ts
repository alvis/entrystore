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

import { UnsupportedTypeError } from '#error';

import type { GenericEntry, SupportedData, TypeIdentifier } from '#types';

/** supported data type in sqlite */
type NativelySupportedDataType = string;

/** entry structure stored in CSV format */
export type NativeEntry<Entry extends GenericEntry> = Record<
  keyof Entry,
  NativelySupportedDataType
>;

const MILLISECONDS = 1000;

/**
 * convert a value into a format supported by CSV
 * @param value content to be converted
 * @returns transformed content
 */
export function hydrate(value: SupportedData): NativelySupportedDataType {
  if (typeof value === 'boolean') {
    return value ? '1' : '0';
  } else if (typeof value === 'number') {
    return value.toString();
  } else if (typeof value === 'string') {
    return value;
  } else if (value instanceof Date) {
    return (value.getTime() / MILLISECONDS).toString();
  }

  throw new UnsupportedTypeError({ value });
}

/**
 * convert a value stored in CSV back its original form
 * @param type the type identifier of the value
 * @param value the transformed value stored as a string
 * @returns the dehydrated value in its original form
 */
export function dehydrate(
  type: TypeIdentifier,
  value: NativelySupportedDataType,
): SupportedData {
  switch (type) {
    case 'Boolean':
      return !!parseInt(value);
    case 'Date':
      return new Date(parseFloat(value) * MILLISECONDS);
    case 'Number':
      return parseFloat(value);
    case 'String':
      return value;
    default:
      throw new UnsupportedTypeError({ value });
  }
}