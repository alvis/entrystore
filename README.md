# ![Logo](logo.svg)

<div align="center">

_A universal simple interface for storing data on different storage options_

•   [API](#api)   •   [About](#about)   •

</div>

#### Highlights

**One unified interface**, entrystore allows you to manage data with

- **multiple data types support** such as CSV and SQLite
- **flexible storage** such as local disk

## TODO

- how to handle multiple entry types?

## Motivation

Every data backend has its advantages and disadvantages.
Depending of the size of dataset and usage scenario, some are more preferable then others.
For example, CSV is good for a small dataset or when data exchangeability is needed.
But, data size is not static. It often changes overtime, so does your usage scenario.

Greatest pain is what often an experienced engineer would face when data have to be migrated from one backend to another backend.
The pain it beyond just the transfer of data from one format to another format,
but also when every single line of code which touches the storage library.
Imagine you have to change every CSV usage to SQL...

With entrystore, the pain is minimal as you only need to change the backend configuration and that's it.
The interface for data manipulation is the same regardless the underlying backend.
The design philosophy of entrystore is similar to the famous data analysis and manipulation library [pandas](https://pandas.pydata.org) in python.
We handle all the underlying challenge on dealing with different backends while the user only needs to deal with the business logic.

## Usage

```ts
/** data structure */
@GenericEntry({ index: 'timestamp' })
class TimePoint extends GenericEntry<'timestamp'> {
  @Field({ type: Date })
  /** index key */
  timestamp: Date;
  @Field({ type: String })
  /** value of the entry */
  value: string;
}

// create a CSV store with a local device as the storage backend
const store = new EntryStore({
  backend: new CSV({
    // the index key of each index
    indexKey: 'timestamp',
    // where the data will be stored
    destination: new LocalDestination({
      // root directory where
      path: '/path/to/output',
    }),
    //
    partitioner: new YearMonthPartitioner({
      adapter: (index: string): Date => new Date(index),
    }),
  }),
  prototypes: [Entry],
});

// saving an entry
await store.put(TimePoint, ...points);

// getting an entry
const entry = await store.get(TimePoint, 'timestamp');

// getting the first, last etc.
const firstRecordTime = await store.getFirstKey(TimePoint);

// selective get
const timeseries = await store
  .select(Timepoint)
  .filter('timestamp', 'between', 'time1', 'time2');
  .filter('value', '>', 0)

```

```ts
/** data structure */
class Entry {
  /** index key */
  timestamp: Date;
  /** value of the entry */
  value: string;
}

// create a CSV store with a local device as the storage backend
const store = new CSVStore<Entry, 'timestamp'>({
  // the index key of each index
  indexKey: 'timestamp',
  // where the data will be stored
  destination: new LocalDestination({
    // root directory where
    path: '/path/to/output',
  }),
  //
  partitioner: new YearMonthPartitioner({
    adapter: (index: string): Date => new Date(index),
  }),
});

// get a single entry
const key = await store.firstKey;
const entry: Entry = await store.get(key);

// get a range of entries
const entries: Entry[] = await store.select({
  from: new Date('2000-01-01T00:00:00z'),
  to: new Date('2000-12-31T23:59:59z'),
});

// submit a single entry
await store.put(entry);

// submit entries by chunk
await store.put(...entries);
```

## Schema

#### Supported Data Type

A data type is identified with the following

- `Boolean` for any boolean data, i.e. `true` or `false`
- `Number` for any numberic data, e.g. `1`, `1.1`
- `String`
- `Date`
- `URL`
- `Embedded` for any nested data, e.g. `{"nested": true}`

**Note** There is no further type definition for any embdedded data.
It's equalvant to the `Record<string, unknown>` type in typescript.

#### Index

Any index is decorated with a `*` in front of a type identifier. e.g. `*Number`

#### Array Type

Any array data must be in a uniform type. Its schema identifier is in the form of `[<TypeIdentifier>]`. e.g. `[String]`

#### Nullable Type

Any non-index type can be nullable. In such case, its schema identifier is decorated with a `?` suffix. e.g. `Number?`

## API

### Class: CSVStore extends EntryStore

#### Constructor

#### Methods

All public methods are the same as those in EntryStore. [See below.](#abstract-class-entrystore)

### Class: SQLiteStore extends EntryStore

#### Constructor

▸ **new SQLiteStore(message: string, options?: XceptionOptions): SQLiteStore**

Create an EntryStore using SQLite as the backend.

#### Methods

All public methods are the same as those in EntryStore. [See below.](#abstract-class-entrystore)

### Abstract Class: EntryStore

▸ **new EntryStore(message: string, options?: XceptionOptions): Xception**

Create a custom error with a message and additional information to be embedded to the error.

#### Constructor

▸ **new EntryStore(message: string, options?: XceptionOptions): Xception**

Create a custom error with a message and additional information to be embedded to the error.

| Parameter            | Type     | Description                                                                                          |
| -------------------- | -------- | ---------------------------------------------------------------------------------------------------- |
| `message`            | string   | an error message for the error class                                                                 |
| `options.cause?`     | unknown  | an upstream error to be embedded to the new repacked error _(default: **`undefined`**)_              |
| `options.namespace?` | string   | an identifier of the component where the error occur _(default: **`undefined`**)_                    |
| `options.meta?`      | Object   | any context data you would like to embed to the error _(default: **`{}`**)_                          |
| `options.tags?`      | string[] | some associations of the error (e.g. user error) for selective logging purpose _(default: **`[]`**)_ |

#### Methods

▸ **get(key: Index): Promise<Entry | undefined>**

**Returns** a single entry that matches the key.

Get an entry by its key.

| Parameter | Type   | Description |
| --------- | ------ | ----------- |
| `key`     | string | entry key   |

▸ **put(...entries: Entry[]): Promise<void>**

**Returns** when the operation is finished.

Get an entry by its key.

| Parameter    | Type    | Description                                      |
| ------------ | ------- | ------------------------------------------------ |
| `...entries` | Entry[] | a list of entries to be put into the entry store |

#### Properties

| Name        | Type              | Description                  |
| ----------- | ----------------- | ---------------------------- |
| `fields`    | Promise<string[]> | list of fields in each entry |
| `first?`    | Promise<Entry>    | first entry                  |
| `firstKey?` | Promise<Index>    | first entry key              |
| `last?`     | Promise<Entry>    | last entry                   |
| `lastKey?`  | Promise<Index>    | last entry key               |

## Backend Comparison

#### CSVStore

PROS:

- It can be read by most libraries.

CONS

- Memory consumption could be huge if the incoming data is not all after the last entry.
  In this case, the store has to read the whole CSV partition and reorder the entries and write.
- No typing. There is no way to distinguish a number and a string.

## About

In a certain level, entrystore is similar to many [ORMs](https://en.wikipedia.org/wiki/Object–relational_mapping) libraries.

The main differentiation here is that entrystore does NOT ONLY support SQL backends, but also CSV, JSON, parquet and more.
You can even write your own backend adapter if none of the bundled adapters suits.

The aim of this library is to provide a way to access the benefits provided by each backend without the need to relearn the syntax to handle the backend.

### Comparison

|           |     EntryStore     |      TypeORM       |     Sequelize      |     Bookshelf      |
| --------- | :----------------: | :----------------: | :----------------: | :----------------: |
| SQLite    | :white_check_mark: | :white_check_mark: | :white_check_mark: | :white_check_mark: |
| MySQL     |   :construction:   | :white_check_mark: | :white_check_mark: | :white_check_mark: |
| PostSQL   |   :construction:   | :white_check_mark: | :white_check_mark: | :white_check_mark: |
| Parquet   | :white_check_mark: |        :x:         |        :x:         |        :x:         |
| CSV       | :white_check_mark: |        :x:         |        :x:         |        :x:         |
| JSON      | :white_check_mark: |        :x:         |        :x:         |        :x:         |
| **Other** |     :computer:     |        :x:         |        :x:         |        :x:         |

_**PRO TIP**_: If your backend is not on the list above, you can extend entrystore with your own adapter following the required [backend interface](#backend-interface) above.

### Related Projects

There is no need to waste time on converting different SQL formats if you happen to change from MySQL to Post

- [sequelize](https://github.com/sequelize/sequelize): maintain multi SQL dialects with ease with this popular ORM.
- [typeorm](https://github.com/typeorm/typeorm): use typescript metadata to maintain multi SQL dialects.
- [data-forge](https://github.com/data-forge/data-forge-ts): do data transformation similar to pandas and LINQ.

### License

Copyright © 2020, [Alvis Tang](https://github.com/alvis). Released under the [MIT License](LICENSE).
