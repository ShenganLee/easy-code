import { fileURLToPath } from 'node:url'
import { build } from 'esbuild'

const root = fileURLToPath(new URL('..', import.meta.url))

const cases = [
  {
    name: 'core: definePlugin only',
    code: `import { definePlugin } from '@shengan/easy-code-core'; console.log(definePlugin)`,
    forbidden: ['createLogger', 'createPluginRegistry'],
  },
  {
    name: 'core: defineConfig only',
    code: `import { defineConfig } from '@shengan/easy-code-core'; console.log(defineConfig)`,
    forbidden: ['createLogger', 'createPluginRegistry'],
  },
  {
    name: 'core: createLogger only',
    code: `import { createLogger } from '@shengan/easy-code-core'; console.log(createLogger)`,
    forbidden: ['createPluginRegistry'],
  },
]

for (const item of cases) {
  const result = await build({
    stdin: { contents: item.code, resolveDir: root, loader: 'ts' },
    bundle: true,
    write: false,
    format: 'esm',
    platform: 'node',
    treeShaking: true,
    minify: false,
    logLevel: 'silent',
    alias: {
      '@shengan/easy-code-core': `${root}/packages/core/dist/index.js`,
    },
  })

  const output = result.outputFiles[0].text
  for (const marker of item.forbidden) {
    if (output.includes(marker)) {
      throw new Error(`${item.name}: unused module leaked into bundle (${marker})`)
    }
  }
  console.log(`ok ${item.name} (${output.length} bytes)`)
}
