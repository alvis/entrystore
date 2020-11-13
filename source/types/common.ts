/*
 *                            *** MIT LICENSE ***
 * -------------------------------------------------------------------------
 * This code may be modified and distributed under the MIT license.
 * See the LICENSE file for details.
 * -------------------------------------------------------------------------
 *
 * @summary   Collection of common types
 *
 * @author    Alvis HT Tang <alvis@hilbert.space>
 * @license   MIT
 * @copyright Copyright (c) 2020 - All Rights Reserved.
 * -------------------------------------------------------------------------
 */

import { URL } from 'url';

/** the maximum superset of all supported entry */
export class GenericEntry {
  [field: string]: SupportedData | Array<Exclude<SupportedData, null>>;
}

/** supported key type */
export type SupportedKeyType = typeof SupportedKey[number];
export type SupportedKey = InstanceType<typeof SupportedKey[number]>;
export const SupportedKey = [Number, String, Date, URL];

/** supported data type */
export type SupportedDataType =
  | typeof SupportedData[number]
  | typeof GenericEntry;
export type SupportedData =
  | InstanceType<typeof SupportedData[number]>
  | GenericEntry
  | null;
export const SupportedData = [...SupportedKey, Boolean];

/** identifiers of data types to be stored in the schema table  */
export type GenericTypeIdentifier =
  | 'Boolean'
  | 'Number'
  | 'String'
  | 'Date'
  | 'URL'
  | 'Embedded'
  | 'Nullable';
export type IndexTypeIdentifier = `*${Exclude<
  GenericTypeIdentifier,
  'Nullable'
>}`;
export type ArrayTypeIdentifier = `[${Exclude<
  GenericTypeIdentifier,
  'Nullable'
>}]`;
export type NonNullableTypeIdentifier = Exclude<
  GenericTypeIdentifier | IndexTypeIdentifier | ArrayTypeIdentifier,
  'Nullable'
>;
export type NullableTypeIdentifier = `${NonNullableTypeIdentifier}?`;
export type TypeIdentifier = NonNullableTypeIdentifier | NullableTypeIdentifier;

/** metadata about a field */
export interface TypeMeta<Type = GenericTypeIdentifier> {
  /** data type */
  type: Type;
  /** indicate whether it is a list */
  isList: boolean;
  /** indicate whether it is nullable */
  isNullable: boolean;
}

/** type map for a data entry */
export type TypeMap<
  Entry extends GenericEntry = GenericEntry,
  Type = GenericTypeIdentifier
> = Record<keyof Entry, TypeMeta<Type>>;

/** schema for a data entry */
export type Schema<
  Entry extends GenericEntry = GenericEntry,
  IndexKey extends Extract<keyof Entry, string> = Extract<keyof Entry, string>
> = {
  index: IndexKey;
  map: TypeMap<Entry>;
};
