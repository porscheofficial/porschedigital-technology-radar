# ADR-0012 — Architecture harness: wiki-link integrity sensor

- Status: accepted
- Date: 2026-04-21

## Context

Item markdown bodies under `packages/techradar/data/radar/**` may reference other blips via
wiki-style links: `[[other-blip-id]]` or `[[other-blip-id|custom label]]`.
`scripts/remarkWikiLink.ts` resolves these against a pre-scanned blip
lookup table during `npm run build:data`. Unknown ids fail the build.

This is correct behaviour, but it has two ergonomic problems:

1. The failure surfaces only inside the full data-build pipeline
   (markdown → unified/rehype → HTML → `data/data.json`). The error
   message is buried under tens of seconds of unrelated work.
2. The sensor is build-output-coupled. An author who wants to verify
   a typo before regenerating `data.json` has to run the whole
   pipeline.

Wiki-link integrity is a structural invariant of the content graph,
not a runtime behaviour. It belongs in the source-only arm
(`check:arch`), parallel to dep-cruiser's import-graph rules.

## Decision

Add `packages/techradar/scripts/checkWikiLinks.ts` as `check:quality:wikilinks` …
**correction**: as `check:arch:wikilinks` under the existing
`check:arch` umbrella. Wiki-link integrity is a graph-shape invariant
on the content layer, semantically the same axis as dep-cruiser's
import-graph rules.

The script reuses `preScanBlipLookup` from `packages/techradar/scripts/buildData.ts`
(pass-1 of the existing two-pass build), then walks every
`packages/techradar/data/radar/**/*.md` file once with the same regex
(`/\[\[([^\]|]+?)(?:\|[^\]]+?)?\]\]/g`) used by `remarkWikiLink.ts`.
For every match, resolve the id against the pre-scanned table; collect
all unresolved ids and exit `1` with a single grouped error message.

To make the sensor truly source-only and idempotent, **wrap
`packages/techradar/scripts/buildData.ts`'s top-level `main()` in
`if (require.main === module)`** so importing `preScanBlipLookup` no
longer triggers the full build. This is a structural prerequisite —
without it the sensor would have side-effects on every invocation.

### Rejected alternatives

- **Add the check inside `buildData.ts` as a pre-build gate.**
  Rejected: still couples the check to the full pipeline. Authors
  hitting a typo would still pay the cost of remark/rehype setup.
- **Inline regex in the sensor (don't reuse `preScanBlipLookup`).**
  Rejected: duplicates the canonical id-extraction logic. Drift
  between sensor and pipeline is exactly the bug class the harness
  exists to prevent.
- **Skip the sensor — let `npm run build:data` catch it.** Rejected:
  the harness principle (ADR-0006/0007) is *every invariant gets a
  sensor at the cheapest enforcement point*. Source-only is cheaper
  than build-time.

## Consequences

- `check:arch` grows a fifth sub-script. DoD command set is
  unchanged in shape.
- `scripts/buildData.ts` gets the `require.main` guard. `npm run
  build:data` still works (verified). Any future caller that imports
  `preScanBlipLookup` no longer pays for the full build.
- `packages/techradar/data/AGENTS.md` cites the new sensor with a `(Checked: …)`
  reference, which `check:arch:doccoverage` validates.
- Wiki-link integrity moves leftward in the change lifecycle: typos
  surface in ~200ms instead of ~20s.
