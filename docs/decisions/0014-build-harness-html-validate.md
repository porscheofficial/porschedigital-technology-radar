# ADR-0014 — Build harness: HTML structural validation

- Status: accepted
- Date: 2026-04-21

## Context

The site is a 100% static export (ADR-0002). Every page in `out/` is
HTML rendered ahead of time by Next.js, populated with content from
`packages/techradar/data/data.json` and `packages/techradar/data/about.md` via React + Porsche Design
System (PDS) components. Three classes of regression are invisible
to the existing build sensors (`check:build:routes`,
`check:build:links`, `check:build:budget`):

1. **Structural HTML errors** — unclosed tags, mismatched nesting,
   duplicate `id` attributes. These render in browsers but break
   assistive technology, search-engine crawlers, and downstream
   parsers.
2. **Accessibility-adjacent attributes** — missing `lang` on
   `<html>`, missing `<title>`, `alt` on `<img>` inside our own
   markdown (PDS components are exempted; their internals are not
   our concern).
3. **Markdown-layer escapes** — a content author writing raw
   `<script>` or `<iframe>` in a radar item that survives the
   sanitizer (defended at the source by ADR-0006's
   `check:sec:sanitize`, but the build-output sensor catches the
   case where a future pipeline regression weakens the source layer
   without triggering the source-side test).

This is a build-output invariant, parallel to broken-link checking.
It belongs in the `check:build` umbrella.

## Decision

Add `check:build:html` using
[`html-validate`](https://html-validate.org/), a Node-native
deterministic validator (no headless browser, no network).

Two artifacts:

- **`packages/techradar/scripts/checkHtmlValidate.ts`** — sensor wrapper that asserts
  `out/` exists (mirrors the pattern in
  `packages/techradar/scripts/checkBundleBudget.ts`), then `spawnSync`'s the
  `html-validate` CLI against `packages/techradar/out/**/*.html`. Uses `spawnSync` from
  `node:child_process` rather than `execa` because execa 9 fails on
  Node 25 + tsx with `ERR_PACKAGE_PATH_NOT_EXPORTED` from
  `npm-run-path → unicorn-magic`. (Future sensor scripts should
  prefer `node:child_process` for the same reason.)
- **`packages/techradar/.htmlvalidate.json`** — extends `html-validate:recommended`
  with a curated set of disabled rules. The disables fall in three
  buckets:
  - **Next.js / React-emitted HTML** that html-validate considers
    non-canonical: `void-style`, `attribute-boolean-style`,
    `attribute-empty-style`, `no-self-closing`, `attr-case`
    (camelCase JSX attrs like `charSet`, `noModule`, `srcSet`,
    `autoComplete`), `valid-id` (`__next`, `__NEXT_DATA__`),
    `no-implicit-button-type`, `no-trailing-whitespace`,
    `no-inline-style`, `long-title`.
  - **PDS web-component shells** that render empty before
    hydration: `empty-heading`, `text-content`,
    `no-unknown-elements`, `element-required-attributes`,
    `element-permitted-content`, `element-permitted-parent`,
    `prefer-native-element`, `no-redundant-role`,
    `input-missing-label`.
  - **WCAG rule subset deferred to a dedicated a11y arm**:
    `wcag/h30`, `wcag/h32`, `wcag/h36`, `wcag/h37`, `wcag/h67`,
    `wcag/h71`, `no-raw-characters`, `no-autoplay`. (A future a11y
    sensor — out of scope for this ADR — would re-enable these
    against a real browser via axe-core or pa11y.)

What stays enabled is the structural core: `close-attr`,
`close-order`, `unique-landmark`, `no-dup-id`, `no-conditional-comment`,
`require-sri`, `valid-attribute-values`, `unique-html-attribute`,
plus the rest of `html-validate:recommended` that survives the
disables above. This is the smallest set that catches regressions
of class (1) and (3) above without producing PDS noise.

### Rejected alternatives

- **`htmlhint`.** Rejected: smaller rule set, less actively
  maintained, configuration is less granular than html-validate's
  per-rule disables.
- **`html-validator` (W3C Nu validator wrapper).** Rejected:
  requires a network call to validator.w3.org or a local Java
  daemon. Violates the harness principle of deterministic, offline,
  fast feedback.
- **Run html-validate inside the existing `check:build:links` step
  via `linkinator`'s plugin system.** Rejected: linkinator is a
  link checker, not a structural validator. Conflating the two
  sensors makes failure attribution harder.
- **Enable the WCAG subset now, defer a real browser-based a11y
  arm.** Rejected: jsdom-shaped WCAG checks against PDS shells
  produce 100% noise (web components render empty pre-hydration).
  The right place for a11y is a real browser; until that sensor
  exists, those rules stay off.

## Consequences

- `check:build` grows from three to four sub-scripts. The local
  workflow becomes `npm run build && npm run check:build`; the DoD
  command set is unchanged in shape.
- `.htmlvalidate.json` codifies "what we know is fine vs. what's a
  real regression." Each disabled rule has a one-line justification
  in this ADR; agents tempted to re-enable a rule should read the
  matching bucket above first.
- A future a11y arm (real-browser axe-core / pa11y) re-enables the
  WCAG subset and adds genuine accessibility coverage. That work
  gets its own ADR.
- The sensor's runtime is bounded by file count in `out/` and is
  fast in practice (hundreds of HTML files in <2s).
