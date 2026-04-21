# `src/pages/` — Pages Router

This is the **only** router in the project. Static export only.

## Rules

- **No `api/` directory.** No serverless functions. (Checked: `architecture.test.ts` → `no-pages-api`.)
- **No `middleware.ts`.** (Checked: `architecture.test.ts` → `no-middleware`.)
- **No `.test.tsx` files here.** Turbopack treats every `.tsx` in `pages/` as a route. Page tests live in `src/__tests__/pages/`. (Checked: `architecture.test.ts` → `pages-no-test-files`.)
- **No `getServerSideProps`.** Use `getStaticProps` returning `{ props: {} }` and import data at module level from `@/lib/data`.
- **`getStaticPaths` must use `fallback: false`.** Required for `output: "export"`.
- **No `next/image`.** Use plain `<img>` with `assetUrl()` for src. (Checked: `.dependency-cruiser.cjs` → `no-next-image`.)
- **No Next server APIs.** No imports from `next/headers`, `next/cache`, `next/server`, or `server-only`. Static export has no server. (Checked: `.dependency-cruiser.cjs` → `no-next-server-apis`.)
- **All `href` and `src` strings starting with `/` MUST go through `assetUrl()`** from `@/lib/utils`. The site deploys under a configurable `basePath`. (Checked: `eslint.config.js` → `no-restricted-syntax` for absolute literals/templates.)
- **Every page route must produce a file in `out/`.** New routes require updating `scripts/checkBuildOutput.ts` if they aren't covered by the data-driven loop (statics, quadrants, items). (Checked: `npm run check:build:routes` after `npm run build`.)

## Shape

```tsx
import { assetUrl } from "@/lib/utils";
import { getItems } from "@/lib/data";

export default function Page() { /* ... */ }

export const getStaticProps = () => ({ props: {} });
```

For dynamic routes:

```tsx
export const getStaticPaths = () => ({
  paths: getItems().map((i) => ({ params: { id: i.id } })),
  fallback: false,
});
```

## Pointers

- Cross-page imports are forbidden (each page is a route entry). Share via `@/components/` or `@/lib/`. (Checked: `pages-no-cross-import`.)
- Tests for a page `foo.tsx` go in `src/__tests__/pages/foo.test.tsx`.
