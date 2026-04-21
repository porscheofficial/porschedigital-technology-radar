# ADR-0007 — Clean-code harness, Phase 2a: knip

- Status: accepted
- Date: 2026-04-21

## Context

Phase 1 of the harness (ADR-0006) closed the security arm. Phase 2 opens the
clean-code arm: sensors that catch dead code, duplication, and naming drift
before they become review noise.

Clean-code spans four candidates — dead-code detection (knip), duplication
(jscpd), naming-convention enforcement (typescript-eslint), and quality-rule
bundles (the reorganised sonar successor). Shipping all four in one PR makes
the diff unreadable and ties unrelated tuning decisions to a single revert.

Knip is the cheapest of the four:

- Already present in `devDependencies` as of a prior commit (never wired into
  a check).
- Surface area: unused files, unused exports, unused dependencies, unlisted
  dependencies, unlisted binaries. No style opinions.
- On the current codebase it reports four findings, all root-causable in
  minutes (see Decision).

## Decision

Wire knip as `npm run check:quality:knip` under a new `check:quality`
umbrella, parallel to `check:arch`, `check:sec`, and `check:build`. Promote
clean-code to a first-class arm so future sensors (jscpd, naming, sonar
successor) slot in without another umbrella rename.

Before gating, resolve the survey findings so the first gated run is green:

- **Remove `@eslint/js` from `devDependencies`** — genuinely unused (zero
  imports anywhere, including `eslint.config.mjs`).
- **Add `@types/mdast` to `devDependencies`** — `scripts/remarkWikiLink.ts`
  imports types from `"mdast"`, which resolves to `@types/mdast` installed
  transitively via the remark ecosystem. Declaring it explicitly makes the
  type dependency visible and protects against transitive churn.
- **Ignore `osv-scanner` and `gitleaks` as binaries in `knip.json`** — by
  design per ADR-0006, these are Go tools installed via Homebrew or the
  official GitHub Actions. They are not npm packages and never will be.

Rejected alternatives:

- **All four clean-code sensors in one PR.** Rejected: mixes four
  independently tunable configs (knip ignores, jscpd thresholds, naming
  selectors, sonar rule subsets) into one review. Hard to revert a single
  sensor without collateral damage.
- **knip as non-gating (advisory) like Scorecard.** Rejected: knip is
  deterministic and cheap; it runs locally in <1s; the harness principle is
  "every sensor that *can* gate, does gate." Scorecard is different — it
  produces a posture score, not a pass/fail.
- **Fold knip under `check:arch`.** Rejected: `check:arch` already runs four
  sensors and conceptually covers the *structure* of the code graph.
  Clean-code is a different axis (hygiene, not topology). Keeping them
  separate makes the four-arm harness model legible.
- **Run knip in CI only, not locally.** Rejected: local gating is the
  harness's primary feedback loop per ADR-0006. A sensor that only fires in
  CI lengthens the edit-lint-fix cycle.

Future Phase 2 sensors (one ADR each) will extend `check:quality`:

- `check:quality:jscpd` — copy-paste detection, threshold-tuned against the
  current codebase.
- `check:quality:naming` — `@typescript-eslint/naming-convention` wired into
  `eslint.config.mjs`, per-selector.
- `check:quality:sonar` — once the successor to `eslint-plugin-sonarjs`
  (reorganised upstream) is evaluated.

## Consequences

- A fourth harness arm (`check:quality`). Definition of Done grows to five
  gated checks: `lint && tsc && test && check:arch && check:sec && check:quality && build`.
- The root `package.json` `knip` script is removed in favour of
  `check:quality:knip`. One script name per sensor; the umbrella wires them.
- `knip.json` gains `ignoreBinaries` for `osv-scanner` and `gitleaks`. The
  file's schema URL is bumped from `knip@5` to `knip@6` to match the
  installed version.
- `@types/mdast` becomes an explicit devDep. If a future remark bump drops
  the transitive, the type dep survives.
- `@eslint/js` is gone. If a future ESLint config genuinely needs it, it
  gets re-added as part of that change.
- No CI workflow is added. knip runs in the existing test job via
  `npm run check:quality` once wired into the Definition-of-Done command set.
