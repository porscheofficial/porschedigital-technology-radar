# `src/__tests__/` — Out-of-tree Test Suites

Tests that **must not** sit next to source land here.

## Why this directory exists

- **`src/__tests__/pages/`** — Page tests. They cannot live in `src/pages/` because Turbopack treats every `.tsx` in `pages/` as a route.
- **`src/__tests__/architecture/`** — The architecture invariants test (`architecture.test.ts`). This is half of the feedback arm of the steering harness; the other half is `npm run check:arch` (dependency-cruiser + ESLint + README sync).

## Conventions

- Use Vitest + React Testing Library.
- Mock `@/lib/data` and `@/lib/config` at the top of the file with `vi.mock(...)` before imports run.
- For pages that depend on `formatTitle`, mock `@/lib/config` with at least `{ default: { labels: { title: "Test Radar" } } }` — `format.ts` reads the title from config, not from `data.ts`.
- PDS web components render as their tag names in jsdom (e.g., `<p-heading>`). Assert against tag names.

## Where other tests live

- Component tests: colocated in `src/components/Name/__tests__/Name.test.tsx`.
- Lib tests: colocated in `src/lib/__tests__/name.test.ts`.
- Hook tests: colocated in `src/hooks/__tests__/name.test.ts`.

Only put a test here if locality would break the build or the route table.
