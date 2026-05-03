# `src/lib/` — Core Logic

The single source of truth for types, data accessors, config, and helpers. Pages and components import from here, not the other way around.

## Module roles

| File | Role |
| --- | --- |
| `types.ts` | All shared TypeScript types. New types go here, not next to components. |
| `data.ts` | **The ONLY module allowed to import `data/data.json`.** Exposes `getItems`, `getSegments`, `getRings`, etc. (Checked: `.dependency-cruiser.cjs` → `data-accessor-only`.) |
| `config.ts` | Deep-merges `data/config.default.json` + `data/config.json`. Default export is the merged config. |
| `format.ts` | Date/number/title formatting. May read `config` but **must not import from `data.ts`** (would create a cycle). |
| `utils.ts` | `cn()`, `assetUrl()`, small pure helpers. |
| `blipIcons.ts` | Maps blip ids to icon components. |

## Rules

- **Back-compat shim:** `config.ts` handles the legacy `quadrants` key mapping to `segments`. See [`../../../../docs/decisions/0028-rename-quadrant-to-segment.md`](../../../../docs/decisions/0028-rename-quadrant-to-segment.md) (ADRs live at the workspace root, not inside this package).
- **No runtime data fetching.** No `axios`, `node-fetch`, `swr`, `react-query`, `@tanstack/react-query`. Everything is static. (Checked: `.dependency-cruiser.cjs` → `no-runtime-fetch-libs`.)
- **No Node.js built-ins.** `src/` is client-side code — `node:fs`, `node:path`, `node:child_process`, etc. crash in the browser. Packages that transitively import them (e.g. `consola`, `chalk`) are equally banned. Use `console.warn`/`console.error` instead of logger libraries. (Checked: `.dependency-cruiser.cjs` → `no-node-builtins-in-src`; build-output: `pnpm run check:build:no-node-builtins`.)
- **No circular imports.** (Checked: `.dependency-cruiser.cjs` → `no-circular`.) Specifically: `data.ts` imports `format.ts`, so `format.ts` must not import `data.ts`.
- **No `as any` / `@ts-ignore` / `@ts-expect-error`.** Use `unknown` + narrowing or fix the type. (Checked: `eslint.config.mjs`.)
- **All `href`/`src` literals starting with `/`** must go through `assetUrl()`, **EXCEPT** for `<Link>` (next/link) hrefs and `useRouter().push()` targets — Next.js auto-prepends `basePath` to those, so wrapping with `assetUrl()` would double the prefix in production. Use `assetUrl()` for raw `<a>`, `<img>`, PDS components (`PCrest`, `PLinkPure`, `PLinkTile`), and CSS asset URLs constructed here. (Checked: `eslint.config.mjs`.)

## Tests

Lib tests live in `src/lib/__tests__/{name}.test.ts`. Mock heavyweight modules (`@/lib/data`, `@/lib/config`) with `vi.mock()`.
