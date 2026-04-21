# ADR-0005 — Bundle budget enforced via fs walk, not @next/bundle-analyzer

- Status: accepted
- Date: 2026-04-21

## Context

Phase 3 of the steering harness adds a build-output sensor that fails the build
when the static export grows beyond explicit JS/CSS size thresholds. The
out-of-the-box choice would be `@next/bundle-analyzer`, which is the
Next-recommended tool for this concern.

`@next/bundle-analyzer` produces an interactive HTML treemap (`analyze/*.html`)
intended for human inspection during local development. It does not emit a
machine-readable artifact suitable for a CI threshold check.

The static export under `output: "export"` produces a flat directory of chunks
under `out/_next/static/`. Their sizes are trivially measurable with `fs.stat`.

## Decision

Implement `scripts/checkBundleBudget.ts` as a small fs walker over
`out/_next/static/`. Compare totals and per-chunk sizes against
`bundle-budget.json` (hand-edited, three keys: `maxTotalJsBytes`,
`maxTotalCssBytes`, `maxChunkBytes`). Wire as `check:build:budget`, chained
into `npm run check:build` after the routes and links sensors.

Do not install `@next/bundle-analyzer`. If a human ever needs the visual
treemap, they can install it locally without it being part of the harness.

## Consequences

- One fewer dependency. The script is ~50 lines and uses only `node:fs`.
- The budget file is the human-curated truth; bumping it is a deliberate,
  diffable act that requires a justifying commit message.
- Per-chunk thresholds catch new oversized vendor splits even when totals stay
  flat — useful for ratchet-style regression tracking.
- We lose the visual treemap. Acceptable: when a budget violation fires, the
  failure message lists the offending chunks by path and size, which is enough
  for a developer to drill in with `du` or by re-installing the analyzer
  locally.
