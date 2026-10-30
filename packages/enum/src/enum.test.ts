import { describe, expect, it } from 'vitest'
import { EasyEnum } from './index.js'

const createRole = () => new EasyEnum({ Admin: 'admin', User: 'user' })

const NUMERIC = new EasyEnum({
  A: 0,
  B: 1,
  0: 'A',
  1: 'B',
})

const NEGATIVE = new EasyEnum({
  A: -1,
  '-1': 'A',
})

describe('EasyEnum', () => {
  it('takes a frozen snapshot of the definition', () => {
    const definition = { Admin: 'admin' }
    const role = new EasyEnum(definition)

    definition.Admin = 'root'

    expect(role.definition.Admin).toBe('admin')
    expect(Object.isFrozen(role.definition)).toBe(true)
  })
})

describe('entries', () => {
  it('returns declared members in declaration order', () => {
    expect(createRole().entries()).toEqual([
      ['Admin', 'admin'],
      ['User', 'user'],
    ])
  })

  it('skips numeric enum reverse mappings', () => {
    expect(NUMERIC.entries()).toEqual([
      ['A', 0],
      ['B', 1],
    ])
    expect(NEGATIVE.entries()).toEqual([['A', -1]])
  })

  it('keeps numeric-looking keys that are not reverse mappings', () => {
    expect(new EasyEnum({ '0': 'zero' }).entries()).toEqual([['0', 'zero']])
    expect(new EasyEnum({ '0': 0 }).entries()).toEqual([['0', 0]])
    expect(new EasyEnum({ Infinity: 'infinity' }).entries()).toEqual([['Infinity', 'infinity']])
  })
})

it('accepts values of any type', () => {
  const marker = { kind: 'marker' }
  const mixed = new EasyEnum({ Enabled: true, Marker: marker, None: null, Any: undefined })

  expect(mixed.values()).toEqual([true, marker, null, undefined])
  expect(mixed.keyOf(true)).toBe('Enabled')
  expect(mixed.keyOf(marker)).toBe('Marker')
  expect(mixed.has(null)).toBe(true)
  expect(mixed.parse(false)).toBeUndefined()
})

describe('keys', () => {
  it('returns declared keys', () => {
    expect(createRole().keys()).toEqual(['Admin', 'User'])
    expect(NUMERIC.keys()).toEqual(['A', 'B'])
  })
})

describe('values', () => {
  it('returns declared values', () => {
    expect(createRole().values()).toEqual(['admin', 'user'])
    expect(NUMERIC.values()).toEqual([0, 1])
  })
})

describe('keyOf', () => {
  it('finds the key for a value', () => {
    expect(createRole().keyOf('admin')).toBe('Admin')
    expect(NUMERIC.keyOf(1)).toBe('B')
  })

  it('returns undefined for unknown values', () => {
    expect(createRole().keyOf('missing')).toBeUndefined()
  })

  it('returns the first key when values are duplicated', () => {
    const duplicate = new EasyEnum({ First: 'same', Second: 'same' })

    expect(duplicate.keyOf('same')).toBe('First')
  })
})

describe('has', () => {
  it('checks declared values', () => {
    const role = createRole()

    expect(role.has('admin')).toBe(true)
    expect(role.has('missing')).toBe(false)
    expect(NUMERIC.has(0)).toBe(true)
    expect(NUMERIC.has('A')).toBe(false)
  })
})

describe('parse', () => {
  it('matches keys before values', () => {
    const role = createRole()

    expect(role.parse('Admin')).toBe('Admin')
    expect(role.parse('admin')).toBe('Admin')
    expect(NUMERIC.parse('A')).toBe('A')
    expect(NUMERIC.parse(0)).toBe('A')
  })

  it('prefers an exact key when a value looks like another key', () => {
    const swapped = new EasyEnum({ A: 'B', B: 'A' })

    expect(swapped.parse('B')).toBe('B')
    expect(swapped.parse('A')).toBe('A')
  })

  it('returns undefined for unknown input by default', () => {
    const role = createRole()

    expect(role.parse('missing')).toBeUndefined()
    expect(role.parse(42)).toBeUndefined()
  })

  it('throws for unknown input in strict mode', () => {
    const role = createRole()

    expect(() => role.parse('missing', { strict: true })).toThrowError(
      'Unknown enum member: missing',
    )
    expect(() => role.parse(42, { strict: true })).toThrowError(TypeError)
  })
})
