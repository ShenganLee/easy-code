import { expectTypeOf, it } from 'vitest'
import { EasyEnum } from './index.js'

const ROLE = new EasyEnum({ Admin: 'admin', User: 'user' })

it('preserves literal keys and values', () => {
  expectTypeOf(ROLE.definition).toEqualTypeOf<
    Readonly<{ readonly Admin: 'admin'; readonly User: 'user' }>
  >()
  expectTypeOf(ROLE.keys()).toEqualTypeOf<('Admin' | 'User')[]>()
  expectTypeOf(ROLE.values()).toEqualTypeOf<('admin' | 'user')[]>()
  expectTypeOf(ROLE.entries()).toEqualTypeOf<(readonly ['Admin' | 'User', 'admin' | 'user'])[]>()
  expectTypeOf(ROLE.keyOf('admin')).toEqualTypeOf<'Admin' | 'User' | undefined>()
  expectTypeOf(ROLE.parse('admin')).toEqualTypeOf<'Admin' | 'User' | undefined>()
})

it('accepts values of any type', () => {
  const marker = { kind: 'marker' } as const
  const mixed = new EasyEnum({ Enabled: true, Marker: marker, None: null })

  expectTypeOf(mixed.values()).toEqualTypeOf<(true | typeof marker | null)[]>()
  expectTypeOf(mixed.keyOf(true)).toEqualTypeOf<'Enabled' | 'Marker' | 'None' | undefined>()
  expectTypeOf(mixed.has(null)).toBeBoolean()
})

it('narrows unknown values', () => {
  const input: unknown = 'admin'

  if (ROLE.has(input)) {
    expectTypeOf(input).toEqualTypeOf<'admin' | 'user'>()
  }
})
