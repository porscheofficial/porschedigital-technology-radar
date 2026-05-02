# ADR-0029 — Per-package licensing: techradar Apache-2.0, create-techradar MIT

- Status: accepted
- Date: 2026-05-02

## Context

The repository was migrated to a pnpm workspace monorepo in ADR-0027. It now
publishes two packages to npm:

- `@porscheofficial/porschedigital-technology-radar` (`packages/techradar/`)
  — the load-bearing Next.js framework package, originally Apache-2.0 to match
  the upstream project lineage and preserve patent-grant continuity for
  redistributors.
- `@porscheofficial/create-techradar` (`packages/create-techradar/`) — a thin
  scaffolder CLI that emits a starter project. Scaffolders are conventionally
  MIT (e.g. `create-react-app`, `create-vite`, `create-next-app`,
  `create-svelte`) so downstream users can copy fragments freely without
  worrying about Apache-2.0's notice / patent-grant clauses.

Three problems existed prior to this ADR:

1. `packages/create-techradar/package.json#license` was set to `Apache-2.0`,
   which did not match the intent for a scaffolder package.
2. Neither package shipped a `LICENSE` file inside its npm tarball. `npm pack`
   does not walk up the directory tree to find a parent `LICENSE`; the file
   must live at the package root and (defensively) be listed in `files`.
3. The repo-root `LICENSE` (Apache-2.0, with a one-line preamble carving out
   `radar/` content) implicitly suggested a single workspace-wide license,
   which contradicts the per-package decision above.

## Decision

Adopt **per-package licensing**:

- `packages/techradar/` keeps **Apache-2.0**:
  - `packages/techradar/package.json#license` = `"Apache-2.0"` (unchanged).
  - `packages/techradar/LICENSE` is added — a verbatim copy of the
    Apache License 2.0 body. Listed in the `files` array as defense in depth
    (npm includes top-level `LICENSE` automatically, but explicit listing
    documents intent and survives future `files`-array tightening).
- `packages/create-techradar/` switches to **MIT**:
  - `packages/create-techradar/package.json#license` = `"MIT"`.
  - `packages/create-techradar/LICENSE` is added — standard MIT text,
    copyright Porsche Digital. Listed in the `files` array.
- The repo-root `LICENSE` keeps the Apache-2.0 body (it governs the
  workspace tooling, the `docs/`, `scripts/`-style root assets, and the
  framework package). Its preamble is extended to point readers at the
  per-package license files for the actual published packages, so the split
  is discoverable from the root.

The `check:sec:licenses` sensor (ADR-0013, amended by ADR-0027 and again by ADR-0013 Amendment 2) needs no license-policy changes: its `--failOn` deny-list (`GPL;AGPL;LGPL;SSPL;BUSL;CC-BY-NC`) covers neither MIT nor Apache-2.0, so both workspace packages' declared licenses pass. The aggregator now walks both `packages/techradar` and `packages/create-techradar` so the scaffolder's runtime dependency tree is covered as soon as it gains any.

## Consequences

- Both published tarballs now contain a `LICENSE` file at their package root,
  satisfying the npmjs.com surface and downstream license auditors that walk
  package contents (e.g. `license-checker`, `osv-scanner`'s license report).
- The scaffolder license matches industry convention; consumers of
  `create-techradar` can copy generated boilerplate into MIT, BSD, or
  proprietary projects without Apache-2.0's notice obligation creeping in.
- Anyone reading the root `LICENSE` is now redirected to the per-package
  files for the canonical answer about the published artifacts. Tools that
  only inspect `<repo-root>/LICENSE` will still see Apache-2.0, which is
  truthful for the framework package and the workspace tooling.
- Per-package license drift is policy, enforced at review time: if either
  package's license ever changes, the corresponding per-package `LICENSE`
  file, `package.json#license` field, and any documentation reference must
  move together. There is no sensor for this.
