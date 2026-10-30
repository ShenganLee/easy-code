import { fileURLToPath } from 'node:url'
import { build } from 'esbuild'

const root = fileURLToPath(new URL('..', import.meta.url))

const cases = [
  {
    name: 'core: definePlugin only',
    code: `import { definePlugin } from '@shenganlee/easy-code-core'; console.log(definePlugin)`,
    forbidden: ['createLogger', 'createPluginRegistry'],
  },
  {
    name: 'core: defineConfig only',
    code: `import { defineConfig } from '@shenganlee/easy-code-core'; console.log(defineConfig)`,
    forbidden: ['createLogger', 'createPluginRegistry'],
  },
  {
    name: 'core: createLogger only',
    code: `import { createLogger } from '@shenganlee/easy-code-core'; console.log(createLogger)`,
    forbidden: ['createPluginRegistry'],
  },
  {
    name: 'enum: bare import is side-effect free',
    code: `import '@shenganlee/easy-code-enum'`,
    forbidden: ['EasyEnum'],
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
      '@shenganlee/easy-code-core': `${root}/packages/core/dist/index.js`,
      '@shenganlee/easy-code-enum': `${root}/packages/enum/dist/index.js`,
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
