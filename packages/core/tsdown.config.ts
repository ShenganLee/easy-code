import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['src/index.ts', 'src/plugin.ts'],
  format: ['esm'],
  platform: 'neutral',
  target: 'es2023',
  fixedExtension: false,
  unbundle: true,
  dts: { generator: 'oxc' },
  clean: true,
  treeshake: true,
  sourcemap: true,
  publint: 'ci-only',
  attw: {
    enabled: 'ci-only',
    profile: 'esm-only',
    level: 'error',
  },
  exports: false,
})
