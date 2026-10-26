# @shenganlee/easy-code-core

Platform-neutral core primitives and contracts for easy-code.

- Zero runtime dependencies.
- ESM-only, `sideEffects: false`, tree-shakeable subpath exports.
- No Node.js APIs: `fs`, `process`, `Buffer`, and `child_process` belong in the CLI or a future Node package.

```ts
import { defineConfig, definePlugin, createPluginRegistry } from '@shenganlee/easy-code-core'

export default defineConfig({
  plugins: ['@shenganlee/easy-code-plugin-example'],
  logLevel: 'info',
})

export const plugin = definePlugin({
  name: 'example',
  setup(context) {
    console.log(context.cwd)
  },
})

const registry = createPluginRegistry()
registry.register(plugin)
```

## Requirements

Node.js `^22.23.4 || ^24.11.0 || ^26.0.0`.

## License

MIT
