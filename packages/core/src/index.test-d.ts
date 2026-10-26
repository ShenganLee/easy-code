import { expectTypeOf, it } from 'vitest'
import { defineConfig, definePlugin, type EasyCodeConfig, type EasyCodePlugin } from './index.js'

it('infers the config shape', () => {
  const config = defineConfig({ plugins: ['alpha'], logLevel: 'info' })

  expectTypeOf(config).toEqualTypeOf<{ plugins: string[]; logLevel: 'info' }>()
  expectTypeOf(config).toExtend<EasyCodeConfig>()
})

it('infers the plugin shape', () => {
  const plugin = definePlugin({
    name: 'alpha',
    setup: () => {},
  })

  expectTypeOf(plugin).toExtend<EasyCodePlugin>()
})
