# Technology Radar Generator

## Project

A **100% statically exported** Next.js site that visualizes the Porsche Digital technology radar. No server, no API calls, no runtime data fetching. Everything is baked at build time.

- **Framework**: Next.js 16 (Pages Router, NOT App Router)
- **UI**: React 19, TypeScript 5, SCSS Modules, Porsche Design System (PDS)
- **Output**: `next build` produces a flat static site in `out/` for GitHub Pages
- **Linter/Formatter**: Biome (replaces ESLint + Prettier)
- **Tests**: Vitest + React Testing Library
- **Commit hooks**: Husky + lint-staged (Biome) + commitlint (conventional)

## Architecture

### Data Flow

```
data/radar/**/*.md          (frontmatter + markdown per item)
        |
        v
scripts/validateFrontmatter.ts (Zod schema + frontmatter validation — shared)
        |
        v
scripts/buildData.ts        (@11ty/gray-matter + unified/rehype + consola)
  ├─ preScanBlipLookup()    (pass 1: extract id→segment map from frontmatter)
  └─ parseDirectory()       (pass 2: full markdown→HTML with wiki-link resolution)
        |
        v
scripts/remarkWikiLink.ts   (remark plugin: [[id]] / [[id|label]] → internal links)
        |
        v
data/data.json              (generated, gitignored)
        |
        v
src/lib/data.ts             (typed accessors: getItems, getSegments, getRings, ...)
        |
        v
Pages & Components          (import data at module level, no runtime fetching)
```

`data/config.default.json` + `data/config.json` are deep-merged by `src/lib/config.ts` (colors, labels, toggles only).

### Routes (Pages Router)

| Route                        | File                                      | Description                          |
| ---------------------------- | ----------------------------------------- | ------------------------------------ |
| `/`                          | `src/pages/index.tsx`                     | Full radar SVG + filters             |
| `/changelog`                 | `src/pages/changelog.tsx`                 | Changelog: trajectory matrix + diffs |
| `/help-and-about-tech-radar` | `src/pages/help-and-about-tech-radar.tsx` | About page                           |
| `/[segment]`                | `src/pages/[segment]/index.tsx`          | Segment detail with mini-radar      |
| `/[segment]/[id]`           | `src/pages/[segment]/[id].tsx`           | Item detail with revisions           |
| `/404`                       | `src/pages/404.tsx`                       | Custom 404                           |

`src/app/sitemap.ts` is the ONLY App Router file (hybrid for sitemap generation).

### Key Directories

```
src/
  pages/             Next.js pages (routes)
  components/        React components (each in named folder with .tsx + .module.scss)
  hooks/             Custom hooks (useRadarTooltip)
  lib/               Core logic: types, data accessors, config, format, utils, blipIcons
  styles/            Global SCSS (variables, PDS overrides)
  test/              Vitest setup
  __tests__/         Page integration tests (kept outside pages/ to avoid Turbopack issues)
  app/               Single file: sitemap.ts

data/
  radar/             Markdown source files (items)
  config.json        User config overrides
  config.default.json  Default config (DO NOT edit for customization)
  about.md / about.json  About page content
  data.json          Generated (gitignored) — run `pnpm run build:data`

scripts/             Build-time scripts (buildData.ts, validateFrontmatter.ts, positioner.ts, errorHandler.ts)
bin/                 CLI entry point (techradar.ts — citty + consola + execa + chokidar)
```

### Component Architecture

- **`Layout`**: Header/main/footer shell, wraps all pages
- **`Radar`** + **`Chart`** + **`Blip`** + **`Label`**: Full radar SVG visualization
- **`SegmentRadar`** + **`SegmentChart`**: Zoomed single-segment view
- **`RadarFilters`**: Flag/tag/team filter pills
- **`SearchBar`**: Combobox with abbreviation matching and highlight
- **`ItemDetail`**: Item page body with revision history
- **`Badge`**: Ring/flag indicators
- **`Tags`** / **`Teams`**: PDS tag wrappers
- **`SafeHtml`**: Error boundary for `dangerouslySetInnerHTML` content
- **`Footer`**: Social links, logo, imprint
- **`Icons/`**: Auto-generated (28 SVGs via @svgr/cli) — gitignored, rebuilt on `postinstall`

### Shared State

`RadarHighlightContext` (useReducer) manages cross-cutting highlight state for search, filters, and hover interactions. Actions: `setHighlight`, `toggleFlag`, `toggleTag`, `toggleTeam`.

### Hook: `useRadarTooltip`

Shared between `Radar` and `SegmentRadar`. Manages tooltip positioning, visibility, RAF-based animation, and persistent tooltips synced with `highlightedIds` from context.

## Commands

```bash
pnpm run dev            # Dev server (portless)
pnpm run build          # Full static build → out/
pnpm run build:data     # Rebuild data/data.json from markdown
pnpm run build:icons    # Rebuild Icons/ from src/icons/ SVGs
pnpm run validate       # Validate frontmatter (Zod schema)
pnpm run lint           # Biome check (lint + format)
pnpm run lint:fix       # Biome check --write (auto-fix)
pnpm run format         # Biome format --write
pnpm run test           # Vitest run (all tests)
pnpm run test:watch     # Vitest watch mode
pnpm run test:coverage  # Vitest with coverage
```

### Verification (run after any code change)

```bash
pnpm run lint           # 0 errors, 0 warnings
npx tsc --noEmit       # 0 errors (or run `pnpm run typecheck` from the repo root to fan out across all packages)
pnpm run test           # All pass
pnpm run build          # Static export succeeds
```

## Definition of Done

**Every code change is incomplete until ALL of the following pass:**

1. `pnpm run lint` — 0 errors, 0 warnings
2. `npx tsc --noEmit` — 0 type errors (or `pnpm run typecheck` from the repo root)
3. `pnpm run test` — all pass, no skipped tests (includes architecture invariants)
4. `pnpm run check:arch` — architecture invariants hold (see "Steering Harness" below)
5. `pnpm run check:sec` — security invariants hold (see "Steering Harness" below). Runs from the repo root: `:sanitize` delegates into this package, `:deps`/`:secrets`/`:licenses` are root-only workspace scans.
6. `pnpm run check:quality` — clean-code invariants hold (see "Steering Harness" below)
7. `pnpm run check:a11y` — accessibility invariants hold (see "Steering Harness" below)
8. `pnpm run build` — static export succeeds

## Steering Harness

This repo runs a five-arm steering harness for agent work:

**Feedforward** — per-directory `AGENTS.md` files teach the rules at point-of-entry:

- `src/pages/AGENTS.md` — Pages Router rules
- `src/app/AGENTS.md` — App Router scoped to `sitemap.ts`
- `src/components/AGENTS.md` — Folder shape, SCSS Modules, PDS, `SafeHtml`, `assetUrl`
- `src/lib/AGENTS.md` — Module roles, no cycles, single data importer
- `src/__tests__/AGENTS.md` — Out-of-tree test placement
- `scripts/AGENTS.md` — Build-time tooling, schema↔README invariant
- `data/AGENTS.md` — Frontmatter, config, wiki links

**Feedback (source-only)** — `pnpm run check:arch` enforces the same rules without needing a build:

- `pnpm run check:arch:depcruise` — dependency-cruiser (`.dependency-cruiser.cjs`): import-graph rules (data accessor, no `next/image`, no CSS-in-JS, no runtime fetching, no Node.js built-ins in `src/` (prevents `node:fs` etc. leaking into client bundle), no Next server APIs (`next/headers|cache|server`, `server-only`), app-router scope, no cross-page imports, no cycles). **Ban-rule patterns match resolved paths under `node_modules/...`, not bare specifiers** — see the banner comment in `.dependency-cruiser.cjs` before adding new bans.
- `pnpm run check:arch:eslint` — ESLint flat config (`eslint.config.mjs`, lint-only): bans `as any` / `@ts-ignore`, requires `assetUrl()` for absolute URLs, restricts `dangerouslySetInnerHTML` to `SafeHtml.tsx`. Also runs `@next/eslint-plugin-next` (recommended set, with `no-img-element` and `no-html-link-for-pages` disabled — see ADR-0003 and the header of `eslint.config.mjs`).
- `pnpm run check:arch:readme` — `scripts/checkConfigReadmeSync.ts`: every `data/config.default.json` leaf key and every Zod field in `validateFrontmatter.ts` must appear in `README.md`.
- `pnpm run check:arch:doccoverage` — `scripts/checkDocCoverage.ts`: every `(Checked: …)` reference inside any `AGENTS.md` must point at a real dep-cruiser rule, architecture test, eslint rule, or npm script. Catches stale citations when rules get renamed or removed.
- `pnpm run check:arch:wikilinks` — `scripts/checkWikiLinks.ts`: walks every `data/radar/**/*.md` and asserts every `[[id]]` / `[[id|label]]` resolves to a known blip via `preScanBlipLookup`. Source-only and side-effect-free: `scripts/buildData.ts` guards its `main()` with `if (require.main === module)` so importing the lookup doesn't trigger a full data build. See ADR-0012.
- `pnpm run check:arch:adr` — `scripts/checkAdrUnique.ts`: walks `docs/decisions/` (workspace root, not package-relative) and asserts every ADR file's leading number is unique and matches its `# ADR-NNNN …` heading. Catches duplicate ADR numbers introduced by parallel branches.
- `src/__tests__/architecture/architecture.test.ts` — fs-based invariants: no `.test.tsx` in `src/pages/`, `src/app/` only contains `sitemap.ts`, component folder shape, no `pages/api`, no `middleware.ts`.

**Feedback (build-output)** — `pnpm run check:build` validates the static export in `out/`. Run after `pnpm run build`:

- `pnpm run check:build:routes` — `scripts/checkBuildOutput.ts`: asserts every expected route file exists in `out/` (statics, segment indexes, item pages from `data.json`). Closes the static-export contract: no silent route drops.
- `pnpm run check:build:links` — `linkinator` (config in `linkinator.config.json`): crawls the built site from `out/index.html` and fails on broken internal links. External URLs are skipped via the `^https?://(?!localhost)` pattern.
- `pnpm run check:build:budget` — `scripts/checkBundleBudget.ts`: walks `out/_next/static/` and asserts total JS, total CSS, and per-chunk sizes stay under the caps in `bundle-budget.json`. Bumping the budget is a deliberate, diffable act — see ADR-0005.
- `pnpm run check:build:html` — `scripts/checkHtmlValidate.ts` + `.htmlvalidate.json`: runs `html-validate` against `out/**/*.html`. Catches structural HTML errors (unclosed tags, duplicate ids, mismatched nesting) and markdown-layer escapes that bypass the source sanitizer. The disabled-rule set is curated for Next.js / React / PDS framework output; WCAG checks are deferred to a future real-browser a11y arm. Wrapper uses `node:child_process` `spawnSync` (execa 9 fails on Node 25 + tsx). See ADR-0014.
- `pnpm run check:build:no-node-builtins` — `scripts/checkNoNodeBuiltins.ts`: scans every JS file under `out/_next/static/chunks/` for Turbopack's "Cannot find module 'node:…'" error stubs. Catches Node.js built-in modules that leaked into the client bundle from any source — `next.config.js`, transitive dependencies, or framework internals. The source-only `no-node-builtins-in-src` dep-cruiser rule covers `src/` imports but cannot catch leaks from config files that Turbopack serializes into client chunks.

**Feedback (security)** — `pnpm run check:sec` enforces the security invariants. See ADR-0006 for the full rationale. The aggregator lives at the repo root and orchestrates two layers: `pnpm -r --if-present run check:sec` delegates the package-local sanitize sensor into this package, while `check:sec:deps`, `check:sec:secrets`, and `check:sec:licenses` are **root-only scripts** (defined in the workspace-root `package.json`) that scan the whole workspace lockfile / git history / dependency tree and never delegate per-package. Run them via `pnpm run check:sec` from the repo root.

- `pnpm run check:sec:sanitize` — `scripts/checkSanitize.ts`: asserts `rehype-sanitize` is imported and runs immediately after `remarkRehype` in `scripts/buildData.ts`, and that `allowDangerousHtml: true` appears nowhere in the file. Companion XSS regression suite in `scripts/__tests__/sanitize.test.ts` feeds `<script>`, `<iframe>`, inline event handlers, and `javascript:` URIs through the real pipeline. Two-layer defense: `remarkRehype` is called without `allowDangerousHtml`, and `rehypeSanitize` strips anything that slips through. (Package-local — runs from this package's `package.json`.)
- `pnpm run check:sec:deps` — *(root-only)* `osv-scanner --lockfile=pnpm-lock.yaml`: queries the public OSV.dev database for known CVEs in the npm graph. **Requires `osv-scanner` on PATH** (`brew install osv-scanner`). CI uses `google/osv-scanner-action`.
- `pnpm run check:sec:secrets` — *(root-only)* `trufflehog git file://. --no-update --fail --results=verified,unknown`: scans git history for committed secrets and API tokens, verifying matches against the live API of each provider. **Requires `trufflehog` on PATH** (`brew install trufflehog`). CI uses `trufflesecurity/trufflehog`. See ADR-0011 for the rationale (replaces gitleaks per ADR-0006 to avoid the gitleaks-action license gate).
- `pnpm run check:sec:licenses` — *(root-only)* `license-checker-rseidelsohn --start packages/techradar --production --excludePackages '<self>' --failOn 'GPL;AGPL;LGPL;SSPL;BUSL;CC-BY-NC'`: walks production dependencies of the techradar package and fails on copyleft (GPL/AGPL/LGPL), source-availability (SSPL/BUSL), and non-commercial (CC-BY-NC) license families. `--production` excludes devDependencies (build-time tools don't ship to users). `--excludePackages` skips the project's own self-listing — string must follow `package.json` version bumps. See ADR-0013.

`osv-scanner` and `trufflehog` are deliberately NOT in `devDependencies` — they are Go binaries with no useful npm wrapper. CI runs the official actions; local devs install via Homebrew. Without them installed, the `:deps` and `:secrets` sensors exit with `command not found`. The `:sanitize` sensor needs no extra binary and is the primary local feedback loop.

Plus an advisory (non-gating) workflow: `.github/workflows/scorecard.yml` runs OpenSSF Scorecard weekly and uploads SARIF to GitHub's code-scanning UI.

**Feedback (clean-code)** — `pnpm run check:quality` enforces clean-code invariants. See ADR-0007 for the full rationale.

- `pnpm run check:quality:knip` — [knip](https://knip.dev/): detects unused files, unused exports, unused dependencies, and unlisted dependencies/binaries. Config in `knip.json` (entry points, project glob, `ignoreBinaries` for `osv-scanner` and `trufflehog` which are system binaries per ADR-0006 / ADR-0011). Fail the build on any finding — the correct response is either to delete the dead code, declare the dep, or widen the ignore list with a justifying commit.
- `pnpm run check:quality:jscpd` — [jscpd](https://github.com/kucherenko/jscpd): copy-paste / clone detector. Config in `.jscpd.json` (scope `src/` + `scripts/`, min-tokens 70, threshold 3%, ignores tests + SCSS modules + generated icons). The 3% ceiling allows the documented `Radar` ↔ `SegmentRadar` mirror to stand and trips on new significant duplication. See ADR-0008 for the rationale and rejected alternatives.
- `pnpm run check:quality:naming` — Biome `style/useNamingConvention` (config in `biome.jsonc`): enforces PascalCase for types/components/enums and camelCase for variables/functions/parameters across `src/` and `scripts/`. `strictCase: false` allows externally-dictated names (`PText`, `getXYPosition`, `JSON`, `IP`); test files are exempted via override since mock factories must mirror real PascalCase exports verbatim. Sensor uses `--only=` + `--diagnostic-level=error` to scope failures to source code while keeping test infos quiet. See ADR-0009.
- `pnpm run check:quality:sonar` — [eslint-plugin-sonarjs](https://github.com/SonarSource/SonarJS): code-smell detector run through a dedicated flat config (`sonar.eslint.config.mjs`) so smell findings stay separate from `check:arch:eslint`'s architectural bans. Uses the `recommended` preset (~200 syntactic rules — cognitive complexity, dead stores, nested ternaries/functions, regex-injection, prototype pollution). Three rules disabled with rationale: `slow-regex` (build-time on trusted markdown), `pseudo-random` (visual blip jitter), `redundant-type-aliases` (intentional domain aliases). Two real smells suppressed per-line with `eslint-disable-next-line` citing the ADR. The architectural ESLint config loads the sonarjs plugin without enabling rules and sets `reportUnusedDisableDirectives: "off"` so per-line disables don't fail the arch arm. See ADR-0010.
- `pnpm run check:quality:coverage` — `vitest run --coverage` with v8-provider thresholds in `vitest.config.ts` (lines 55, statements 55, branches 55, functions 60). Floors are set at the current measured baseline, not aspirational — bumping a floor is a deliberate diffable act per ADR-0008's anti-aspirational pattern. Vitest applies thresholds only when `--coverage` is enabled, so `pnpm test` (without coverage) is unaffected. See ADR-0015.
- `pnpm run check:quality:spell` — [cspell](https://cspell.org/) on `**/*.md` only. Both `en` and `en-US` are accepted languages. Project-specific terms live in `cspell-words.txt`; generated content (`out/`, lock files, JSON, SVG, generated `Icons/`, `data/data.json`) and externally-authored radar items (`data/radar/**`) are excluded via `.cspell.json` `ignorePaths`. When a new ADR or HARNESS update introduces a new technical term, the gate fires; resolution is to add the term to `cspell-words.txt` in the same PR. See ADR-0016.

**Feedback (a11y)** — `pnpm run check:a11y` enforces the accessibility invariants. See ADR-0018 for the full rationale.

- `pnpm run check:a11y:source` — [eslint-plugin-jsx-a11y](https://github.com/jsx-eslint/eslint-plugin-jsx-a11y) via a dedicated flat config (`a11y.eslint.config.mjs`) so a11y findings stay separate from `check:arch:eslint`'s architectural bans (mirrors the `sonar.eslint.config.mjs` split per ADR-0010). Runs the `recommended` ruleset against `src/**/*.{jsx,tsx}` to catch source-level a11y mistakes (missing `alt`, invalid ARIA, label-control associations, keyboard-handler pairing).
- `pnpm run check:a11y:axe` — `scripts/checkA11y.ts`: walks every `out/**/*.html` and runs [axe-core](https://github.com/dequelabs/axe-core) inside a `jsdom` window. Fails on `serious` and `critical` impact only; lower severities are reported as info and do not block. A small set of axe rules is disabled at the sensor level with inline rationale (e.g. `color-contrast` needs a real browser, `landmark-one-main`/`region`/`page-has-heading-one` produce noise on PDS shells pre-hydration per ADR-0014). The thresholds are anti-aspirational per ADR-0008/0015 — bumping the policy is a deliberate diffable act.

When a check fails, read its rule's `comment` (dep-cruiser) or message (ESLint/scripts) — each cites the AGENTS.md doc that explains why.

**Architecture Decision Records** — `docs/decisions/` holds short, dated ADRs explaining *why* the load-bearing rules exist (Pages Router not App Router, static export, no `next/image`, the `format.ts ↛ data.ts` cycle break, the security harness). When tempted to revisit a rule, read the matching ADR first. New irreversible decisions get a new ADR; see `docs/decisions/README.md` for the format.

### Test Coverage Requirement

MANDATORY: Every code change that adds or modifies logic MUST include corresponding tests.

**What requires a test:**

- New functions in `src/lib/` → unit test in `src/lib/__tests__/`
- New/modified React components → RTL test in `ComponentName/__tests__/`
- New/modified pages → integration test in `src/__tests__/pages/`
- New hooks → test in `src/hooks/__tests__/`
- Bug fixes → regression test that would have caught the bug

**What does NOT require a new test:**

- Pure style/SCSS changes
- Config file changes (`biome.jsonc`, `tsconfig.json`, etc.)
- Documentation updates
- Regenerated files (`src/components/Icons/`, `data/data.json`)

**Test file location rules:**

- Component tests: `ComponentName/__tests__/ComponentName.test.tsx`
- Page tests: `src/__tests__/pages/[name].test.tsx` (NEVER inside `src/pages/` — see Pitfall #1)
- Lib tests: `src/lib/__tests__/[name].test.ts`
- Hook tests: `src/hooks/__tests__/[name].test.ts`

NEVER mark a task complete if `pnpm run test` fails.
NEVER skip writing tests by saying "tests can be added later."

### Test Quality Requirement

A test that exists is not the same as a test that matters. When the same author writes the implementation and its tests in one sitting — humans do this; AI agents do this constantly — both can encode the same wrong assumption, both pass, and the bug ships green. Coverage tools, type checks, and lint do not detect this failure mode. The discipline below does.

**The failure pattern.** Tests verify *the procedure described by the implementation* instead of *the contract demanded by the requirement*. They mirror the code instead of pinning it down. Symptoms: every test is a parametrized re-statement of the function body; flipping a key line in the implementation does not break any test; the requirement (in the user's words) does not appear as an executable assertion anywhere.

**Three checks that must hold before declaring a change done:**

1. **The requirement appears as a test.** Take the user's stated intent — verbatim if possible — and confirm at least one test fails when that intent is violated. If the requirement is *"X must agree with Y"*, the test asserts `X === Y` on real or representative data, not on hand-built fixtures that already encode the agreement. If the requirement is *"the latest revision determines the arc"*, the test feeds inputs where "latest" is unambiguous in the runtime data shape, not in the convenient reading order of a fixture.

2. **Cross-component contracts have consistency tests.** Whenever two functions are documented as agreeing (radar arc ↔ history page, encoder ↔ decoder, getter ↔ setter, build-time data ↔ runtime accessor), there must be one test that asserts the agreement directly, iterating real or representative items and failing if the two ever disagree. Per-function unit tests on each side individually do not catch drift between them.

3. **Mental mutation check.** Before claiming done, pick the most load-bearing line of the change and ask: *"if I flipped this — `revisions[0]` to `revisions[length-1]`, `<` to `<=`, `&&` to `||`, the order of two arguments — would any test fail?"* If the answer is *"no, but the requirement would be violated"*, the tests are inadequate and must be strengthened before commit. This is poor-man's mutation testing as a thinking step; it costs nothing and catches the failure pattern at the moment of authorship.

**Anti-patterns that signal a weak test:**

- The test fixture is structured the way the implementation iterates it (oldest-first when the function reads index `length-1`, newest-first when it reads index `0`) instead of the way the *runtime data* is shaped. The fixture and the implementation should agree because both follow reality, not because they were written together.
- The test name describes the function's behavior (`returns null when previousRing is undefined`) instead of the requirement (`does not render an arc for description-only edits`). Behavioral names tend to lock in the implementation; requirement names tend to lock in the contract.
- A bug fix ships without a test that, applied to the original buggy implementation, fails. If the test passes against both the broken and the fixed code, it is not a regression test — it is decoration.

**Conventions for high-leverage code.** In `src/lib/` (the load-bearing pure-logic layer) and `scripts/` (build-time pipeline), prefer one *named helper* per non-obvious convention over scattering the assumption across call sites. The helper's docstring becomes the convention's home, and a single test pins it. See `getLatestRevision` in `src/lib/data.ts` as the canonical example: revisions are persisted newest-first by `scripts/buildData.ts`, and that fact lives in exactly one place that consumers MUST go through.

This subsection is enforced by author discipline, not by a sensor. The harness can prove that *some* test exists (coverage thresholds in `vitest.config.ts`); it cannot prove the test means anything. That proof is your job, every time.

## Conventions

### Configuration ↔ README Sync

Any change to `data/config.default.json` or `scripts/validateFrontmatter.ts` (new keys, renamed keys, changed defaults, new frontmatter attributes) MUST be reflected in the corresponding section of `README.md` (Configuration tables and/or Front-matter attributes table). Never ship a config or schema change without updating the README.

### Harness Documentation Sync

`docs/HARNESS.md` is a teaching artifact that describes the live harness with diagrams, sensor inventory, and the change-lifecycle map. It is used as a worked example for talks and onboarding, so it must not drift from reality. Any change to **any** of the following requires an in-PR update to `docs/HARNESS.md`:

- A `check:arch:*` or `check:build:*` or `check:sec:*` or `check:quality:*` or `check:a11y:*` script (added, removed, renamed)
- A `.dependency-cruiser.cjs` rule (added, removed, semantic change)
- An `eslint.config.mjs` architectural rule
- A `scripts/check*.ts` sensor
- An `AGENTS.md` file (added, removed)
- An invariant bucket in the seven-row table (sensor or doc citation changes)

If the harness gains an inferential sensor (skill, LLM judge), update Section 7 to move it from "not yet" into the inventory.

### TypeScript

- Strict mode, no `any` (except test mock factories)
- Never use `as any`, `@ts-ignore`, `@ts-expect-error`
- Prefer `unknown` over `any` for untyped data
- All types in `src/lib/types.ts`; data accessors in `src/lib/data.ts`
- Path alias: `@/*` maps to `./src/*`

### Formatting (Biome)

- 2-space indent, 80-char line width, double quotes, semicolons, trailing commas
- `organizeImports: "on"` — Biome sorts imports automatically
- Run `pnpm run lint:fix` before committing (also runs via lint-staged)

### Commits

Conventional commits enforced by commitlint. Allowed types:
`feat`, `sec`, `fix`, `bug`, `test`, `refactor`, `rework`, `ops`, `ci`, `cd`, `build`, `doc`, `perf`, `chore`, `update`

### Components

- One component per folder: `ComponentName/ComponentName.tsx` + `ComponentName.module.scss`
- SCSS Modules for styling (not CSS-in-JS, not Tailwind)
- Use Porsche Design System (`@porsche-design-system/components-react`) components where applicable
- Class names via `cn()` helper from `@/lib/utils` (clsx wrapper)

### Testing

- Vitest + React Testing Library + jsdom
- Test files: `__tests__/` folders colocated with source OR `src/__tests__/pages/` for page tests
- Mock modules with `vi.mock()` — mock `@/lib/data` and `@/lib/config` for component tests
- PDS web components render as their tag names in jsdom (e.g., `<p-heading>`)

### Static Export Constraints

- No `getServerSideProps`, no API routes, no middleware
- `getStaticProps` returns `{ props: {} }` — data imported at module level
- `getStaticPaths` uses `fallback: false`
- `next/image` is NOT used (static export + user-provided URLs)
- `assetUrl()` helper prepends `basePath` from config

## Release process

**Releases are fully automated. Never bump versions, never `npm publish`, never write `chore: release` commits by hand.**

The mechanics ([`.github/workflows/release-please.yml`](../../.github/workflows/release-please.yml), [`release-please-config.json`](../../release-please-config.json), [`.release-please-manifest.json`](../../.release-please-manifest.json)):

1. Every push to `main` triggers [release-please](https://github.com/googleapis/release-please-action). It scans new conventional commits since the last release tag, computes the next semver bump from the commit types (`feat` → minor, `fix`/`sec`/`perf`/`refactor`/`rework`/`build`/`ci`/`cd`/`ops`/`update`/`doc`/`test` → patch, `!`/`BREAKING CHANGE` → major), and either opens or updates a "release PR" titled `chore(main): release X.Y.Z`. That PR rewrites `package.json` `version`, `.release-please-manifest.json`, and prepends a `CHANGELOG.md` block.
2. Merging the release PR back into `main` produces the bot's `chore(main): release X.Y.Z` commit on `main` and a matching `vX.Y.Z` git tag.
3. The same workflow's `publish` job then runs (`needs: release-please`, gated on `release_created == 'true'`): it checks out the tagged commit, installs deps with pnpm, installs pinned `npm@11.5.1`, and runs `npm publish` against npmjs.org via OIDC Trusted Publishing. No `NPM_TOKEN`, no human credentials.

What this means in practice:

- **Don't** edit `version` in `package.json` — release-please owns it. (`release-type: node` in `release-please-config.json`.)
- **Don't** create `chore(...): release ...` commits — they are bot-authored only. If you see one, it came from a merged release PR.
- **Don't** run `npm publish` locally. The OIDC publish only works from the GitHub Actions environment.
- **Don't** push tags by hand.
- **Do** land your work as a regular conventional-commit PR (`fix:`, `feat:`, `sec:`, etc. — see allowed types in the Conventions section). Release-please will pick it up on the next push to `main` and roll it into the open release PR.
- For E2E testing against a real consumer with `npm pack`, do it on a throwaway local commit and **revert the version bump** before opening a PR. Local tarball testing must not leak into the committed `package.json`.
- Recovery only: `workflow_dispatch` with `force_publish=true` republishes current `main` HEAD without a release PR. Use only if a publish job failed mid-flight after a release PR already merged.

The only file `release-please-config.json` keeps in sync is `package.json` `version` (its `extra-files` array is empty). Anything else that embeds the version (e.g. the `--excludePackages '@porscheofficial/...@X.Y.Z'` literal in the `check:sec:licenses` script — see ADR-0013) drifts unless either added to `extra-files` or refactored to read the version dynamically. Treat any new "version-shaped string" outside `package.json.version` as a future drift hazard.

## Pitfalls

1. **Page tests must NOT live in `src/pages/`** — Turbopack treats any `.tsx` in pages as a route. Put them in `src/__tests__/pages/`.
2. **Icons are gitignored and auto-generated** — `pnpm run build:icons` or `postinstall` rebuilds them. Never edit `src/components/Icons/` manually.
3. **`data/data.json` is gitignored** — must run `pnpm run build:data` after changing any `data/radar/**/*.md` files.
4. **PostCSS config is CJS** — `postcss.config.js` uses `require()`. Vitest overrides it with empty config to avoid plugin resolution issues.
5. **Date strings need `T00:00:00` suffix** — `toSafeDate()` in `format.ts` handles this. Raw date strings like `"2024-03"` parsed without the suffix will shift timezones.
6. **Config deep-merge is manual** — only `colors`, `labels`, and `toggles` keys are deep-merged between `config.default.json` and `config.json`. Other keys are shallow-replaced.
7. **Module-level data imports are intentional** — `data.ts` accessors read from the statically imported `data.json`. This is safe because all data is available at build time.
8. **All links and asset URLs must use `assetUrl()`** — The site is deployed under a configurable `basePath` (e.g., `/technology-radar`). Never hardcode `href="/"` or `href={`/${slug}`}` — always wrap with `assetUrl()` from `@/lib/utils` (e.g., `assetUrl("/")`, `assetUrl(`/${segment.id}`)`) so links work correctly in all deployment environments.

9. **Back-compat rename (ADR-0028)** — `quadrant` is renamed to `segment` across the codebase. Markdown frontmatter and `config.json` support the old names with build-time warnings. See ADR-0028.
