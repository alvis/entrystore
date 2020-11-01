/*
 *                            *** MIT LICENSE ***
 * -------------------------------------------------------------------------
 * This code may be modified and distributed under the MIT license.
 * See the LICENSE file for details.
 * -------------------------------------------------------------------------
 *
 * @summary   A shared schema test
 *
 * @author    Alvis HT Tang <alvis@hilbert.space>
 * @license   MIT
 * @copyright Copyright (c) 2020 - All Rights Reserved.
 * -------------------------------------------------------------------------
 */

import { UnsupportedTypeError } from '#error';

import type { GenericEntry, GenericTypeIdentifier, TypeMeta } from '#types';

/**
 * generate type meta with defaults
 * @param mark a type identifier
 * @param options type meta override
 * @returns a type meta in its full form
 */
export function meta(
  type: GenericTypeIdentifier,
  options?: Partial<Omit<TypeMeta, 'type'>>,
): TypeMeta {
  const { isList, isNullable } = {
    isList: false,
    isNullable: false,
    ...options,
  };

  return { type, isList, isNullable };
}

/**
 * perform tests on schema transformation
 * @param hydrate a function that converts a supported value to a the store natively supported format
 * @param dehydrate a function that converts a natively stored value back to its original form
 */
export function testSchema(
  hydrate: (value: GenericEntry[keyof GenericEntry]) => any,
  dehydrate: (type: TypeMeta, value: any) => GenericEntry[keyof GenericEntry],
  maps: Array<{
    meta: TypeMeta;
    original: GenericEntry[keyof GenericEntry];
    hydrated: any;
  }>,
): void {
  describe('schema', () => {
    it('hydrates supported data into the natively supported form', () => {
      for (const { original, hydrated } of maps) {
        expect(hydrate(original)).toEqual(hydrated);
      }

      expect(
        // @ts-expect-error
        () => hydrate({ unsupported: new Error() }),
      ).toThrow(UnsupportedTypeError);
    });

    it('dehydrates a content stored in the native form back to its original form', () => {
      for (const { meta, original, hydrated } of maps) {
        expect(dehydrate(meta, hydrated)).toEqual(original);
      }

      expect(
        // @ts-expect-error
        () => dehydrate('UNSUPPORTED'),
      ).toThrow(UnsupportedTypeError);
    });
  });
}
