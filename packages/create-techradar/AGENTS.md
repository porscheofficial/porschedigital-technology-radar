# `packages/create-techradar/` — Scaffolder Package

This package is the skeleton for `@porscheofficial/create-techradar`.

## Scope

- Keep this package tiny and dependency-light.
- PR #1 only establishes the package shape and buildable CLI skeleton.
- The real scaffolder flow lands in PR #2.

## Conventions

- Use standard Node CLI patterns.
- Build with `tsup`.
- Do not pull framework-only harness tooling into this package.
- Run package commands via:

```bash
pnpm --filter @porscheofficial/create-techradar run build
pnpm --filter @porscheofficial/create-techradar run test
```
