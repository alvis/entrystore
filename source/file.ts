/*
 *                           *** CONFIDENTIAL ***
 * -------------------------------------------------------------------------
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * -------------------------------------------------------------------------
 *
 * @summary   Simple timeseries store.
 *
 * @author    Alvis HT Tang <alvis@hilbert.space>
 * @license   Proprietary
 * @copyright Copyright (c) 2018 - All Rights Reserved.
 * -------------------------------------------------------------------------
 */

import { error } from 'console';
import parse from 'csv-parse';
import stringify from 'csv-stringify';
import { appendFile, ensureDir, ensureFile, readdir, stat } from 'fs-extra';
import { resolve } from 'path';
import { head, tail } from 'shelljs';
import { promisify } from 'util';

import { DataType, FullEntry, Store } from './definitions';
import { Partitioner } from './partitioner';

/** options for FileStore */
interface FileStoreOptions<Meta extends Record<string, DataType>> {
  /** the directory in while files will be outputted */
  outputDirectory: string;
  /** convert a data entry to the entry meta to be accepted by the partitioner */
  meta(data: Record<string, DataType>): Meta;
  /** path partitioner */
  partitioner: Partitioner<Meta>;
}

/** file system based time series store s*/
export class FileStore<
  Entry extends Record<string, DataType>,
  Meta extends Record<string, DataType>
> extends Store {
  private options: FileStoreOptions<Meta>;

  constructor(options: FileStoreOptions<Meta>) {
    super();

    this.options = options;
  }

  /**
   * retrieve the last entry
   * @return last entry of the timeseries
   */
  public async getLastEntry(): Promise<Entry | null> {
    // ensure the output directory exists
    await ensureDir(this.options.outputDirectory);

    const allFiles = await readdir(this.options.outputDirectory);

    if (allFiles.length > 0) {
      // get the last file
      const file = resolve(
        this.options.outputDirectory,
        this.options.partitioner.getLast(allFiles)
      );

      // get the last line of the last file
      const firstLine = head({ '-n': 1 }, file);
      const lastLine = tail({ '-n': 1 }, file);

      const entry = await promisify<string, parse.Options, Entry[]>(parse)(
        `${firstLine}${lastLine}`,
        {
          cast: true,
          columns: true
        }
      );

      return entry[entry.length - 1];
    }

    // return null if nothing is found
    return null;
  }

  /**
   * append entries to files
   * @param entries list of entries
   */
  public async submitEntries(...entries: Entry[]): Promise<void> {
    const collection: Record<string, FullEntry<Meta>[]> = {};

    // filter the entries according to year and month
    for (const entry of entries) {
      const meta = this.options.meta(entry);
      const partition = this.options.partitioner.getPath(meta);
      // initialise a collection if it doesn't exist
      if (collection[partition] === undefined) {
        collection[partition] = [];
      }

      // add the entry to the collection
      collection[partition].push({
        meta,
        payload: entry
      });
    }

    // append the entries according to year and month
    for (const [partition, entries] of Object.entries(collection)) {
      // sort the entries
      //  collection.entries.sort((a, b) => (a.timestamp > b.timestamp ? 1 : -1));

      // append the entries to files
      await this.appendEntries(partition, entries);
    }
  }

  /**
   * append entries to files
   * @param partition path to the output file
   * @param collection a collection of entries
   */
  private async appendEntries(
    partition: string,
    entries: FullEntry<Meta>[]
  ): Promise<void> {
    const path = resolve(this.options.outputDirectory, `${partition}.csv`);

    try {
      await ensureFile(path);

      // collect the file stat
      const { size } = await stat(path);

      // prepare the data
      const data = await promisify<
        Record<string, DataType>[],
        stringify.Options
      >(stringify)(
        entries.map(entry => ({
          // timestamp: entry.timestamp.toISOString(),
          ...entry.payload
        })),
        {
          header: size === 0
        }
      );

      // store data to file
      await appendFile(path, data);
    } catch (issue) {
      error(`fail to append to file (${path}): ${issue.message}`);
    }
  }

  // /**
  //  * get the year and month based on a filename
  //  * @param path path to the file
  //  * @return year and month
  //  */
  // private extractYearMonth(path: string): { year: number; month: number } {
  //   const [year, month] = basename(path)
  //     .split('-')
  //     .map(part => parseInt(part));

  //   return { year, month };
  // }

  /**
   * get the path for the output csv
   * @param year year of the data
   * @param month month of the data
   * @return the absolute path to the file
   */
  // private getPath(year: number, month: number): string {
  //   return resolve(
  //     this.options.outputDirectory,
  //     `${year.toString().padStart(4, '0')}` +
  //       `-` +
  //       `${month.toString().padStart(2, '0')}` +
  //       `.csv`
  //   );
  // }
}
