# ADR-0021 — Recategorize build-time deps as `dependencies` so the consumer-side shadow workspace can install with `--omit=dev`

- Status: accepted
- Date: 2026-04-22

## Context

The CLI shipped in this package (`bin/techradar.ts`) materializes a
shadow Next.js workspace at `.techradar/` in the consumer project,
runs `npm install` inside it, and then drives `next build` to produce
a static site. This is the load-bearing assumption behind the
"give me Node, I'll do the rest" UX promise from ADR-0019.

A downstream consumer (`@porscheofficial/porschedigital-technology-radar@1.2.0`)
reported `npx techradar build` failing during the shadow `npm install`
with a hard ERESOLVE between `eslint@10.2.1` and
`eslint-plugin-jsx-a11y@6.10.2` (peer requires `eslint <=9`). The same
peer conflict is ack'd in ADR-0018 and was paved over for the
maintainer environment in ADR-0019 by setting
`auto-install-peers=true` and `strict-peer-dependencies=false` in
`.npmrc`. But `.npmrc` is **not** in `package.json#files` and is
therefore not shipped to consumers — vanilla npm in the consumer
environment hits the conflict head-on.

The deeper cause is a **misclassification**: `package.json`'s
`devDependencies` field was being used as "everything that isn't part
of the JS public API of this package", which conflated two genuinely
different concerns:

1. **Build-time runtime deps** — packages the CLI's shadow workspace
   needs at install time to produce a working static site:
   `next`, `react`, `react-dom`, `tsx`, `satori`,
   `@resvg/resvg-js`, the `unified`/`rehype`/`remark` chain,
   `@11ty/gray-matter`, `zod`, `consola`, `citty`, `chokidar`,
   `execa`, the `@types/*` packages tsc resolves at build, the
   PostCSS plugins Next reads from `postcss.config.js`, etc.
2. **Maintainer-only QA tooling** — packages that only ever run in
   this repo: `biome`, the `eslint*` chain, `vitest`, `axe-core`,
   `cspell`, `jscpd`, `knip`, `html-validate`, `husky`,
   `lint-staged`, `commitlint`, `tsup`, `dependency-cruiser`,
   `linkinator`, `markdownlint-cli2`, the `@testing-library/*` set,
   `jsdom`, `license-checker-rseidelsohn`.

npm's standard `dependencies` vs `devDependencies` split is exactly
this distinction — but only when each set is correctly populated.
Lumping (1) into `devDependencies` because "the consumer's app code
doesn't `import next` directly" misuses the field.

## Options considered

- **A — Hotfix: pin `eslint` back to `^9`.** Localizes the symptom
  (consumer install passes), leaves the categorization wrong. Any
  future devDep with a strict peer collision will reproduce the bug.
  ADR-0018 explicitly chose `eslint@10` for the a11y harness; this
  would partially undo that.
- **B — Add `--legacy-peer-deps` to the shadow install.** One-line
  change, hides every future peer-dep conflict (including real ones).
  Diverges the shadow's resolution behaviour from the maintainer's,
  meaning the harness never sees what the consumer sees. Rejected
  on the same reasoning as ADR-0019 used for moving away from
  `legacy-peer-deps=true`: `strict-peer-dependencies=false` is a
  scoped local relaxation, not an industry-wide kill switch.
- **C — Maintain a regex denylist of QA devDeps the shadow strips
  before `npm install`.** Implementable in one self-contained
  module (`bin/sanitizeShadowPackageJson.ts`). Works today but
  drifts: every new QA tool added to `devDependencies` must be
  remembered in the denylist, otherwise the consumer install
  re-breaks. Failure mode is loud (next consumer install dies),
  but the maintainer sees nothing in their own DoD because
  `pnpm install` in the maintainer env never runs the denylist.
  Considered and rejected — see "Why not denylist".
- **D — Recategorize: move build-time runtime deps from
  `devDependencies` to `dependencies`; keep QA tooling in
  `devDependencies`; **delete `devDependencies` outright from the
  shadow's `package.json`** before `npm install`.** No regex
  denylist needed: the field is empty in the shadow, so npm has
  nothing to resolve from it. Note that `npm install --omit=dev`
  is **not** sufficient on its own — npm still resolves the full
  dep graph (including QA peer dependencies) before honouring
  `--omit=dev`, so the eslint/jsx-a11y peer conflict still fires.
  Outright deletion of the field bypasses the resolver. **Chosen.**

## Decision

Adopt option D. Concretely:

- ~33 packages move from `devDependencies` → `dependencies`. The
  rule: anything imported (directly or transitively at the source
  level) by `scripts/buildData.ts`, `scripts/buildOgImages.ts`, the
  Next.js app under `src/`, `next.config.js`, or `postcss.config.js`,
  or invoked by the rewritten `build` script, must be in
  `dependencies`. `@types/*` packages used by the build's
  type-check (`@types/node`, `@types/react`, `@types/react-dom`,
  `@types/hast`, `@types/mdast`) move too — they are runtime
  prerequisites of `next build`.
- ~30 packages stay in `devDependencies` (QA, lint, test, format,
  commit hooks, the bin bundler).
- `package.json#scripts.build` is rewritten from
  `pnpm run build:data && pnpm run build:og && next build` to
  `tsx scripts/buildData.ts && tsx scripts/buildOgImages.ts && next build`.
  Both maintainer (`pnpm run build`) and shadow (`npm run build`)
  invoke the same script body via their respective package
  manager wrapper. ADR-0019's "use pnpm in maintainer scripts" still
  holds for chained `check:*` orchestrators; only the build chain is
  manager-agnostic now, which is exactly the property we want.
- `bin/techradar.ts` `ensureBuildDir()`:
  - The existing two-line strip of `prepare` / `postinstall`
    scripts is kept (they reference husky and the `tsup` bin
    bundler that no longer exist in the shadow workspace).
  - `delete pkg.devDependencies` is added immediately after.
    With every build-time dep now in `dependencies`, the field is
    pure QA tooling and can be removed wholesale. This is what
    actually fixes the ERESOLVE — `--omit=dev` does not, because
    npm resolves the full graph before honouring it.
  - A new step patches the shadow `tsconfig.json`'s `exclude` to
    include QA-only files (`scripts/check*.ts`,
    `scripts/preCommit*.ts`, `scripts/__tests__/**`,
    `src/**/__tests__/**`, `src/**/*.test.{ts,tsx}`, `src/test/**`,
    `bin/__tests__/**`). Without this, `next build`'s built-in
    type-check sweeps in those QA scripts via the
    `include: ["**/*.ts", ...]` rule and fails because their
    devDep imports are no longer in the shadow `node_modules`.
    The exclude list lives in `bin/sanitizeShadowTsconfig.ts` as a
    pure function with a focused vitest suite.

### Why not denylist (rejected option C)

The denylist and the recategorization solve the same surface
problem (consumer install passes) with very different drift
profiles:

|                                | Denylist (C)                                                 | Recategorization (D)                              |
| ------------------------------ | ------------------------------------------------------------ | ------------------------------------------------- |
| Drift surface                  | Every new QA dep must be added to the denylist               | npm `--omit=dev` is automatic                     |
| Maintainer-side detection      | None — maintainer env never invokes the denylist             | Maintainer's own `pnpm install` follows the same split |
| Honest about the dep graph     | No — `next` etc. claim to be dev-only                        | Yes — `next` is a runtime prereq of the CLI      |
| Code surface                   | ~80 lines of regex denylist + tests                          | ~20 lines of tsconfig exclude + tests             |
| Failure mode                   | Loud, but only on the next consumer install                  | Loud, also on maintainer install                  |
| Consumer install footprint     | Smaller (deps installed lazily in the shadow)                | Larger (all build-time deps installed eagerly)    |

The eager install footprint is the only real downside, and is
**arguably correct behaviour**: anyone installing the CLI did so
to run `techradar build`, which needs Next.js + React + the markdown
pipeline. Lazy-installing them on first build is what motivated the
shadow workspace pattern; eager-installing them is more honest about
what the package actually needs to function.

## What does not change

- `bin/techradar.ts` continues to use `npm` (not `pnpm`) inside the
  shadow, per ADR-0019.
- The published tarball still ships the full `package.json`. The
  recategorization is the actual fix — no per-consumer mutation of
  the published file is needed.
- `.npmrc` remains repo-local (not in `files`). It is no longer
  load-bearing for the consumer install; its `auto-install-peers=true`
  / `strict-peer-dependencies=false` settings are maintainer-side
  conveniences for `pnpm install`.
- The Definition of Done in root `AGENTS.md` is unaffected. The
  same gates run with the same tools.
- Existing ADRs are not edited. ADR-0018 (a11y harness, eslint@10
  choice) and ADR-0019 (pnpm migration, peer-dep relaxation) are
  preserved as historical record; this ADR layers on top.

## Consequences

- **Consumer install reproducibility**: vanilla `npm install` of
  the published tarball pulls a deterministic build-time dep set.
  No reliance on `.npmrc`, peer-dep flags, or post-install
  mutations. Same install behaviour on every consumer machine.
- **Larger consumer dep tree**: a fresh `npm install` of the CLI
  package now pulls Next.js + React + the markdown chain
  immediately, not on first `techradar build`. Trade-off
  documented above; the alternative (lazy install + denylist)
  has worse drift properties.
- **Maintainer side is unchanged from `pnpm`'s POV**: pnpm
  installs `dependencies` and `devDependencies` together by
  default (which is what we want for the harness). All gates
  pass byte-identically before and after the move.
- **`--omit=dev` failure is loud and immediate**: if a future
  build-time dep is mistakenly added to `devDependencies`, the
  next consumer build fails with a "cannot find module" error
  pointing at the missing package (because `delete pkg.devDependencies`
  removed it from the shadow). The fix is to move it to
  `dependencies`. This is much easier to diagnose than a
  silent denylist drift.
- **License-check footprint grows**: `check:sec:licenses --production`
  now scans the build-time set too. All affected packages are
  already MIT / Apache-2.0 / MPL-2.0 / BSD; none hit the
  GPL/AGPL/LGPL/SSPL/BUSL/CC-BY-NC failOn list. Re-verified
  against the current dep set as part of this ADR's DoD.
- **Knip is unaffected**: `scripts/**/*.ts` is already in knip's
  `project` glob, so build-time deps used by `scripts/buildData.ts`
  and `scripts/buildOgImages.ts` resolve as "used" regardless of
  which side of the dependencies/devDependencies line they sit on.
- **Tsconfig sanitization is the only remaining shadow mutation**:
  the surface area of "things the shadow does differently from the
  maintainer env" shrinks from "regex devDep denylist + script
  rewrites + tsconfig patch + lifecycle script strip" to just
  "tsconfig patch + lifecycle script strip". Both are mechanical
  and locally testable.
- **Rollback path**: if recategorization causes an unforeseen
  regression, revert this ADR's commit. The previous package.json
  layout is recoverable from git history; the shadow `npm install`
  reverts to its pre-`--omit=dev` behaviour.
