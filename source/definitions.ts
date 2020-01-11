/*
 *                           *** CONFIDENTIAL ***
 * -------------------------------------------------------------------------
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * -------------------------------------------------------------------------
 *
 * @summary   Definitions for storage
 *
 * @author    Alvis HT Tang <alvis@hilbert.space>
 * @license   Proprietary
 * @copyright Copyright (c) 2019 - All Rights Reserved.
 * -------------------------------------------------------------------------
 */

/** supported data type */
export type DataType = boolean | number | string | Date;

/** data structure */
export interface FullEntry<
  Meta extends object,
  Type extends DataType = DataType
> {
  /** metadata for the entry */
  meta: Meta;
  /** payload */
  payload: {
    [key: string]: Type;
  };
}

/** prototype for a timeseries store */
export abstract class Store<Type extends DataType = DataType> {
  /** get the last entry of the timeseries */
  public abstract getLastEntry(): Promise<Record<string, Type> | null>;
  /** submit timeseries entries in bulk */
  public abstract submitEntries(
    ...entries: Record<string, Type>[]
  ): Promise<void>;
}
