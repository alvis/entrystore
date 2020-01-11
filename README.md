# ![Logo](logo.svg)

<div align="center">

_A universal simple interface for storing data on different storage options_

•   [Usage](#usage)   •   [About](#about)   •

</div>

#### Highlights

**One unified interface**, entrystore allows you to manage data with

- **multiple data types support** such as CSV and SQLite
- **flexible storage** such as local disk

## Usage

```ts
/** data structure */
interface Entry {
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

## About

### License

Copyright © 2020, [Alvis Tang](https://github.com/alvis). Released under the [MIT License](LICENSE).
