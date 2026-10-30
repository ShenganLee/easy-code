# Contributing

Thanks for helping improve easy-code.

## Development setup

```bash
npm i -g pnpm@12.15.0
pnpm install
pnpm check
```

`pnpm check` runs Biome, TypeScript, the build, unit/e2e tests, type tests, the tree-shaking marker test, the size budget, and a pack dry-run.

## Pull requests

- Keep changes focused; one problem per PR.
- Add or update tests for behavior changes.
- Add a changeset for user-facing changes:

  ```bash
  pnpm changeset
  ```

  For changes that should not publish (docs, CI, tooling), use `pnpm changeset --empty`.
- Before `1.0`, a breaking change is a `minor` changeset. A `major` changeset moves the package to `1.0.0`.
- Sign off every commit:

  ```bash
  git commit -s -m "feat: add doctor command"
  ```

  The sign-off certifies the Developer Certificate of Origin (DCO). We do not use a CLA.
- Update `README.md` or package READMEs when public behavior changes.

## Package boundaries

- `@shenganlee/easy-code-core` and `@shenganlee/easy-code-enum` stay platform-neutral: no `node:*`, `process`, `Buffer`, `fs`, or `child_process`.
- `@shenganlee/easy-code-cli` owns Node-specific behavior.
- Public API is the package `exports` map. Do not rely on deep imports into `dist`.
- Do not add runtime TypeScript path aliases or `#imports`; use relative imports with `.js` extensions and `workspace:^` dependencies.

## Code style

- Biome formats and lints the repository. Run `pnpm lint:fix`.
- TypeScript is strict; exported declarations must be explicit (`isolatedDeclarations`). Library packages also add `*.test-d.ts` type tests.
- Prefer small, named exports over large barrels. Avoid top-level side effects in library code.

## Release process

See [RELEASING.md](RELEASING.md). Releases are automated with Changesets and npm trusted publishing.
