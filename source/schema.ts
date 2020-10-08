/*
 *                            *** MIT LICENSE ***
 * -------------------------------------------------------------------------
 * This code may be modified and distributed under the MIT license.
 * See the LICENSE file for details.
 * -------------------------------------------------------------------------
 *
 * @summary   Helpers for type reflection
 *
 * @author    Alvis HT Tang <alvis@hilbert.space>
 * @license   MIT
 * @copyright Copyright (c) 2020 - All Rights Reserved.
 * -------------------------------------------------------------------------
 */

import 'reflect-metadata';
import { isEqual, mapValues } from 'lodash';

import {
  NonCompliantKeyError,
  SchemaMismatchedError,
  TypeUndeterminedError,
  UnsupportedTypeError,
  ValidationError,
} from '#error';
import { GenericEntry, SupportedData } from '#types';

import type {
  GenericTypeIdentifier,
  Schema,
  SupportedDataType,
  TypeMap,
  TypeIdentifier,
} from '#types';

const INDEX = Symbol('Index');
const FIELDS = Symbol('Fields');

const keyRegExp = /^[a-zA-Z0-9_]+$/;

/**
 * declare a class as an entry prototype
 * @param options information about the prototype
 * @param options.key the index key
 * @returns a class decorator
 */
export const ENTRY = (options: { key: string }): ClassDecorator => {
  return (...[constructor]: Parameters<ClassDecorator>) => {
    const { key } = options;

    // store the index key
    Reflect.defineMetadata(INDEX, key, constructor.prototype);
  };
};

/**
 * declare a field in an entry prototype
 * @param options information about the field
 * @param options.type data type (Number, String etc.)
 * @returns a property decorator
 */
export const FIELD = (options?: {
  type?: SupportedDataType;
}): PropertyDecorator => {
  return (...[target, key]: Parameters<PropertyDecorator>) => {
    ensureKeyCompliant(key);

    const type =
      options?.type ??
      (Reflect.getMetadata('design:type', target, key) as
        | SupportedDataType
        | undefined);

    ensureFieldCompliant(type);

    // update the type map
    const fieldType: Record<string, SupportedDataType> = {
      ...((Reflect.getMetadata(FIELDS, target) as
        | Record<string, SupportedDataType>
        | undefined) ?? {}),
      [key]: type,
    };

    Reflect.defineMetadata(FIELDS, fieldType, target);
  };
};

/**
 * decode an embedded schema
 * @param encoded encoded schema
 * @returns the true schema
 */
export function decodeSchema(encoded: Record<string, string>): Schema {
  const [index] = Object.entries(encoded)
    .filter(([, value]) => /^\*/.exec(value))
    .map(([key]) => key);

  const map = mapValues(
    encoded,
    (value) => value.replace(/^\*/, '') as TypeIdentifier,
  );

  return { index, map };
}

/**
 * encode a schema
 * @param schema the true schema
 * @returns encoded schema
 */
export function encodeSchema(schema: Schema): Record<string, string> {
  return mapValues(
    schema.map,
    (type, field) => (field === schema.index ? '*' : '') + type,
  );
}

/**
 * ensure that the name of a field is safe
 * @param key field name
 */
export function ensureKeyCompliant(
  key: string | symbol,
): asserts key is string {
  if (typeof key !== 'string' || !keyRegExp.exec(key)) {
    throw new NonCompliantKeyError({ key });
  }
}

/**
 * ensure that the value of a field is a supported data type
 * @param type field data
 */
export function ensureFieldCompliant(
  type?: unknown,
): asserts type is SupportedDataType {
  if (
    !type ||
    // @ts-expect-error because `includes` expects a value having the same type as SupportedData
    !SupportedData.includes(type)
  ) {
    throw new TypeUndeterminedError();
  }
}

/**
 * ensure that both schema are equal
 * @param expected the expected schema
 * @param challenger the schema to be tested
 */
export function ensureSchemaAgreed<Target extends Schema>(
  expected?: Target,
  challenger?: Schema,
): asserts challenger is Target | undefined {
  if (expected && challenger && !isEqual(expected, challenger)) {
    throw new SchemaMismatchedError({
      expected,
      challenger,
    });
  }
}

/**
 * derive the schema from the entry prototype
 * @param prototype the entry prototype
 * @returns data schema
 */
export function getSchemaFromPrototype<
  Entry extends GenericEntry,
  IndexKey extends Extract<keyof Entry, string> = Extract<keyof Entry, string>
>(prototype: new (...args: any[]) => Entry): Schema<Entry, IndexKey> {
  const index = Reflect.getMetadata(INDEX, prototype.prototype) as IndexKey;
  const map = mapValues(
    Reflect.getMetadata(FIELDS, prototype.prototype) as Record<
      keyof Entry,
      SupportedDataType
    >,
    (value) => {
      ensureFieldCompliant(value);

      return value.name as TypeIdentifier;
    },
  );

  return { index, map };
}

/**
 * derive the type map from an example entry
 * @param entry an example entry
 * @returns data schema
 */
export function inferTypeMapFromEntry<Entry extends GenericEntry>(
  entry: Entry,
): TypeMap<Entry> {
  return mapValues(entry, (value, key) => {
    if (!keyRegExp.exec(key)) {
      throw new NonCompliantKeyError({ key });
    }

    return inferTypeByValue(value);
  });
}

/**
 * infer the value type
 * @param value the value to be inferred
 * @returns the identifier of the value type
 */
function inferTypeByValue(value: unknown): GenericTypeIdentifier {
  if (typeof value === 'boolean') {
    return 'Boolean';
  } else if (typeof value === 'number') {
    return 'Number';
  } else if (typeof value === 'string') {
    return 'String';
  } else if (value instanceof Date) {
    return 'Date';
  }

  throw new UnsupportedTypeError({ value });
}

/**
 * test if the supplied entry conforms to the schema
 * @param typeMap target type map
 * @param entry the entry to be tested
 */
export function validate(typeMap: TypeMap, entry: GenericEntry): void {
  const derived = inferTypeMapFromEntry(entry);

  if (!isEqual(typeMap, derived)) {
    throw new ValidationError({
      entry,
      typeMap: {
        expected: typeMap,
        derived,
      },
    });
  }
}
