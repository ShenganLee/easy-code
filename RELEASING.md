# Releasing

Releases use Changesets v3 for versioning and changelogs, and npm trusted publishing (OIDC) for uploads. Publishing is triggered by pushing a tag. No `NPM_TOKEN` is used.

Tag forms:

- `v<version>` publishes the fixed core group: `@shenganlee/easy-code-core` and `@shenganlee/easy-code-cli`.
- `<dir>-v<version>` publishes only `packages/<dir>`, for example `kit-v0.3.0` or `plugin-foo-v0.1.0`.

See [docs/tag-conventions.md](docs/tag-conventions.md) for the full rules.

## One-time setup

1. Confirm the npm org `@shenganlee` is writable and the package names are available:
   - `@shenganlee/easy-code-core`
   - `@shenganlee/easy-code-cli`
2. Log in locally. No project `.npmrc` is committed; `npm login` writes the account token to `~/.npmrc`. If your global registry is a mirror, also set the scoped registry in `~/.npmrc`:

   ```bash
   npm login --registry=https://registry.npmjs.org/
   npm whoami --registry=https://registry.npmjs.org/
   npm config get registry
   ```

   ```ini
   # ~/.npmrc
   @shenganlee:registry=https://registry.npmjs.org/
   ```

   To use a token instead of interactive login, put it in your user-level `~/.npmrc`, never in the repository:

   ```ini
   //registry.npmjs.org/:_authToken=${NPM_TOKEN}
   ```

3. Publish `0.1.0` manually once per package (with 2FA). Trusted publishing cannot create a brand-new package; the package must exist first:

   ```bash
   pnpm install --frozen-lockfile
   pnpm build
   pnpm -r --filter './packages/*' publish \
     --registry=https://registry.npmjs.org/ \
     --access public \
     --no-git-checks
   ```

4. In each package's npm settings, add a trusted publisher:
   - GitHub owner: `ShenganLee`
   - Repository: `easy-code`
   - Workflow filename: `release.yml`
   - Environment: `npm-release`
   - Explicitly enable **npm publish** (new publishers default to stage-only).

   Complete the first OIDC publish within **2 days** of creating the trusted publisher, otherwise the configuration expires. The first OIDC publish must be a **new version** (for example `0.1.1`); publishing an already-published `0.1.0` is skipped and does not validate the configuration.

5. In GitHub repository settings:
   - Allow GitHub Actions to create and approve pull requests.
   - Create an `npm-release` environment. Restrict deployment branches and tags to `main` and `v*`. Add required reviewers only after there is a second maintainer.
   - Enable private vulnerability reporting.
   - Protect `main`: no force pushes, no deletion, require `verify` and `test` checks.

## Normal release

1. A feature PR includes a changeset (`pnpm changeset`) or an empty changeset (`pnpm changeset --empty`). Merge it to `main`.
2. The `Version` workflow (`.github/workflows/version.yml`) runs `select-mode`. If there are changesets, it opens or updates a **Version Packages** PR.
3. Merge the Version Packages PR after CI passes. The package versions and changelogs are now on `main`.
4. Create and push an annotated tag matching the package version. All packages are in a fixed version group, so one tag covers both:

   ```bash
   git checkout main
   git pull --ff-only
   git tag -a v0.1.1 -m "v0.1.1"
   git push origin v0.1.1
   ```

5. The tag push triggers `.github/workflows/release.yml`. It verifies the target package version(s) match the tag, builds, publishes only the target package(s) with OIDC and provenance, and creates a GitHub Release.

For an independent package, use its directory name as the tag prefix:

```bash
git tag -a plugin-foo-v0.1.0 -m "plugin-foo v0.1.0"
git push origin plugin-foo-v0.1.0
```

This publishes only `packages/plugin-foo`. Core and cli are not touched. If the plugin depends on a new core version, publish core+cli first with a `v*` tag; otherwise the plugin's published core range may point at an unpublished version. A new package must first be published manually and have its own trusted publisher configured; see the one-time setup above.

If the tag does not match the target package version, the workflow fails before publishing. Do not move or reuse a tag; create a new patch version instead.

## Manual versioning fallback

If you do not want the Version PR flow, run Changesets locally and tag the resulting commit:

```bash
pnpm changeset
pnpm changeset version
git add .
git commit -s -m "chore: release v0.1.1"
git push
git tag -a v0.1.1 -m "v0.1.1"
git push origin v0.1.1
```

## Prereleases

Version parts containing a hyphen (for example `v0.1.1-next.0` or `plugin-foo-v0.1.0-beta.1`) publish with the `next` dist-tag and are marked as prereleases on GitHub:

```bash
pnpm changeset pre enter next
pnpm changeset
pnpm changeset version
git add .
git commit -s -m "chore: release v0.1.1-next.0"
git push
git tag -a v0.1.1-next.0 -m "v0.1.1-next.0"
git push origin v0.1.1-next.0
```

Run `pnpm changeset pre exit` when the prerelease is done. Keep `latest` on a stable version.

## Failure and rollback

- Re-run the tag workflow. Already published versions are skipped; an existing GitHub Release is left alone.
- If a release is broken, deprecate the version and publish a patch. Do not reuse the tag.
- Deprecate a bad version: `npm deprecate @shenganlee/easy-code-core@<version> "reason"`.
- Move `latest` back: `npm dist-tag add @shenganlee/easy-code-core@<good-version> latest`.
- OIDC does not support unpublishing. Prefer deprecation plus a patch release.
