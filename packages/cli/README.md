# @shenganlee/easy-code-cli

The easy-code command-line interface.

```bash
# one-off
npx @shenganlee/easy-code-cli doctor

# project-local
pnpm add -D @shenganlee/easy-code-cli
pnpm exec easy-code doctor
```

Do not run `npx easy-code`: that name belongs to an unrelated package published in 2018.

## Commands

### `easy-code doctor`

Prints the CLI version, Node.js runtime, platform, working directory, loaded config file, plugins, and log level.

```bash
easy-code doctor
easy-code doctor --json
easy-code doctor --cwd ./packages/my-tool
```

## Configuration

The CLI looks for `easy-code.config.ts`, `.mts`, `.cts`, `.js`, `.mjs`, `.cjs`, or `.json` in the working directory.

```ts
import { defineConfig } from '@shenganlee/easy-code-core'

export default defineConfig({
  plugins: [],
  logLevel: 'info',
})
```

## Requirements

Node.js `^22.23.4 || ^24.11.0 || ^26.0.0`.

## License

MIT
