# ADR-0009 — Clean-code harness: useNamingConvention via Biome

- Status: accepted
- Date: 2026-04-21

## Context

Phase 2 of the harness (per ADR-0007) enforces clean-code invariants. After
knip (ADR-0007) and jscpd (ADR-0008), the next axis is naming consistency.

The repo already classifies which tool owns what:

> ESLint runs in lint-only mode for architectural invariants Biome can't
> express. Biome remains the formatter/linter for everything else.
> — `packages/techradar/eslint.config.mjs` header

Biome 2 ships `style/useNamingConvention`, which covers the same surface as
`@typescript-eslint/naming-convention` (PascalCase for types/components,
camelCase for variables/functions, etc.) and integrates with the existing
`npm run lint` pipeline. The original Phase 2 plan (ADR-0007) named the
typescript-eslint rule because it was the canonical option at the time;
re-evaluating against the harness philosophy made Biome's rule the better fit.

A survey under default settings produced 51 errors. Two real patterns:

1. **Externally-dictated names** — `Component` (Next.js `AppProps` shape),
   `toJSON` (DOM `DOMRect` API), `XY` (mathematical coordinate convention),
   `IP` (Next.js `NextPage<P, IP>` generic).
2. **Mock factories in tests** — `vi.mock("…", () => ({ Radar, ItemDetail,
   PText, … }))`. The property names MUST mirror the real PascalCase
   exports they shadow; renaming would break the mock.

Loosening `strictCase` to `false` allowed consecutive uppercase (`XY`,
`IP`, `PText`, `JSON`) and reduced the count to 47. The remaining 47 are
all in test files (mock factories) plus `_app.tsx` (Next.js conventions).

## Decision

Enable `style/useNamingConvention` in `biome.jsonc` with `strictCase: false`.

Apply two narrow accommodations for externally-dictated names:

1. **Test override** — disable the rule for `**/*.test.ts` and
   `**/*.test.tsx`. Tests mock external PascalCase exports and the
   property names must match the real components verbatim.
2. **`packages/techradar/src/pages/_app.tsx`** — rename the local `IP` generic to
   `InitialProps`; suppress the `Component` property with a
   single-line `// biome-ignore` directive (Next.js `AppProps` API).

Wire the sensor into the existing clean-code arm:

```
"check:quality:naming": "biome lint --only=style/useNamingConvention --diagnostic-level=error src scripts"
```

`--only=` is required because Biome's per-file overrides bypass the global
config when a single rule is requested; we restrict scope to `src` and
`scripts` (invoked from packages/techradar/). `--diagnostic-level=error` filters the test-file infos that the
override would otherwise silence.

The umbrella becomes `npm run check:quality:knip && check:quality:jscpd &&
check:quality:naming`.

### Rejected alternatives

- **`@typescript-eslint/naming-convention` (the original ADR-0007 plan)** —
  duplicates Biome's coverage. Pulls naming out of the existing `npm run
  lint` loop and adds a second source of truth for the same axis. Rejected
  to keep the boundary clean: ESLint owns architectural invariants Biome
  can't express; naming is not one of them.
- **Default `strictCase: true`** — forbids consecutive uppercase. Forces
  `getXyPosition` over `getXYPosition` and breaks PDS component mock
  names (`PText` → `Ptext`). Rejected: 4 violations are externally fixed
  (Next.js, DOM, math).
- **No test override (suppress per-line in tests)** — would require ~45
  `// biome-ignore` directives on mock factories. Noisy, no signal value.
  Rejected.
- **File-level ignore for `_app.tsx`** — gives a free pass to all future
  naming sins in that file. The two specific Next.js shapes are the only
  exceptions; encode them precisely.

## Consequences

- New naming violations in `src/` or `scripts/` (excluding tests) fail
  `check:quality:naming` and the `check:quality` umbrella.
- Test files keep their freedom to mirror external PascalCase APIs.
- `packages/techradar/src/pages/_app.tsx` is a known exception zone, scoped to one suppression
  comment.
- Bumping `strictCase` back to `true` later requires explicit fixes in
  `positioner.ts` (`getXYPosition`), `useRadarTooltip.test.ts` (`toJSON`),
  and the PDS mock factories — a deliberate, diffable act.
- Future Phase 2 sensor: `check:quality:sonar` (eslint-plugin-sonarjs
  successor — package needs research per ADR-0007).
