# Porsche Digital Technology Radar

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
  ├─ preScanBlipLookup()    (pass 1: extract id→quadrant map from frontmatter)
  └─ parseDirectory()       (pass 2: full markdown→HTML with wiki-link resolution)
        |
        v
scripts/remarkWikiLink.ts   (remark plugin: [[id]] / [[id|label]] → internal links)
        |
        v
data/data.json              (generated, gitignored)
        |
        v
src/lib/data.ts             (typed accessors: getItems, getQuadrants, getRings, ...)
        |
        v
Pages & Components          (import data at module level, no runtime fetching)
```

`data/config.default.json` + `data/config.json` are deep-merged by `src/lib/config.ts` (colors, labels, toggles only).

### Routes (Pages Router)

| Route                        | File                                      | Description                          |
| ---------------------------- | ----------------------------------------- | ------------------------------------ |
| `/`                          | `src/pages/index.tsx`                     | Full radar SVG + filters             |
| `/history`                   | `src/pages/history.tsx`                   | Changelog: trajectory matrix + diffs |
| `/help-and-about-tech-radar` | `src/pages/help-and-about-tech-radar.tsx` | About page                           |
| `/[quadrant]`                | `src/pages/[quadrant]/index.tsx`          | Quadrant detail with mini-radar      |
| `/[quadrant]/[id]`           | `src/pages/[quadrant]/[id].tsx`           | Item detail with revisions           |
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
  data.json          Generated (gitignored) — run `npm run build:data`

scripts/             Build-time scripts (buildData.ts, validateFrontmatter.ts, positioner.ts, errorHandler.ts)
bin/                 CLI entry point (techradar.ts — citty + consola + execa + chokidar)
```

### Component Architecture

- **`Layout`**: Header/main/footer shell, wraps all pages
- **`Radar`** + **`Chart`** + **`Blip`** + **`Label`**: Full radar SVG visualization
- **`QuadrantRadar`** + **`QuadrantChart`**: Zoomed single-quadrant view
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

Shared between `Radar` and `QuadrantRadar`. Manages tooltip positioning, visibility, RAF-based animation, and persistent tooltips synced with `highlightedIds` from context.

## Commands

```bash
npm run dev            # Dev server (portless)
npm run build          # Full static build → out/
npm run build:data     # Rebuild data/data.json from markdown
npm run build:icons    # Rebuild Icons/ from src/icons/ SVGs
npm run validate       # Validate frontmatter (Zod schema)
npm run lint           # Biome check (lint + format)
npm run lint:fix       # Biome check --write (auto-fix)
npm run format         # Biome format --write
npm run test           # Vitest run (all tests)
npm run test:watch     # Vitest watch mode
npm run test:coverage  # Vitest with coverage
```

### Verification (run after any code change)

```bash
npm run lint           # 0 errors, 0 warnings
npx tsc --noEmit       # 0 errors
npm run test           # All pass
npm run build          # Static export succeeds
```

## Definition of Done

**Every code change is incomplete until ALL of the following pass:**

1. `npm run lint` — 0 errors, 0 warnings
2. `npx tsc --noEmit` — 0 type errors
3. `npm run test` — all pass, no skipped tests (includes architecture invariants)
4. `npm run check:arch` — architecture invariants hold (see "Steering Harness" below)
5. `npm run build` — static export succeeds

## Steering Harness

This repo runs a two-arm steering harness for agent work:

**Feedforward** — per-directory `AGENTS.md` files teach the rules at point-of-entry:

- `src/pages/AGENTS.md` — Pages Router rules
- `src/app/AGENTS.md` — App Router scoped to `sitemap.ts`
- `src/components/AGENTS.md` — Folder shape, SCSS Modules, PDS, `SafeHtml`, `assetUrl`
- `src/lib/AGENTS.md` — Module roles, no cycles, single data importer
- `src/__tests__/AGENTS.md` — Out-of-tree test placement
- `scripts/AGENTS.md` — Build-time tooling, schema↔README invariant
- `data/AGENTS.md` — Frontmatter, config, wiki links

**Feedback (source-only)** — `npm run check:arch` enforces the same rules without needing a build:

- `npm run check:arch:depcruise` — dependency-cruiser (`.dependency-cruiser.cjs`): import-graph rules (data accessor, no `next/image`, no CSS-in-JS, no runtime fetching, no Next server APIs (`next/headers|cache|server`, `server-only`), app-router scope, no cross-page imports, no cycles). **Ban-rule patterns match resolved paths under `node_modules/...`, not bare specifiers** — see the banner comment in `.dependency-cruiser.cjs` before adding new bans.
- `npm run check:arch:eslint` — ESLint flat config (`eslint.config.js`, lint-only): bans `as any` / `@ts-ignore`, requires `assetUrl()` for absolute URLs, restricts `dangerouslySetInnerHTML` to `SafeHtml.tsx`. Also runs `@next/eslint-plugin-next` (recommended set, with `no-img-element` and `no-html-link-for-pages` disabled — see ADR-0003 and the header of `eslint.config.js`).
- `npm run check:arch:readme` — `scripts/checkConfigReadmeSync.ts`: every `data/config.default.json` leaf key and every Zod field in `validateFrontmatter.ts` must appear in `README.md`.
- `npm run check:arch:doccoverage` — `scripts/checkDocCoverage.ts`: every `(Checked: …)` reference inside any `AGENTS.md` must point at a real dep-cruiser rule, architecture test, eslint rule, or npm script. Catches stale citations when rules get renamed or removed.
- `src/__tests__/architecture/architecture.test.ts` — fs-based invariants: no `.test.tsx` in `src/pages/`, `src/app/` only contains `sitemap.ts`, component folder shape, no `pages/api`, no `middleware.ts`.

**Feedback (build-output)** — `npm run check:build` validates the static export in `out/`. Run after `npm run build`:

- `npm run check:build:routes` — `scripts/checkBuildOutput.ts`: asserts every expected route file exists in `out/` (statics, quadrant indexes, item pages from `data.json`). Closes the static-export contract: no silent route drops.
- `npm run check:build:links` — `linkinator` (config in `linkinator.config.json`): crawls the built site from `out/index.html` and fails on broken internal links. External URLs are skipped via the `^https?://(?!localhost)` pattern.
- `npm run check:build:budget` — `scripts/checkBundleBudget.ts`: walks `out/_next/static/` and asserts total JS, total CSS, and per-chunk sizes stay under the caps in `bundle-budget.json`. Bumping the budget is a deliberate, diffable act — see ADR-0005.

When a check fails, read its rule's `comment` (dep-cruiser) or message (ESLint/scripts) — each cites the AGENTS.md doc that explains why.

**Architecture Decision Records** — `docs/decisions/` holds short, dated ADRs explaining *why* the load-bearing rules exist (Pages Router not App Router, static export, no `next/image`, the `format.ts ↛ data.ts` cycle break). When tempted to revisit a rule, read the matching ADR first. New irreversible decisions get a new ADR; see `docs/decisions/README.md` for the format.

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

NEVER mark a task complete if `npm run test` fails.
NEVER skip writing tests by saying "tests can be added later."

## Conventions

### Configuration ↔ README Sync

Any change to `data/config.default.json` or `scripts/validateFrontmatter.ts` (new keys, renamed keys, changed defaults, new frontmatter attributes) MUST be reflected in the corresponding section of `README.md` (Configuration tables and/or Front-matter attributes table). Never ship a config or schema change without updating the README.

### Harness Documentation Sync

`docs/HARNESS.md` is a teaching artifact that describes the live harness with diagrams, sensor inventory, and the change-lifecycle map. It is used as a worked example for talks and onboarding, so it must not drift from reality. Any change to **any** of the following requires an in-PR update to `docs/HARNESS.md`:

- A `check:arch:*` or `check:build:*` script (added, removed, renamed)
- A `.dependency-cruiser.cjs` rule (added, removed, semantic change)
- An `eslint.config.js` architectural rule
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
- Run `npm run lint:fix` before committing (also runs via lint-staged)

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

## Pitfalls

1. **Page tests must NOT live in `src/pages/`** — Turbopack treats any `.tsx` in pages as a route. Put them in `src/__tests__/pages/`.
2. **Icons are gitignored and auto-generated** — `npm run build:icons` or `postinstall` rebuilds them. Never edit `src/components/Icons/` manually.
3. **`data/data.json` is gitignored** — must run `npm run build:data` after changing any `data/radar/**/*.md` files.
4. **PostCSS config is CJS** — `postcss.config.js` uses `require()`. Vitest overrides it with empty config to avoid plugin resolution issues.
5. **Date strings need `T00:00:00` suffix** — `toSafeDate()` in `format.ts` handles this. Raw date strings like `"2024-03"` parsed without the suffix will shift timezones.
6. **Config deep-merge is manual** — only `colors`, `labels`, and `toggles` keys are deep-merged between `config.default.json` and `config.json`. Other keys are shallow-replaced.
7. **Module-level data imports are intentional** — `data.ts` accessors read from the statically imported `data.json`. This is safe because all data is available at build time.
8. **All links and asset URLs must use `assetUrl()`** — The site is deployed under a configurable `basePath` (e.g., `/technology-radar`). Never hardcode `href="/"` or `href={`/${slug}`}` — always wrap with `assetUrl()` from `@/lib/utils` (e.g., `assetUrl("/")`, `assetUrl(`/${quadrant.id}`)`) so links work correctly in all deployment environments.
