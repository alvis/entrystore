/*
 *                            *** MIT LICENSE ***
 * -------------------------------------------------------------------------
 * This code may be modified and distributed under the MIT license.
 * See the LICENSE file for details.
 * -------------------------------------------------------------------------
 *
 * @summary   Tests on schema
 *
 * @author    Alvis HT Tang <alvis@hilbert.space>
 * @license   MIT
 * @copyright Copyright (c) 2020 - All Rights Reserved.
 * -------------------------------------------------------------------------
 */

import { URL } from 'url';

import {
  NonCompliantKeyError,
  SchemaMismatchedError,
  UnsupportedTypeError,
  TypeUndeterminedError,
  ValidationError,
} from '#error';
import {
  decodeSchema,
  encodeSchema,
  ensureKeyCompliant,
  ensureFieldCompliant,
  ensureSchemaAgreed,
  ENTRY,
  FIELD,
  getSchemaFromPrototype,
  inferTypeMapFromEntry,
  validate,
} from '#schema';
import { GenericEntry, SupportedData, TypeIdentifier, TypeMap } from '#types';

@ENTRY({ key: 'number' })
class Entry extends GenericEntry {
  @FIELD()
  public boolean!: boolean;
  @FIELD()
  public number!: number;
  @FIELD()
  public string!: string;
  @FIELD({ type: Date })
  public date!: Date;
  @FIELD({ type: URL })
  public url!: URL;
  @FIELD({ type: [URL] })
  public list!: URL[];
}

const schema = getSchemaFromPrototype(Entry);

const exampleEntry = {
  boolean: false,
  number: 0,
  string: 'string',
  date: new Date('2000-01-01T00:00:00z'),
  url: new URL('https://link'),
  list: [new URL('https://link1'), new URL('https://link2')],
};

const encodedTypeMap: Record<string, TypeIdentifier> = {
  boolean: 'Boolean',
  number: '*Number',
  string: 'String',
  date: 'Date',
  url: 'URL',
  list: '[URL]',
};

const decodedTypeMap: TypeMap = {
  boolean: { isList: false, type: 'Boolean' },
  number: { isList: false, type: 'Number' },
  string: { isList: false, type: 'String' },
  date: { isList: false, type: 'Date' },
  url: { isList: false, type: 'URL' },
  list: { isList: true, type: 'URL' },
};

describe('fn:decodeSchema', () => {
  it('dehydrates a schema from a simple JSON', () => {
    expect(decodeSchema(encodedTypeMap)).toEqual(schema);
  });
});

describe('fn:encodeSchema', () => {
  it('hydrates a schema to a simple JSON', () => {
    expect(encodeSchema(schema)).toEqual(encodedTypeMap);
  });
});

describe('fn:ensureKeyCompliant', () => {
  it('allows compliant key name to pass', () => {
    expect(() => ensureKeyCompliant('key')).not.toThrow();
  });

  it('throws an error for any non-alphapetic keys passed', () => {
    expect(() => ensureKeyCompliant(Symbol('key'))).toThrow(
      NonCompliantKeyError,
    );
    expect(() => ensureKeyCompliant('#escape')).toThrow(NonCompliantKeyError);
  });
});

describe('fn:ensureValueCompliant', () => {
  it('allows supported data to pass', () => {
    for (const supported of SupportedData) {
      expect(() => ensureFieldCompliant(supported)).not.toThrow();
    }
  });

  it('throws an error for any unsupported data passed', () => {
    expect(() => ensureFieldCompliant()).toThrow(TypeUndeterminedError);
    expect(() => ensureFieldCompliant({})).toThrow(TypeUndeterminedError);
  });
});

describe('ensureSchemaAgreed', () => {
  it('should pass if both schema are not supplied', async () => {
    expect(() => ensureSchemaAgreed()).not.toThrow();
    expect(() => ensureSchemaAgreed(schema)).not.toThrow();
    expect(() => ensureSchemaAgreed(undefined, schema)).not.toThrow();
  });

  it('should pass if both schema agree with each other', async () => {
    expect(() => ensureSchemaAgreed(schema, schema)).not.toThrow();
  });

  it('should throw an error when two schema do not agree', async () => {
    expect(() =>
      ensureSchemaAgreed(schema, {
        index: 'key',
        map: { key: { isList: false, type: 'Number' } },
      }),
    ).toThrow(SchemaMismatchedError);
  });
});

describe('getSchemaFromPrototype', () => {
  it('should return the right schema from an entry class', async () => {
    expect(getSchemaFromPrototype(Entry)).toEqual({
      index: 'number',
      map: decodedTypeMap,
    });
  });
});

describe('getTypeMapFromEntry', () => {
  it('should return the right schema from an entry', async () => {
    expect(inferTypeMapFromEntry(exampleEntry)).toEqual(decodedTypeMap);
  });

  it('should throw an error for entry containing an unsupported data type', async () => {
    const unsupported = { unsupported: new Error() };
    expect(
      // @ts-expect-error
      () => inferTypeMapFromEntry(unsupported),
    ).toThrow(UnsupportedTypeError);
  });

  it('should throw an error for entry containing an unsupported key', async () => {
    expect(() => inferTypeMapFromEntry({ '#escape': 'value' })).toThrow(
      NonCompliantKeyError,
    );
  });
});

describe('validate', () => {
  it('should pass when the entry is identical from the schema', async () => {
    expect(() => validate(schema.map, exampleEntry)).not.toThrow(
      ValidationError,
    );
  });

  it('should throw an error when the entry is different from the schema', async () => {
    expect(() =>
      validate(schema.map, {
        // should be a Date, but given a string here
        date: new Date().toISOString(),
      }),
    ).toThrow(ValidationError);
  });
});
