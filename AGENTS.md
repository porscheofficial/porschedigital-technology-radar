# Technology Radar Generator Monorepo

## Workspace layout

This repository is a **pnpm workspace monorepo**.

- `packages/techradar/` — the load-bearing Next.js framework package
- `packages/create-techradar/` — the scaffolder package skeleton
- Root — shared tooling, docs, workflows, Husky hooks, ADRs

## Where to work

- Framework code, harness sensors, markdown data, and Next.js routes live under
  `packages/techradar/`.
- Scaffolder code lives under `packages/create-techradar/`.
- Cross-cutting tooling stays at root: `biome.jsonc`, `.husky/`,
  `commitlint.config.js`, `.github/`, `docs/`, `AGENTS.md`.

Read the nearest package `AGENTS.md` before editing package code:

- `packages/techradar/AGENTS.md`
- `packages/create-techradar/AGENTS.md`

## Commands

### Root orchestration

```bash
pnpm run lint
pnpm run typecheck
pnpm run test
pnpm run check:arch
pnpm run check:sec
pnpm run check:quality
pnpm run check:a11y
pnpm run build
pnpm run check:build
```

### Package-specific

```bash
pnpm --filter @porscheofficial/porschedigital-technology-radar run dev
pnpm --filter @porscheofficial/porschedigital-technology-radar run build:data
pnpm --filter @porscheofficial/porschedigital-technology-radar run build
pnpm --filter @porscheofficial/create-techradar run build
```

## Steering harness

- Biome runs from the repo root and scans both packages.
- The full architecture/security/quality/a11y/build harness lives in
  `packages/techradar/` and is invoked from root via pnpm orchestration.
- `docs/HARNESS.md` must stay in sync with any harness or AGENTS changes.

### Root-vs-package script ownership

Not every script in the root `package.json` delegates per-package. The split
is intentional and tracks ownership:

- **Workspace-owned (root-only, no `pnpm -r` delegation)**: `lint`,
  `lint:fix`, `format` (Biome is a single-config tool by design — one pass
  covers both packages plus the workspace meta files like `AGENTS.md`,
  `docs/`, `.github/`, `commitlint.config.js`); `check:sec:deps`,
  `check:sec:secrets`, `check:sec:licenses` (whole-workspace lockfile,
  git-history and dependency-tree scans that would be wrong to run
  per-package).
- **Package-delegated (via `pnpm -r --if-present run …`)**: `test`,
  `typecheck`, `build`, `check:arch`, `check:quality`, `check:a11y`,
  `check:build`, and the package-local `check:sec:sanitize` arm.
  `typecheck` runs each package's own `tsc --noEmit` against its own
  `tsconfig.json` — TypeScript is per-package by design (each tsconfig
  declares its own `target`/`lib`/`jsx`), so there is no workspace-root
  `tsconfig.json`.
- **Hybrid**: `check:sec` runs `pnpm -r --if-present run check:sec` first
  (delegates `:sanitize` into `packages/techradar/`), then runs the three
  root-only `check:sec:{deps,secrets,licenses}` scans.

Adding a new script: if it operates on workspace-wide artifacts
(lockfile, git history, root config) keep it root-only; if it operates on
a package's own files it belongs in that package's `package.json` and
should be exposed at root only via `pnpm -r --if-present run …`.

## Git hooks

- **pre-commit**: lint-staged (Biome) + `check:sec:sanitize`
- **pre-push**: `pnpm run check:quality`

## Commits

Use conventional commits. When a scope is present, it must be one of:

- `techradar`
- `create-techradar`
- `deps`
- `release`

## Pitfalls

1. Package-local harness sensors assume the **package root as cwd**. Run them
   from `packages/techradar/` or via `pnpm --filter
   @porscheofficial/porschedigital-technology-radar ...`; do not invoke tools
   like dependency-cruiser directly from the repo root with stale paths.
2. `packages/techradar/src/components/Icons/`, `packages/techradar/public/og/`,
   `packages/techradar/data/{data,about}.json`, and package `dist/` folders are
   generated outputs.
3. Root scripts orchestrate package scripts; package-specific tasks like
   `build:data` intentionally require `pnpm --filter`.
