# ADR-0027 — Convert repo to a pnpm workspace monorepo with a `create-techradar` scaffolder

- Status: accepted
- Date: 2026-04-26

## Context

The project ships a single npm package
(`@porscheofficial/porschedigital-technology-radar`) whose
`bin/techradar.ts` CLI scaffolds and serves a consumer's radar via a
hidden `.techradar/` shadow workspace (see ADR-0021, ADR-0023, ADR-0024
for the architecture's load-bearing details). The on-ramp for a new
consumer today is two commands plus a separate package-name lookup:

```
npm install @porscheofficial/porschedigital-technology-radar
npx techradar init
```

Two recurring frictions have surfaced:

1. **Discovery and DX gap.** Modern dev-tool ecosystems (Vite, Astro,
   Next, Docusaurus) have normalised `npm create <name>@latest` as the
   first command a new user types. `npm create X` is sugar for
   `npx create-X`, with the `create-` prefix inserted **before** the
   package name (so `npm create @scope/foo` resolves to
   `@scope/create-foo`). Without a `create-*` package, our tool cannot
   participate in this ecosystem convention. New users must already
   know the framework's package name before they can scaffold — a
   classic chicken-and-egg adoption barrier.

2. **The framework package and a future scaffolder package have
   different release cadences and audiences.** The framework package
   evolves with Next.js, the radar UI, the build pipeline, the harness
   sensors, and the published CLI commands. A scaffolder is a tiny,
   dependency-light bootstrapper whose only job is to create a
   directory, install the framework, and call `techradar init`. They
   should not share a version number, a changelog, or a release
   cadence — but they must ship from the same repo so that breaking
   changes to the framework's `init` contract land atomically with the
   matching scaffolder update.

The repository is a single-package layout today (no
`pnpm-workspace.yaml`; one `package.json` at root publishing one
package). To add `@porscheofficial/create-techradar` cleanly, the repo
needs to become a workspace.

The other options were considered and rejected:

- **Separate repository for `create-techradar`.** Eliminates the need
  for workspace plumbing, but splits release coordination across two
  GitHub repos for changes that are inherently atomic (a change to
  `techradar init`'s flag surface and the scaffolder that calls it).
  Requires duplicating CI, ADR culture, and contribution guidelines.
  The coupling between the two packages is real and the cost of
  maintaining two repos exceeds the cost of adopting workspaces.

- **Stay single-package; embed scaffolding logic inside the framework
  package and document `npm install ... && npx techradar init` as the
  install path.** This is what we have today. It does not unlock
  `npm create`, which is the primary motivation. Rejected.

- **`npm` workspaces instead of `pnpm` workspaces.** Per ADR-0019 the
  project standardised on pnpm 10 via Corepack for disk efficiency
  and stricter peer-dep semantics. Reverting to npm workspaces for
  one feature would unwind that decision. pnpm workspaces are a
  drop-in fit on top of the existing pnpm install. Rejected.

- **Yarn / Bun workspaces.** Same reasoning as ADR-0019. Rejected.

- **Naming the scaffolder `@porscheofficial/create-radar`** so the
  user types `npm create @porscheofficial/radar`. Rejected: the binary
  shipped by the framework is already named `techradar`, and the
  `npm create @porscheofficial/techradar` → `npx techradar dev`
  sequence reads as one coherent tool. `radar` alone is generic
  (security radar, news radar, dating radar) and would create a
  permanent name mismatch with the binary. Brand consistency wins.

- **Naming the scaffolder `create-techradar`** (unscoped). Rejected:
  unscoped npm names in this space are exhausted or dormant
  (`tech-radar`, `technology-radar`, `techradar`, `tech-radar-generator`
  are all occupied — verified directly against the npm registry on
  2026-04-25). A scoped name avoids the dispute process and is the
  industry default for first-party org tools (see Backstage's
  `@backstage/create-app`, Astro's `@astrojs/...`, Vite's `@vitejs/...`).

## Decision

Convert the repository into a **pnpm 10 workspace monorepo** with two
publishable packages:

1. `packages/techradar/` — the existing framework package, name
   unchanged: `@porscheofficial/porschedigital-technology-radar`,
   version unchanged: `1.2.6`. Continues to publish from this
   directory; `bin/techradar.ts`, `data/`, `public/`, `scripts/`,
   `src/` and supporting config files all move under it.

2. `packages/create-techradar/` — a new scaffolder package, name
   `@porscheofficial/create-techradar`, starting at version `0.0.0`.
   Its `bin` is a single script that creates a directory, runs
   `npm init -y` (or the detected package manager equivalent),
   installs `@porscheofficial/porschedigital-technology-radar`, then
   shells out to `npx techradar init`. The interactive UX (prompts,
   starter selection, deploy-config opt-in) is the scaffolder's
   responsibility; the framework's `init` stays scriptable and
   non-interactive.

The repo root becomes a private, unpublished workspace package whose
sole purpose is to hold cross-cutting tooling and orchestrate the
two child packages.

### What changes

#### Layout

- All current top-level source moves to `packages/techradar/`:
  `bin/`, `data/`, `public/`, `scripts/`, `src/`, `next.config.js`,
  `next-env.d.ts`, plus the package's own `tsconfig.json`,
  `next.config.js`, `postcss.config.js`, `.markdownlint-cli2.jsonc`,
  `vitest.config.ts`, `linkinator.config.json`, `bundle-budget.json`,
  `.htmlvalidate.json`, `.jscpd.json`, `knip.json`, `tsup.config.ts`,
  `CHANGELOG.md`, and the package's own `README.md`. The git history
  is preserved via `git mv` (rename detection handles it).
- A new `packages/create-techradar/` is added with `bin/`, `src/`,
  `package.json`, `tsconfig.json`, `tsup.config.ts`, `README.md`,
  and an empty `CHANGELOG.md` (release-please populates it).
- `pnpm-workspace.yaml` is added at root with `packages: ["packages/*"]`.
- The repo-level `README.md` stays at root and becomes the lobby
  README that points at the framework package and the scaffolder.
- `LICENSE`, `SECURITY.md`, `AGENTS.md`, `CHANGELOG.md` (root-level
  monorepo changelog), `docs/`, `.github/`, `.husky/`, and the
  ADR directory stay at root.

#### Root `package.json`

Becomes private (`"private": true`), drops `"version"`, drops the
`bin`, `files`, `publishConfig`, `dependencies`, and most of the
`scripts` block. Retains:

- `"packageManager": "pnpm@10.29.2"` (per ADR-0019).
- `"engines": { "node": ">=22" }`.
- Cross-cutting devDependencies only: `@biomejs/biome`,
  `@commitlint/cli`, `@commitlint/config-conventional`, `husky`,
  `lint-staged`. Everything else moves to the package that uses it.
- A short `scripts` block that orchestrates: `lint` (Biome at root,
  scans both packages), `test` (`pnpm -r test`), `build`
  (`pnpm -r build`), `check:arch` / `check:sec` / `check:quality` /
  `check:a11y` / `check:build` (each `pnpm -r <name>`), and
  `prepare` (`husky || true`).
- `lint-staged` block stays at root.

#### `packages/techradar/package.json`

Keeps the published name (`@porscheofficial/porschedigital-technology-radar`),
keeps version `1.2.6`, keeps every current `dependencies` /
`devDependencies` entry, keeps the `bin`, `files`, `publishConfig`,
`engines`, `homepage`, `repository`, `bugs`, `keywords`, `author`,
`license`, `description` fields. Drops:

- `prepare` script (moved to root)
- `lint-staged` block (moved to root)
- The cross-cutting devDependencies that moved to root

The `repository` field gains `"directory": "packages/techradar"` so
the npmjs.com package page links to the correct subfolder of the
monorepo.

#### `packages/create-techradar/package.json`

```json
{
  "name": "@porscheofficial/create-techradar",
  "version": "0.0.0",
  "description": "Scaffold a new Porsche Digital Technology Radar in seconds.",
  "license": "Apache-2.0",
  "author": "Porsche Digital",
  "repository": {
    "type": "git",
    "url": "git+https://github.com/porscheofficial/porschedigital-technology-radar.git",
    "directory": "packages/create-techradar"
  },
  "bugs": { "url": "https://github.com/porscheofficial/porschedigital-technology-radar/issues" },
  "homepage": "https://github.com/porscheofficial/porschedigital-technology-radar/tree/main/packages/create-techradar",
  "engines": { "node": ">=22" },
  "type": "module",
  "bin": { "create-techradar": "dist/index.js" },
  "files": ["dist", "README.md"],
  "publishConfig": { "access": "public", "provenance": true }
}
```

#### `release-please-config.json`

Becomes multi-package:

```json
{
  "$schema": "https://raw.githubusercontent.com/googleapis/release-please/main/schemas/config.json",
  "separate-pull-requests": false,
  "plugins": ["node-workspace"],
  "packages": {
    "packages/techradar": {
      "package-name": "@porscheofficial/porschedigital-technology-radar",
      "release-type": "node",
      "include-component-in-tag": true,
      "changelog-path": "CHANGELOG.md",
      "bump-minor-pre-major": true,
      "changelog-sections": [ /* unchanged from current config */ ],
      "extra-files": []
    },
    "packages/create-techradar": {
      "package-name": "@porscheofficial/create-techradar",
      "release-type": "node",
      "include-component-in-tag": true,
      "changelog-path": "CHANGELOG.md",
      "bump-minor-pre-major": true,
      "changelog-sections": [ /* same set */ ],
      "extra-files": []
    }
  }
}
```

Three deliberate changes from the current single-package config:

- **`"include-component-in-tag": true`** (was `false`). Required for
  multi-package — release-please refuses to manage two packages that
  share the same tag namespace. Future tags become
  `@porscheofficial/porschedigital-technology-radar-v1.3.0` and
  `@porscheofficial/create-techradar-v0.1.0` instead of `v1.3.0`.
  Existing `v1.x.x` tags are not rewritten and remain valid as
  historical record.
- **`"separate-pull-requests": false`** — one release PR per push-to-main
  cycle covers both packages. Rejected the per-package PR mode as
  noisier for a 2-package repo where most non-trivial changes touch
  both packages anyway (e.g., a new `init --starter=X` flag in
  `techradar` lands together with the scaffolder's `--starter`
  option).
- **`"plugins": ["node-workspace"]`** — when `create-techradar` later
  declares a workspace dependency on `techradar` (it does not in the
  initial skeleton, but might for shared types or constants),
  release-please keeps the workspace-protocol version reference in
  sync at release time.

#### `.release-please-manifest.json`

```json
{
  "packages/techradar": "1.2.6",
  "packages/create-techradar": "0.0.0"
}
```

The first conventional commit scoped to `create-techradar` (e.g.
`feat(create-techradar): initial scaffolder`) bumps it to `0.1.0`
because `bump-minor-pre-major` is `true` for both packages.

#### `commitlint.config.js`

Adopt scopes so release-please can attribute commits to packages:

```
"scope-enum": [2, "always", ["techradar", "create-techradar", "deps", "release"]]
```

- `feat(techradar): ...` bumps the framework package only.
- `feat(create-techradar): ...` bumps the scaffolder only.
- `chore(deps): ...` does not bump anything (release-please ignores
  `chore` for version bumps regardless of scope).
- `chore(release): ...` is reserved for release-please's own commits.

This is a soft tightening — commits without a scope still pass the
type check; the scope-enum rule fires only when a scope is present.
That keeps cross-cutting commits like `doc: update HARNESS.md` legal.

#### `.github/workflows/release-please.yml`

The publish job needs to run twice — once per package — and
conditionally on each package's own `release_created` output:

```yaml
- if: ${{ steps.release.outputs['packages/techradar--release_created'] }}
  run: pnpm --filter @porscheofficial/porschedigital-technology-radar publish --no-git-checks --provenance
- if: ${{ steps.release.outputs['packages/create-techradar--release_created'] }}
  run: pnpm --filter @porscheofficial/create-techradar publish --no-git-checks --provenance
```

OIDC trusted publishing on npmjs.com is configured per package, so a
**second one-time setup step** is required: visit the
`@porscheofficial/create-techradar` package page on npmjs.com after
the first manual publish and add the GitHub Actions trusted-publisher
entry pointing at the same workflow. The framework package's existing
trusted-publisher entry is unchanged.

The `npm@11.5.1` pin and the `release-please-action` step itself are
unchanged from the current workflow.

#### Tooling split (hybrid)

Cross-cutting tools that benefit from a single source of truth stay at
root:

- **Biome** (`biome.jsonc`) — single config, scans
  `packages/techradar/src` and `packages/create-techradar/src`.
- **husky** (`.husky/`) — pre-commit and commit-msg hooks fire at
  repo level; lint-staged scopes the work to staged files which already
  resolves correctly across packages.
- **commitlint** (`commitlint.config.js`) — one config governs all
  commits in the repo.
- **OSV scanner** (`check:sec:deps`) — runs against the single root
  `pnpm-lock.yaml`, which by design covers every package's deps.
- **TruffleHog** (`check:sec:secrets`, `precommit:secrets`) —
  scans git history; package-agnostic.
- **license-checker** (`check:sec:licenses`) — runs against the root
  install graph, covers both packages' production deps in one shot.
  The `--excludePackages` literal needs to grow from one entry to
  two (both self-listings excluded).

Package-specific tools live inside the package that uses them:

- **dependency-cruiser**, **eslint** (architectural + sonar + a11y
  configs), **vitest**, **knip**, **jscpd**, **html-validate**,
  **linkinator**, **axe-core**, **markdownlint-cli2**, **cspell**,
  **bundle budget script**, **link checker**, **wikilink checker**,
  **doc coverage checker**, **OG image generator**, **build-data
  script** all live in `packages/techradar/`. They are too tightly
  coupled to the framework's source layout to share. The scaffolder
  is small enough that lint+test (Biome at root + vitest in package)
  is sufficient — it does not need the full harness.

This matches the precedent set by the harness ADRs (0006, 0007, 0008,
0009, 0010, 0014, 0015, 0016, 0018): the harness sensors live with
the code they protect.

#### Per-package commands

Each package keeps its own `scripts` block and is run via pnpm
filters from the root, e.g.:

```bash
pnpm --filter @porscheofficial/porschedigital-technology-radar dev
pnpm --filter @porscheofficial/porschedigital-technology-radar build
pnpm -r test
pnpm -r check:arch
```

The DoD (`pnpm run lint && pnpm run test && pnpm run check:arch &&
pnpm run check:sec && pnpm run check:quality && pnpm run check:a11y &&
pnpm run build`) survives unchanged at the repo level — each script
is now a `pnpm -r` orchestration that fans out across packages and
fails fast on any package failure.

### What does not change

- The published name `@porscheofficial/porschedigital-technology-radar`
  is unchanged. No breaking change for existing consumers.
- The `techradar` binary name and its sub-commands (`init`, `validate`,
  `serve`, `build`, `dev`) are unchanged.
- The shadow-workspace architecture (ADRs 0021, 0023, 0024) is
  unchanged. `bin/techradar.ts` continues to copy from
  `node_modules/@porscheofficial/porschedigital-technology-radar/`
  into `.techradar/`.
- The `npx techradar ...` happy path documented in the README
  continues to work without `create-techradar` — the scaffolder is
  additive, not a replacement.
- Existing ADRs (0001–0026) are not edited. Their command examples
  (`pnpm run ...`, `npx techradar ...`) remain accurate; the only
  invocation change is that running them from the repo root now
  fans out across packages, which is a superset of their previous
  semantics.
- The `docs/HARNESS.md` sensor inventory is unchanged in substance —
  every sensor still runs, just from inside `packages/techradar/`.
  The Harness Documentation Sync rule (root `AGENTS.md`) requires
  HARNESS.md to be updated in lockstep with this ADR's PR to reflect
  the new invocation paths.
- Husky's pre-commit secret scan continues to read **staged blob
  content**, not paths, so the move under `packages/techradar/` is
  transparent to it.

### Tag format break (one-time, deliberate)

Existing tags `v1.0.0` … `v1.2.6` remain in the repository as
historical record. The first release after this PR lands creates
`@porscheofficial/porschedigital-technology-radar-v1.2.7` (or higher,
depending on the conventional commits since `v1.2.6`). Any external
consumer that pins to the legacy `v*` tag pattern continues to resolve
the historical tags; new pins should target the namespaced format.

The `--excludePackages` literal in `check:sec:licenses` (currently
`'@porscheofficial/porschedigital-technology-radar@1.1.0'`, a known
drift hazard per ADR-0013) needs to grow into a two-package list as
part of PR #1. Per ADR-0013's own caveat about version-shaped strings
outside `package.json.version`, this remains a future drift hazard;
fixing it properly (reading the version dynamically) is out of scope
for this ADR.

## Consequences

- **One-command on-ramp.** New users type
  `npm create @porscheofficial/techradar@latest my-radar` and get a
  working radar project. This is the primary user-facing payoff and
  the lever that makes the rest of the README rewrite (planned for a
  follow-up PR) substantively different from the current README.

- **Independent versioning.** The scaffolder ships fixes (e.g., a
  package-manager detection improvement) without forcing a framework
  release. The framework ships features without forcing a no-op
  scaffolder bump. Each package's CHANGELOG tells a clean story.

- **Atomic cross-package changes.** When `techradar init` grows a new
  flag (e.g., `--starter=<name>`), the matching `create-techradar`
  prompt change lands in the same PR, releases together via the same
  release-please cycle, and the two packages' versions move together
  on that day. The shared release PR makes this visible and reviewable.

- **One-time tag migration.** All tooling that reads tags
  (release-please itself, any external watcher, the GitHub release
  page, downstream consumers' Renovate/Dependabot configs) sees a
  format change exactly once. The historical `v1.x.x` tags continue
  to resolve to their original commits. No CI breakage is expected
  because all of our CI keys off branches and SHAs, not tag patterns.

- **Two npm OIDC trusted-publisher setups.** The framework package's
  trusted-publisher entry on npmjs.com is unchanged. The scaffolder
  package needs its own one-time trusted-publisher setup after its
  first manual `pnpm publish --provenance` from a maintainer's
  machine. Subsequent releases publish via OIDC from CI exactly like
  the framework does today.

- **License-checker self-exclude must grow.** `check:sec:licenses`
  needs both packages' self-listings excluded. This is a known drift
  hazard that ADR-0013 already documents.

- **Cold install cost.** A fresh `pnpm install` at root now installs
  both packages' deps. The scaffolder is intentionally tiny
  (`@clack/prompts` + `execa` + `tsup` + `typescript` + `vitest`),
  so the marginal cost is small. pnpm's content-addressable store
  (per ADR-0019) further amortises it across worktrees.

- **Dep-cruiser scope is narrower, not broader.** `check:arch:depcruise`
  now scans `packages/techradar/{src,scripts}` instead of `src,scripts`
  at root. The rule patterns (which match `^node_modules/<pkg>/...`
  with `enhancedResolveOptions.symlinks: false` per ADR-0019) are
  unchanged. The package-relative scope keeps the harness focused on
  the framework's source — the scaffolder is too small to need it.

- **Working-tree footprint per worktree grows slightly.** Adding a
  second package adds a second `node_modules/` symlink graph
  (effectively zero bytes thanks to pnpm) plus the scaffolder's
  source tree (a few kB). Negligible.

- **AGENTS.md cascade.** Root `AGENTS.md` needs an updated section on
  the workspace layout (where each package lives, how to run package-
  specific commands via `pnpm --filter`). New `AGENTS.md` files at
  `packages/techradar/` and `packages/create-techradar/` capture the
  per-package conventions. The existing per-directory `AGENTS.md`
  files inside `src/`, `scripts/`, `data/` etc. move with their
  source under `packages/techradar/` and need no rewrite — their
  internal references are package-relative already.

- **`docs/HARNESS.md` requires an update in the same PR** per the
  Harness Documentation Sync rule. The diagrams and sensor inventory
  reference command paths (`scripts/checkBuildOutput.ts`, etc.) that
  remain accurate but are now invoked from inside
  `packages/techradar/`. The seven-row invariant table itself does
  not change.

- **Rollback path.** If the workspace migration causes an unforeseen
  regression that cannot be fixed forward, revert PR #1 (the
  workspace migration) atomically. The previous single-package layout
  is recoverable from git history. The release-please tag-format
  break is the only thing that does not auto-revert: the new tag
  format would need to be left in place even after a code-level
  revert, with the manifest manually rewritten back to the
  single-package shape. Practically this means PR #1 should be a
  high-confidence single-shot — verify the full DoD (`pnpm run lint
  && tsc --noEmit && pnpm run test && pnpm run check:arch &&
  pnpm run check:sec && pnpm run check:quality && pnpm run check:a11y
  && pnpm run build && pnpm run check:build`) on the migration
  branch before merging.

- **Future work this enables.** With `create-techradar` in place, the
  README rewrite (planned PR #3) has a substantively new lead story:
  *"`npm create @porscheofficial/techradar@latest my-radar` and you're
  done."* The deploy-story PR (#4) becomes possible by adding a
  `--starter=<vercel|netlify|gh-pages>` flag that wires
  `vercel.json` / `netlify.toml` / `.github/workflows/deploy.yml`
  into the scaffolded project. Both follow-ups depend on this ADR
  landing first.
