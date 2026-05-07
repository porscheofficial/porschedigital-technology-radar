# Technology Radar Generator

## Project

A **100% statically exported** Next.js site that visualizes the Porsche Digital technology radar. No server, no API calls, no runtime data fetching. Everything is baked at build time.

- **Framework**: Next.js 16 (Pages Router, NOT App Router)
- **UI**: React 19, TypeScript 6, SCSS Modules, Porsche Design System (PDS)
- **Output**: `next build` produces a flat static site in `out/` for GitHub Pages
- **Linter/Formatter**: Biome (replaces ESLint + Prettier)
- **Tests**: Vitest + React Testing Library
- **Commit hooks**: Husky + lint-staged (Biome) + commitlint (conventional)

## Architecture

### Routes (Pages Router)
- `src/pages/` — Pages Router rules (no `.test.tsx` inside)
- `src/app/sitemap.ts` — ONLY App Router file.

### Component Architecture
- **`Icons/`**: Auto-generated SVGs — gitignored.
- **`SafeHtml`**: Error boundary for `dangerouslySetInnerHTML`.
- `RadarHighlightContext` manages highlight state. `useRadarTooltip` manages tooltips.

## Commands

> See [docs/HARNESS.md](../../docs/HARNESS.md) for details on the full `check:*` suite.

```bash
pnpm run dev            # Dev server (portless)
pnpm run build:data     # Rebuild data/data.json from markdown
pnpm run build:icons    # Rebuild Icons/ from src/icons/ SVGs
pnpm run validate       # Validate frontmatter (Zod schema)
```

## Definition of Done

> See [docs/HARNESS.md](../../docs/HARNESS.md) for details.

**Every code change is incomplete until ALL of the following pass:**
`pnpm run lint && pnpm run typecheck && pnpm run test && pnpm run check:arch && pnpm run check:sec && pnpm run check:quality && pnpm run check:a11y && pnpm run build`

## Steering Harness

> See [docs/HARNESS.md](../../docs/HARNESS.md) for details on the full invariant suite (feedforward, source-only, build-output, security, clean-code, a11y).

*Security Gotchas:*
- `pnpm run check:sec:sanitize` delegates into this package.
- `check:sec:deps`, `check:sec:secrets`, and `check:sec:licenses` are **root-only scripts** (defined in workspace-root `package.json`). Run them via `pnpm run check:sec` from the repo root.
- `osv-scanner` and `trufflehog` are not in devDependencies — they are Go binaries. Local devs install via Homebrew.

### Test Coverage Requirement

MANDATORY: Every code change that adds or modifies logic MUST include corresponding tests.
**Test file location rules:**
- Component tests: `ComponentName/__tests__/ComponentName.test.tsx`
- Page tests: `src/__tests__/pages/[name].test.tsx` (NEVER inside `src/pages/` — see Pitfall #1)
- Lib tests: `src/lib/__tests__/[name].test.ts`
- Hook tests: `src/hooks/__tests__/[name].test.ts`

NEVER mark a task complete if `pnpm run test` fails.
NEVER skip writing tests by saying "tests can be added later."

### Test Quality Requirement

> See [docs/HARNESS.md](../../docs/HARNESS.md) for details.

## Conventions

### Configuration ↔ README Sync

Any change to `data/config.default.json` or `scripts/validateFrontmatter.ts` (new keys, renamed keys, changed defaults, new frontmatter attributes) MUST be reflected in the corresponding section of `README.md` (Configuration tables and/or Front-matter attributes table). Never ship a config or schema change without updating the README.

### Harness Documentation Sync

> See [docs/HARNESS.md](../../docs/HARNESS.md) for details.

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

### Security exemptions

`src/pages/_document.tsx` may keep the one `THEME_INIT_SCRIPT` inline injection: it runs pre-hydration to prevent theme FOUC, is sourced from an in-file constant, and must keep the adjacent Biome exemption comment.

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

> See `.github/workflows/release-please.yml` for mechanics.

What this means in practice:
- **Don't** edit `version` in `package.json` — release-please owns it.
- **Don't** create `chore(...): release ...` commits — they are bot-authored only.
- **Don't** run `npm publish` locally.
- **Don't** push tags by hand.
- **Do** land your work as a regular conventional-commit PR.

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
