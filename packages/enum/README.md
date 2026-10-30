# @shenganlee/easy-code-enum

Zero-dependency, type-safe enum helper. The package exports a single `EasyEnum` class that wraps a TypeScript enum or an `as const` enum-like object.

- Member values may be any type. `keyOf`, `has`, and `parse` compare values with `===`, so object values match by reference.
- `keys`, `values`, and `entries` skip numeric-enum reverse mappings.
- The constructor takes a frozen snapshot, so later mutations cannot change the instance.
- ESM-only, `sideEffects: false`, and platform-neutral: no Node.js APIs.

```ts
import { EasyEnum } from '@shenganlee/easy-code-enum'

const Role = new EasyEnum({
  Admin: 'admin',
  User: 'user',
})

Role.keys() // ['Admin', 'User']
Role.values() // ['admin', 'user']
Role.entries() // [['Admin', 'admin'], ['User', 'user']]
Role.keyOf('admin') // 'Admin'
Role.has('admin') // true
Role.parse('Admin') // 'Admin'
Role.parse('admin') // 'Admin'
Role.parse('guest') // undefined
Role.parse('guest', { strict: true }) // throws TypeError
```

TypeScript numeric enums work too; their generated reverse mappings (`{ 0: 'Admin' }`) are ignored:

```ts
enum Level {
  Low = 0,
  High = 1,
}

const levels = new EasyEnum(Level)

levels.values() // [0, 1]
levels.parse(1) // 'High'
```

## API

| Member                     | Description                                                            |
| -------------------------- | ---------------------------------------------------------------------- |
| `new EasyEnum(definition)` | Freezes a shallow copy of the definition and infers its literal types. |
| `definition`               | The frozen `Readonly` snapshot passed to the constructor.              |
| `keys()`                   | Declared keys, excluding numeric-enum reverse mappings.                |
| `values()`                 | Declared values, excluding numeric-enum reverse mappings.              |
| `entries()`                | Declared `[key, value]` pairs in declaration order.                    |
| `keyOf(value)`             | Key for a member value; the first declared key wins on duplicates.     |
| `has(value)`               | Type guard for declared member values.                                 |
| `parse(input, options?)`   | Maps a key or value to a key; returns `undefined` or throws on a miss. |

`parse` accepts `{ strict?: boolean }` as its second argument.

## Requirements

Node.js `^22.23.4 || ^24.11.0 || ^26.0.0`.

## License

MIT
