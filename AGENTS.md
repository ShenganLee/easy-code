# Repository guidance

- Package manager: pnpm 12.15 workspace. Node.js `^22.23.4 || ^24.11.0 || ^26.0.0`.
- Run `pnpm check` before proposing a PR. It covers Biome, TypeScript, build, unit/e2e tests, type tests, tree-shaking markers, size budgets, and pack contents.
- Keep documentation in sync with the project. When you change package names, commands, configuration, release flow, or public behavior, update all affected docs in the same change: `README.md`, `CONTRIBUTING.md`, `RELEASING.md`, `DESIGN.md`, `docs/tag-conventions.md`, package READMEs, and Changesets changelogs. Documentation must not lag behind the code.
- `@shenganlee/easy-code-core` stays platform-neutral. Do not add `node:*`, `process`, `Buffer`, `fs`, or `child_process` there; Node-specific code belongs in `@shenganlee/easy-code-cli` (or a future kit package).
- Library packages are ESM-only with `sideEffects: false` and explicit subpath exports. Do not add runtime TypeScript path aliases, `#imports`, top-level side effects, or top-level await to library entries.
- Use `workspace:^` for internal dependencies. Do not add TypeScript `paths` that point at workspace source.
- User-facing changes need a changeset (`pnpm changeset`); no-release changes can use `pnpm changeset --empty`.
- Commits need a DCO sign-off (`git commit -s`).
- Never advertise `npx easy-code`; that name belongs to an unrelated package. Use `npx @shenganlee/easy-code-cli`.
- Release through Changesets and npm trusted publishing. Do not add long-lived npm tokens.
