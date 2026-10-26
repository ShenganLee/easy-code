# Tag conventions

Release tags drive `.github/workflows/release.yml`. The tag both selects the package(s) and must match the version in `package.json`.

## Two release groups

| Group               | Packages                                                  | Tag format         | Publishes                                    |
| ------------------- | --------------------------------------------------------- | ------------------ | -------------------------------------------- |
| Fixed core group    | `@shenganlee/easy-code-core`, `@shenganlee/easy-code-cli` | `v<version>`       | Both packages, in fixed order: core then cli |
| Independent package | `@shenganlee/easy-code-<dir>`                             | `<dir>-v<version>` | Only `packages/<dir>`                        |

The independent form maps the tag prefix to the directory under `packages/`:

```text
kit-v0.3.0              → packages/kit              → @shenganlee/easy-code-kit@0.3.0
plugin-foo-v0.1.0       → packages/plugin-foo       → @shenganlee/easy-code-plugin-foo@0.1.0
```

Package directories and names must follow the convention `packages/<dir>` and `@shenganlee/easy-code-<dir>`.

## Examples

### Core + cli together

```bash
git tag -a v0.1.1 -m "v0.1.1"
git push origin v0.1.1
```

This is the only valid tag form while core and cli are in the Changesets `fixed` group.

### One independent package

```bash
git tag -a plugin-foo-v0.1.0 -m "plugin-foo v0.1.0"
git push origin plugin-foo-v0.1.0
```

Only `packages/plugin-foo` is published. Core and cli are not touched.

### Prerelease

```bash
git tag -a v0.1.1-next.0 -m "v0.1.1-next.0"
git push origin v0.1.1-next.0

git tag -a plugin-foo-v0.1.0-beta.1 -m "plugin-foo v0.1.0-beta.1"
git push origin plugin-foo-v0.1.0-beta.1
```

A version containing `-` is published with the `next` dist-tag and marked as a prerelease on GitHub. `latest` stays on the stable line.

## Rules

1. **Tag version must equal the package version.** `v0.1.1` requires every fixed-group package to be `0.1.1`; `plugin-foo-v0.1.0` requires `packages/plugin-foo/package.json` to be `0.1.0`.
2. **Use annotated tags.** `git tag -a <tag> -m "<message>"`. Tags are release records, not throwaway labels.
3. **Never move or reuse a tag.** If a release is wrong, publish a new patch version and a new tag. Do not force-push tags.
4. **Do not use `core-v*` or `cli-v*` while the fixed group is active.** The workflow rejects them. Release core and cli together with `v*`.
5. **Independent tags publish only their package.** A plugin that depends on a new core version still needs core published first; tags do not enforce cross-package order. Prefer `peerDependencies` on core for plugins, and publish core+cli before the plugin whenever the plugin's core range points at a new core version.
6. **One Version PR can bump several packages.** Tag each release group separately. Packages that are bumped but not tagged remain unpublished; this is expected for independent releases.
7. **A new package needs its own bootstrap.** Publish the first version manually, configure its npm trusted publisher (`release.yml`, environment `npm-release`, allow npm publish), then use tags. The first OIDC publish must be a new version within 2 days of configuring the publisher.
8. **Version PRs are still required.** Merge the `Version` workflow's Version Packages PR before tagging the resulting commit.

## If core and cli must release independently

The fixed group is a deliberate compatibility choice. To release core or cli alone:

1. Remove `["@shenganlee/easy-code-core", "@shenganlee/easy-code-cli"]` from `fixed` in `.changeset/config.json`.
2. Remove the `core`/`cli` guard in the `Resolve release target` step of `release.yml`.
3. Use `core-v<version>` and `cli-v<version>` tags.
4. Manage compatibility with `workspace:^` / peer ranges and accept the version matrix.

Do not do this until independent releases are a real requirement.

## Quick checklist

- [ ] Version Packages PR merged
- [ ] `package.json` version(s) match the intended tag
- [ ] Tag is annotated and created on `main`
- [ ] Tag not used before
- [ ] For a new package: manual first publish and trusted publisher configured
- [ ] `git push origin <tag>`
- [ ] Release workflow publishes only the intended package(s)
