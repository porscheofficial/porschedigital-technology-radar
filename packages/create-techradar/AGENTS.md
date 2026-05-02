# `packages/create-techradar/` — Scaffolder Package

This package ships `@porscheofficial/create-techradar`, the one-shot bootstrapper for new Porsche Digital Technology Radar projects.

## Scope

- Keep this package tiny and dependency-light: a single runtime dependency (`citty`) and Node built-ins only.
- This package does **not** own template content. The framework's `techradar init` subcommand owns the starter files; the scaffolder just orchestrates `<pm> install` → `<pm> exec techradar init` → `git init`.
- See `docs/decisions/0030-create-techradar-scaffolder-design.md` (workspace root) for the design contract.

## Layout

```
bin/create-techradar.ts   # citty CLI entry — built to dist/index.js
src/index.ts              # runCreateTechradar(options): pipeline orchestrator
src/registry.ts           # npm registry lookup (https + JSON parse)
src/packageManager.ts     # detect pnpm/yarn/bun/npm + emit install/exec commands
src/scaffold.ts           # target dir checks + package.json + README.md writers
src/runners.ts            # spawnSync wrappers for install / techradar init / git
src/logger.ts             # tiny stdout/stderr facade
src/errors.ts             # ScaffoldError (message + actionable fix)
src/*.test.ts             # node:test unit suites
```

## Conventions

- ESM only (`type: "module"` + `target: ES2022`).
- Local imports use the `.ts` extension so Node's built-in type stripping (≥22) and `tsc --noEmit` (`allowImportingTsExtensions: true`) both resolve them; tsup bundles via esbuild and rewrites everything into the single `dist/index.js` shipped to npm.
- Tests use `node --test` (no vitest, no jest, no extra runner). Cover **pure logic only** — registry parsing, package-manager detection, name derivation, file writers. Real installs and git operations are exercised manually before release, not in CI.
- Throw `ScaffoldError(message, fix, cause?)` for any user-actionable failure so the CLI prints a one-line cause + one-line fix and exits non-zero. `DEBUG=1` adds the stack.

## Commands

```bash
pnpm --filter @porscheofficial/create-techradar run typecheck
pnpm --filter @porscheofficial/create-techradar run test
pnpm --filter @porscheofficial/create-techradar run build
```

End-to-end smoke (against the locally built CLI, requires the framework to already be on the registry):

```bash
node packages/create-techradar/dist/index.js /tmp/my-radar
```
