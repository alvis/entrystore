import { DataType } from '../definitions';
import { Partitioner } from './prototype';

export class FixedPartitioner<Meta extends Record<string, DataType>>
  implements Partitioner<Meta> {
  private basename: string;

  constructor(basename: string) {
    this.basename = basename;
  }

  /**
   * get the last file path
   * @param _ dummy parameter (the output directory)
   * @return the path to the last file
   */
  public getLast(_: string[]): string {
    return this.basename;
  }

  /**
   * get the path for the output csv
   * @param _ dummy parameter (metadata of an entry)
   * @return the absolute path to the file
   */
  public getPath(_: Meta): string {
    return this.basename;
  }
}
