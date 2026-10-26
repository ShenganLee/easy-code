# Security Policy

## Supported versions

easy-code is pre-1.0. Only the latest minor release of each package receives security fixes.

| Version | Supported |
| ------- | --------- |
| 0.1.x   | Yes       |
| < 0.1   | No        |

## Reporting a vulnerability

Please **do not** open a public issue for a security problem.

Use GitHub's private vulnerability reporting:

1. Open the repository's **Security** tab.
2. Choose **Report a vulnerability**.
3. Include affected package/version, reproduction steps, impact, and any suggested fix.

If private reporting is unavailable, contact the maintainer privately through GitHub ([@ShenganLee](https://github.com/ShenganLee)).

## What to expect

- Acknowledgement within 3 business days.
- A triage decision and remediation plan within 7 business days.
- A coordinated disclosure target of 90 days, adjusted for severity and fix complexity.
- Credit in the advisory if you want it.

We do not run a paid bug bounty.

## Scope

In scope: the published `@shenganlee/easy-code-*` packages, their build/publish configuration, and the CLI's handling of configuration files and child processes.

Out of scope: vulnerabilities in third-party dependencies that are already publicly disclosed and fixed upstream; reports requiring a compromised maintainer account; social engineering.

## Supply chain

- npm trusted publishing with OIDC; no long-lived npm tokens in CI.
- `minimumReleaseAge` and `trustPolicy` are enabled in `pnpm-workspace.yaml`.
- Lockfiles are committed and CI installs with `--frozen-lockfile`.
- Third-party GitHub Actions are pinned to a major version or SHA, with `id-token: write` limited to the publish job.
