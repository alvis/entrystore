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

/** the maximum superset of all supported entry */
export class GenericEntry {
  [field: string]: SupportedData;
}

/** supported key type */
export type SupportedKeyType = typeof SupportedKey[number];
export type SupportedKey = InstanceType<typeof SupportedKey[number]>;
export const SupportedKey = [Number, String, Date];

/** supported data type */
export type SupportedDataType = typeof SupportedData[number];
export type SupportedData = InstanceType<SupportedDataType>;
export const SupportedData = [...SupportedKey, Boolean];
