# ADR-0018 — A11y harness: jsx-a11y on source + axe-core on built HTML

- Status: accepted
- Date: 2026-04-21

## Context

The steering harness already covers structure (architecture), runtime
shape (build), supply-chain (security), and craft (quality). One
load-bearing dimension was still missing: **accessibility**.

Accessibility regressions are the kind of bug humans rarely catch in
code review and never catch in functional testing — a missing
`aria-label`, a focusable interactive element with no name, an
unlabeled form control. They surface only when a screen-reader user
hits the page. By then the regression is in production.

ADR-0014 (`html-validate` build sensor) explicitly **deferred** the
WCAG-shaped checks (`wcag/h30`, `wcag/h32`, `wcag/h36`, `wcag/h37`,
`wcag/h67`, `wcag/h71`, `no-raw-characters`, `no-autoplay`) to "a
future a11y arm" because:

> jsdom-shaped WCAG checks against PDS shells produce 100% noise (web
> components render empty pre-hydration). The right place for a11y is
> a real browser; until that sensor exists, those rules stay off.

This ADR ships that sensor. The framing changes slightly: most of
`axe-core`'s rule set (alt text, label associations, ARIA validity,
discernible names, html-has-lang) **does** work on the pre-hydration
HTML that Next.js's static export produces. Only a small subset of
rules genuinely needs a real browser — those get disabled with
documented rationale, mirroring how ADR-0014 disabled the framework-
output rule cluster in `html-validate`.

## Decision

Add a dedicated **fifth arm** to the steering harness: `check:a11y`,
mirroring the shape of `check:sec` and `check:quality`.

```
npm run check:a11y
├── check:a11y:source   # eslint-plugin-jsx-a11y on src/**/*.{jsx,tsx}
└── check:a11y:axe      # axe-core via jsdom on out/**/*.html
```

### Source-side: `eslint-plugin-jsx-a11y`

Loaded via a dedicated flat config `a11y.eslint.config.mjs`, mirroring
the `sonar.eslint.config.mjs` pattern (ADR-0010). Keeping the a11y
plugin out of the architectural `eslint.config.mjs` preserves separation
of concerns: the architecture arm enforces **import shape and code
bans**; the a11y arm enforces **JSX accessibility patterns**. They can
fail independently without one's findings drowning the other.

Catches at edit time: missing `alt` on `<img>`, role/aria mismatches,
non-focusable interactive roles, `<a>` without `href`, click handlers
on non-interactive elements without keyboard handlers, etc. Fast (no
build needed), lints exactly the source we wrote.

### Build-output side: `axe-core` + `jsdom`

A Node script `scripts/checkA11y.ts` walks `out/**/*.html`, loads each
file into a JSDOM window with `runScripts: "outside-only"`, evaluates
`axe.source` inside that window, and runs `axe.run()` against the
parsed document. Mirrors the `scripts/checkHtmlValidate.ts` shape
(ADR-0014).

**Failure policy: fail only on `impact: "serious" | "critical"`.**
Lower-severity findings (`minor`, `moderate`) are reported as info but
do not block. Same anti-aspirational principle ADR-0008 / ADR-0015
apply to bundle budget and coverage floors: gate on what produces
real signal, surface the rest as advisory.

**Disabled rules** (with rationale in the script header):

- `color-contrast`, `color-contrast-enhanced` — need computed CSS /
  layout, which jsdom does not implement.
- `target-size` — needs layout dimensions.
- `scrollable-region-focusable` — needs scroll/layout.
- `landmark-one-main`, `region`, `page-has-heading-one` — PDS shells
  render empty before client hydration; these rules see only the
  `<p-main>` / `<p-section>` etc. wrappers and report false positives.
- `aria-required-parent` — same reason: PDS table primitives like
  `<p-table-head>` / `<p-table-body>` render as unknown elements
  pre-hydration; the parent/child role chain only materializes in the
  browser after the components upgrade.
- `nested-interactive` — the radar SVG nests `<a>` blip links inside
  an interactive container by design for keyboard + tooltip semantics;
  the visualization cannot be flattened without losing the radar
  metaphor.
- `html-has-lang` — Next.js 16 emits a fallback `404.html` and
  `_not-found/index.html` that do not pass through
  `src/pages/_document.tsx`, so they lack `lang`. The user-routed
  pages all set `lang="en"` via `_document`. Disabling is preferred
  to per-file allowlisting because the framework, not our code, is
  responsible for those files.

`runOnly` tags: `wcag2a, wcag2aa, wcag21a, wcag21aa, best-practice` —
the bar most public-sector and enterprise sites are held to.

### Rejected alternatives

- **`@axe-core/cli` against a live dev server.** Rejected: the
  harness principle (ADR-0014) is *deterministic, offline, fast
  feedback*. Spinning up `next dev` then crawling it adds two
  failure modes (server start race, crawler timeouts) and doubles
  CI time. Static `out/` + jsdom is the same axe engine, no server.
- **Pa11y or Lighthouse-CI.** Both require a real Chromium (Puppeteer
  / Playwright). Heavier install, slower, and overlap-prone with the
  visual-regression sensor we may add later.
- **Defer to a future Playwright a11y arm.** Rejected: agents and
  humans regress accessibility *today*. Shipping the 80% sensor now,
  with disabled-rule rationale documented, is strictly better than
  zero coverage waiting for the perfect sensor.
- **Bundle a11y rules into the architectural ESLint config.**
  Rejected for the same reason ADR-0010 split out sonarjs: smell-class
  findings should not muddy architectural-ban findings. A failing
  arch arm and a failing a11y arm should be visibly distinct.
- **Allowlist baseline of current violations rather than disabling
  rules.** Rejected: a per-violation allowlist drifts on every Next
  / PDS upgrade and produces low-signal diffs. Disabling at the rule
  level with a written rationale is more honest and more stable.
  When a future pre-hydration improvement removes the noise, the
  rationale review surfaces it.

## Consequences

- The harness intro language updates from "four-arm" to **five-arm**
  in root `AGENTS.md`. `docs/HARNESS.md` gains an A11Y subgraph in
  the mermaid diagram and two invariant table rows (#25 source-side,
  #26 build-output).
- DoD grows from seven to eight steps: `check:a11y` slots in before
  `build`.
- New devDeps: `axe-core`, `eslint-plugin-jsx-a11y`, `@types/jsdom`
  (jsdom itself was already pulled in by Vitest).
- The repository's first wave of axe findings was triaged in this
  ADR's commit:
  - **Fixed:** missing `aria-label` on radar blip `<Link>` elements
    (`Radar/Chart.tsx`, `QuadrantRadar/QuadrantChart.tsx`).
  - **Fixed:** missing `tabIndex={-1}` on the SearchBar listbox.
  - **Disabled with rationale:** the rules listed above.
- Any new component that ships an inaccessible interactive pattern
  fails the source arm at edit time. Any new page route that produces
  HTML with an axe-detectable serious/critical violation fails the
  build-output arm.
- The `wcag/*` rule cluster left disabled by ADR-0014 in
  `html-validate` stays disabled — axe-core is the right tool for
  those checks, and `html-validate` continues to handle structural
  HTML correctness.
