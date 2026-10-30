type EnumLike = Record<string, unknown>

type EnumKey<T extends EnumLike> = Extract<keyof T, string>

type EnumValue<T extends EnumLike> = T[EnumKey<T>]

type EnumEntry<T extends EnumLike> = readonly [EnumKey<T>, EnumValue<T>]

interface ParseOptions {
  /** Throw a `TypeError` instead of returning `undefined` for unknown input. */
  strict?: boolean
}

function isCanonicalNumericKey(key: string): boolean {
  const numeric = Number(key)
  return Number.isFinite(numeric) && String(numeric) === key
}

/**
 * TypeScript numeric enums add reverse mappings such as `{ 0: 'Admin' }` next
 * to the declared members. They are enumerable but are not real members.
 */
function isReverseEntry(source: EnumLike, key: string): boolean {
  const value = source[key]
  return isCanonicalNumericKey(key) && typeof value === 'string' && source[value] === Number(key)
}

function readEntries<T extends EnumLike>(source: Readonly<T>): EnumEntry<T>[] {
  const record: EnumLike = source
  const entries: EnumEntry<T>[] = []

  for (const key of Object.keys(record)) {
    if (isReverseEntry(record, key)) continue
    entries.push([key as EnumKey<T>, record[key] as EnumValue<T>])
  }

  return entries
}

/**
 * A typed view over a TypeScript enum or an `as const` enum-like object.
 * Values may be of any type.
 *
 * ```ts
 * const Role = new EasyEnum({ Admin: 'admin', User: 'user' })
 *
 * Role.keys() // ['Admin', 'User']
 * Role.values() // ['admin', 'user']
 * Role.parse('admin') // 'Admin'
 * ```
 */
export class EasyEnum<const T extends EnumLike> {
  /** A frozen shallow copy of the definition passed to the constructor. */
  readonly definition: Readonly<T>

  constructor(definition: T) {
    this.definition = Object.freeze({ ...definition })
  }

  /** Declared keys, excluding numeric-enum reverse mappings. */
  keys(): EnumKey<T>[] {
    return readEntries(this.definition).map(([key]) => key)
  }

  /** Declared values, excluding numeric-enum reverse mappings. */
  values(): EnumValue<T>[] {
    return readEntries(this.definition).map(([, value]) => value)
  }

  /** Declared `[key, value]` pairs in declaration order. */
  entries(): EnumEntry<T>[] {
    return readEntries(this.definition)
  }

  /**
   * Returns the key whose value matches `value`, or `undefined`.
   *
   * When several keys share a value, the first declared key wins.
   */
  keyOf(value: unknown): EnumKey<T> | undefined {
    for (const [key, entryValue] of readEntries(this.definition)) {
      if (entryValue === value) return key
    }

    return undefined
  }

  /** Returns whether `value` is a declared member value. */
  has(value: unknown): value is EnumValue<T> {
    return this.keyOf(value) !== undefined
  }

  /**
   * Maps an unknown input to a key. Keys are matched before values, so
   * `parse('Admin')` and `parse('admin')` both return `'Admin'` for
   * `{ Admin: 'admin' }`.
   *
   * Returns `undefined` for unknown input unless `options.strict` is `true`,
   * in which case it throws a `TypeError`.
   */
  parse(input: unknown, options: ParseOptions = {}): EnumKey<T> | undefined {
    const entries = readEntries(this.definition)

    if (typeof input === 'string') {
      for (const [key] of entries) {
        if (key === input) return key
      }
    }

    for (const [key, value] of entries) {
      if (value === input) return key
    }

    if (options.strict === true) {
      throw new TypeError(`Unknown enum member: ${String(input)}`)
    }

    return undefined
  }
}
