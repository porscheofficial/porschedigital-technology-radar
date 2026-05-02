# ADR-0019 — Switch package manager from npm to pnpm

- Status: accepted
- Date: 2026-04-21

## Context

The repository is actively developed across multiple git worktrees in
parallel (one per branch / PR). With npm's flat `node_modules/` layout,
each worktree gets its **own full copy** of the dependency graph.
Measured locally: ~600 MB and 60+ seconds per `npm install` per
worktree. Across five concurrent worktrees that compounds to ~3 GB of
duplicated bytes and several minutes of wall time on every branch
switch or fresh checkout.

The project itself is small (a few production deps; the cost is almost
entirely the dev toolchain — Next.js, Vitest, ESLint, dependency-
cruiser, axe-core, jsdom, sass, etc.). That cost is the same for every
worktree, and almost all of those bytes are byte-identical across
versions of the same package.

[pnpm](https://pnpm.io) solves this directly: a single global
content-addressable store under `~/.local/share/pnpm/store/`
hard-links into each project's `node_modules/`. Same package version
across N worktrees = one copy on disk, near-zero install time after
the first warm install.

The other options were considered and rejected:

- **Yarn 3+ / Berry** — solves the duplication problem with PnP, but
  PnP breaks tools that scan `node_modules/` directly (which our
  harness does — see `dependency-cruiser`, `license-checker-rseidelsohn`,
  `osv-scanner`, `linkinator`'s static crawl). Yarn's `nodeLinker:
  node-modules` mode regresses to npm's duplication problem.
- **Bun** — fast and disk-efficient, but its npm-registry-compatibility
  layer still has gaps (lifecycle scripts, peer-dep resolution edge
  cases) that would put the harness's reproducibility at risk on a
  load-bearing migration. Worth revisiting once Bun's `bun install`
  is the documented production install path for Next.js itself.
- **Symlinking `node_modules` between worktrees by hand** — gets
  the disk savings but loses lockfile-per-worktree integrity, breaks
  `npm ci` reproducibility guarantees, and turns into a footgun the
  moment two branches diverge on a dep version.

## Decision

Adopt **pnpm 10.x** as the project's package manager for development
and CI. Pin the exact version via `packages/techradar/package.json`'s `packageManager`
field so Corepack auto-installs it and refuses npm/yarn invocations
in this repo.

### What changes

- `packages/techradar/package.json` gains `"packageManager": "pnpm@10.29.2"` and a
  `pnpm.onlyBuiltDependencies` allowlist (pnpm refuses to run
  postinstall scripts unless explicitly approved — a small security
  win we get for free).
- All chained scripts call `pnpm run <name>` instead of `npm run <name>`.
- `package-lock.json` is replaced by `pnpm-lock.yaml` (generated via
  `pnpm import` to preserve the resolved versions of the existing
  npm lockfile; no silent dep upgrades on migration day).
- `packages/techradar/.npmrc` switches from `legacy-peer-deps=true` (the npm flag that
  mutes the jsx-a11y@6.10.2 / eslint@10 peer conflict per ADR-0018)
  to the pnpm equivalents `auto-install-peers=true` and
  `strict-peer-dependencies=false`. The ADR-0018 reference is preserved
  in the comment.
- `.husky/pre-commit` and `.husky/commit-msg` switch from
  `npx <bin>` to `pnpm exec <bin>` so they resolve from the pnpm-managed
  `node_modules`.
- CI workflows (`deploy.yml`, `security.yml`, `release-please.yml`)
  add a `pnpm/action-setup` step (pinned by SHA per ADR-0017),
  switch `actions/setup-node`'s `cache: npm` to `cache: pnpm`,
  and replace `npm ci` with `pnpm install --frozen-lockfile`.
- `check:sec:deps` (osv-scanner) and the `osv-scanner-action` in
  `security.yml` change `--lockfile=package-lock.json` to
  `--lockfile=pnpm-lock.yaml`.
- `release-please.yml` keeps `npm publish` (with the pinned npm@11.5.1
  Trusted Publishing requirement intact) — `npm publish` is the
  registry-blessed publish path and is orthogonal to which tool we
  use for installs. `pnpm publish` would also work, but switching it
  would require re-validating Trusted Publishing's OIDC flow against
  pnpm's wrapper, which is not worth the risk for zero benefit.

### What does not change

- `packages/techradar/bin/techradar.ts` (the published CLI for downstream consumers)
  continues to shell out to `npm install` / `npm run build:data` /
  `npm run build` inside its `.techradar/` shadow build. Downstream
  users of the CLI may have any package manager (or none); npm is
  the universally-available fallback that ships with Node. Forcing
  pnpm on consumers would be a breaking change for a CLI whose
  contract is "give me Node, I'll do the rest".
- README's consumer-facing install / `npx techradar ...` instructions
  stay on npm for the same reason.
- Existing ADRs (0001–0018) are not edited. Per the README's
  immutability rule, this ADR supersedes the implicit npm choice;
  historical command examples in earlier ADRs document what was
  current at the time and remain accurate as historical record.

### Dependency-cruiser implication

Pnpm's on-disk layout differs from npm's: real package files live
under `node_modules/.pnpm/<pkg>@<ver>/node_modules/<pkg>/...` and
the root `node_modules/<pkg>` is a symlink. Several of the harness's
ban rules in `.dependency-cruiser.cjs` match resolved paths against
`^node_modules/<pkg>/...` (e.g. `^node_modules/next/image(\.|/|$)`
per ADR-0003, the CSS-in-JS ban, the runtime-fetching ban, the
Next-server-API ban). Without intervention dep-cruiser would
realpath through the symlink and the patterns would silently stop
matching — a load-bearing harness regression.

Fix: set `enhancedResolveOptions.symlinks: false` in
`packages/techradar/.dependency-cruiser.cjs`. This tells the resolver to keep the
symlink path as the resolved path, preserving the existing
`^node_modules/<pkg>/...` semantics across both npm and pnpm
layouts. The patterns themselves are unchanged.

## Consequences

- **Disk and time savings**: per-worktree install drops from ~600
  MB / 60 s to a few hundred MB of symlinks / a few seconds (warm).
  Cold first install on a new machine is roughly the same wall time
  as npm; subsequent worktrees are nearly free.
- **Strictness upgrade**: pnpm's default isolated `node_modules`
  layout means a package can only `require()` what it explicitly
  declared in `package.json`. This catches "phantom dependency"
  bugs that npm's flat layout silently allows. Real risk of one-time
  breakage during migration; mitigated by running the full DoD
  before merge.
- **Corepack lock-in**: contributors must have Corepack enabled
  (`corepack enable` once). Node 16.10+ ships Corepack; the engines
  field already requires Node 22+, so this is universally available.
- **CI cache key changes**: `cache: pnpm` keys on `pnpm-lock.yaml`,
  not `package-lock.json`. The first CI run after merge re-warms
  the cache; subsequent runs get the pnpm-store benefit.
- **Migration is one-shot**: `package-lock.json` is deleted in the
  same commit `pnpm-lock.yaml` is added. Running both lockfiles
  in parallel is not supported and would cause version drift.
- **The harness keeps the same gates**: lint, tsc, test, check:arch,
  check:sec, check:quality, check:a11y, build, check:build all run
  via `pnpm run` instead of `npm run`. The Definition of Done in
  `packages/techradar/AGENTS.md` is updated in lockstep; `docs/HARNESS.md`
  command references update too (Harness Documentation Sync rule).
- **`onlyBuiltDependencies` allowlist becomes a small ongoing
  obligation**: when a new dev dep with a postinstall script is
  added, pnpm refuses to run it until the package name is added
  to the allowlist. This is a feature — it forces a deliberate
  decision per ADR-0006's supply-chain posture — not a bug.
- **Rollback path**: if pnpm causes an unforeseen regression that
  cannot be fixed forward, revert this PR. The previous
  `package-lock.json` is recoverable from git history;
  `npm install` reproduces the prior state byte-for-byte.

## Amendment — ADR-0027 (pnpm workspace migration)

After the workspace split (ADR-0027), the pnpm setup is now distributed across two locations:

- `pnpm-lock.yaml` lives at the repo root and is the single workspace lockfile that resolves dependencies for every package in the monorepo. The `--frozen-lockfile` invariant is enforced at this root file.
- The `packageManager` field that pins the exact pnpm version (so Corepack auto-installs it) lives in `packages/techradar/package.json`. Corepack reads this field from the package whose directory the command is invoked in, but in practice it enforces repo-wide because every contributor enters the repo through the root.
- The root `package.json` is the monorepo orchestration manifest (private, no published artifact) and delegates to per-package scripts via `pnpm --filter @porscheofficial/porschedigital-technology-radar run <name>`.
- pnpm-specific settings (`auto-install-peers`, `strict-peer-dependencies` — the two flags that work around the jsx-a11y@6.10.2 / eslint@10 peer-range gap per ADR-0018) live in the workspace's `pnpm-workspace.yaml` at the repo root. They were originally written into a root `.npmrc`, but pnpm 10 also reads its own settings from `pnpm-workspace.yaml`, and keeping them out of `.npmrc` avoids spurious "Unknown project config" warnings whenever npm itself touches the file (e.g. `npm publish` of `create-techradar` to a local verdaccio for release smoke-testing, `npm create @porscheofficial/techradar`). The `.npmrc` file is intentionally absent: the workspace has no settings that need to be visible to both managers.

The original decision — adopt pnpm for the speed and disk-usage win, pin the version via `packageManager`, keep Husky hooks and CI workflow commands working — is unchanged. The migration only redistributed where the configuration lives.
