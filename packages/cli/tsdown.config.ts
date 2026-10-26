import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['src/cli.ts'],
  format: ['esm'],
  platform: 'node',
  target: 'node22',
  fixedExtension: false,
  unbundle: false,
  dts: false,
  clean: true,
  treeshake: true,
  sourcemap: true,
  publint: 'ci-only',
  attw: false,
  exports: false,
})
