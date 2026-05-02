# ADR-0008 — Clean-code harness, Phase 2b: jscpd

- Status: accepted
- Date: 2026-04-21

## Context

ADR-0007 opened the clean-code arm with knip. Phase 2b adds the second of
four planned sensors: copy-paste detection via jscpd.

A duplication scan over `src/` and `scripts/` (excluding tests, SCSS
modules, and generated icons; min-tokens 70) finds **3 clones, 0.89% of
tokens duplicated**. All three are between the `Radar/*` and
`QuadrantRadar/*` component pairs:

- `Radar.tsx` ↔ `QuadrantRadar.tsx` — tooltip rendering block (~150 tokens)
- `Chart.tsx` ↔ `QuadrantChart.tsx` — ring rendering and item-render
  functions (~170 + ~260 tokens)

This is **intentional structural mirroring**: the quadrant detail page
renders a zoomed mini-radar that visually mirrors the full radar. Sharing
the rendering code would couple two views that need to evolve
independently (different SVG dimensions, different label placement, no
mini-radar overlap with detail-panel layout). The duplication is the
documented design choice.

Tests are excluded because RTL test shape (`render(<X/>); screen.getByRole(...)`)
naturally repeats and copy-paste-detection there produces noise without
signal. SCSS modules are excluded for the same reason — utility-style
declarations recur. The generated `Icons/` folder is rebuilt from SVGs and
its duplication is irrelevant.

## Decision

Wire jscpd as `npm run check:quality:jscpd` under the existing
`check:quality` umbrella (added in ADR-0007).

Configuration in `packages/techradar/.jscpd.json`:

- `path: ["packages/techradar/src", "packages/techradar/scripts"]` — scope to source, never the repo root (the
  default scans `node_modules`, `out/`, etc., producing noise and 30+s
  runs).
- `minTokens: 70` — below this threshold matches are too short to be
  meaningful (RTL setup blocks, three-line if-chains).
- `threshold: 3` — fail when duplication exceeds 3% of tokens in any one
  format. Current state is 0.89% total, 2.88% in the JS-classified parse
  of the mirror clones. The 3% ceiling allows the documented mirror to
  stand and trips on any new significant duplication.
- `ignore`: `**/__tests__/**`, `**/*.test.*`, `**/*.module.scss`,
  `packages/techradar/src/components/Icons/**`, `**/*.snap`.
- `gitignore: true` — respect `.gitignore` so generated `out/` and
  `packages/techradar/data/data.json` never enter the scan.

Rejected alternatives:

- **Refactor the Radar/QuadrantRadar mirror to share code.** Rejected: the
  two views deliberately evolve independently. Sharing forces premature
  abstraction and couples layout decisions across the radar and quadrant
  pages. The duplication is small (~580 tokens total) and stable.
- **Set `threshold: 0` (zero tolerance) and ignore the four mirror
  files explicitly.** Rejected: file-level ignores grant a free pass to
  *new* duplication inside those files. The percentage-threshold approach
  catches regressions even in the otherwise-tolerated files.
- **Use an HTML reporter and only fail in CI.** Rejected: jscpd's console
  output is enough at this codebase size, and local gating is the
  harness's primary feedback loop (per ADR-0006).
- **Run jscpd in `--silent` mode.** Rejected: when the threshold trips,
  developers need the clone locations to act. Verbose console output is
  the diagnostic.

## Consequences

- `check:quality` now runs two sensors. Local time stays under 1s
  combined.
- New significant duplication trips the harness — the correct fix is
  almost always extraction (a hook, a util, a component). When the
  duplication is genuinely intentional like the Radar mirror, raise the
  threshold in `.jscpd.json` deliberately and reference this ADR.
- jscpd writes a `.jscpd/` cache directory at runtime when reporters
  request it. The default `console` reporter does not, but if anyone adds
  the `html` reporter the directory must be added to `.gitignore`.
- The mirror duplication is now baseline. Refactoring it would *lower*
  the duplication ratio, so jscpd does not lock the codebase into the
  mirror — it only prevents regression above 3%.
