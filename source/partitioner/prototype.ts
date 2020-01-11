import { DataType } from '../definitions';

export abstract class Partitioner<Meta extends Record<string, DataType>> {
  /**
   * get the last file path
   * @param paths files in the output directory
   * @return the path to the last file
   */
  public abstract getLast(paths: string[]): string;

  /**
   * get the path for the output csv
   * @param meta metadata of an entry
   * @return the absolute path to the file
   */
  public abstract getPath(meta: Meta): string;
}
