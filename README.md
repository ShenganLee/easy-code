# easy-code

An open-source TypeScript toolkit for developer productivity.

> Status: Phase 0. The first release is `0.1.0`; APIs may change before `1.0`.

## Packages

| Package                                       | Description                                                                                                |
| --------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| [`@shenganlee/easy-code-core`](packages/core) | Platform-neutral types, pure helpers, error model, and plugin/config contracts. Zero runtime dependencies. |
| [`@shenganlee/easy-code-cli`](packages/cli)   | The `easy-code` command-line interface.                                                                    |

Planned but not published yet: `@shenganlee/easy-code-kit` (Node APIs) and `@shenganlee/easy-code-plugin-*`.

## Quick start

```bash
# one-off
npx @shenganlee/easy-code-cli doctor

# project-local
pnpm add -D @shenganlee/easy-code-cli
pnpm exec easy-code doctor
```

Do **not** run `npx easy-code`: that name belongs to an unrelated package published in 2018.

Library usage:

```ts
import { defineConfig, definePlugin, createPluginRegistry } from '@shenganlee/easy-code-core'

export default defineConfig({
  plugins: ['@shenganlee/easy-code-plugin-example'],
  logLevel: 'info',
})

const registry = createPluginRegistry()
registry.register(
  definePlugin({
    name: 'example',
    setup(context) {
      console.log(context.cwd)
    },
  }),
)
```

## Requirements

- Node.js `^22.23.4 || ^24.11.0 || ^26.0.0`
- pnpm `>=12.15.0` for development

## npm authentication

No project `.npmrc` is committed. For the first manual publish, log in locally:

```bash
npm login --registry=https://registry.npmjs.org/
npm whoami --registry=https://registry.npmjs.org/
```

`npm login` writes credentials to your user-level `~/.npmrc`. If your global registry is a mirror, add the scoped registry there too, never in the repository:

```ini
@shenganlee:registry=https://registry.npmjs.org/
```

Never commit tokens. CI publishing uses npm trusted publishing (OIDC) and does not need `NPM_TOKEN`.

## Development

```bash
corepack use pnpm@12.15.0   # or: npm i -g pnpm@12.15.0
pnpm install
pnpm check
```

Useful commands:

- `pnpm dev` — build packages in watch mode
- `pnpm build` — build all packages
- `pnpm test` — unit and e2e tests
- `pnpm typecheck` — TypeScript checks
- `pnpm lint` — Biome check
- `pnpm check` — the full local gate

## Tree shaking

`@shenganlee/easy-code-core` is ESM-only with `sideEffects: false` and explicit subpath exports. CI proves the claim with a consumer marker test, `publint`, `attw`, and a size budget. See [DESIGN.md](DESIGN.md) for the full contract.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Commits must be signed off (`git commit -s`).

## Releasing

Maintainers: see [RELEASING.md](RELEASING.md) and [docs/tag-conventions.md](docs/tag-conventions.md). Publishing is triggered by Git tags and uses npm trusted publishing (OIDC).

## Security

See [SECURITY.md](SECURITY.md). Please report vulnerabilities through GitHub private vulnerability reporting.

## License

MIT
