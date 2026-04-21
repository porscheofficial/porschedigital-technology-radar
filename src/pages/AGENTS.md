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
- **All `href` and `src` strings starting with `/` MUST go through `assetUrl()`** from `@/lib/utils`, **EXCEPT** for `<Link>` (next/link) hrefs and `useRouter().push()` targets. Next.js auto-prepends `basePath` to those, so wrapping with `assetUrl()` would double the prefix in production (e.g. `/radar/radar/foo`). Use bare paths inside `<Link>` (`href="/foo"` or `href={`/${id}`}`); use `assetUrl()` for raw `<a>`, `<img>`, and PDS components which are not Next-aware. The site deploys under a configurable `basePath`. (Checked: `eslint.config.mjs` → `no-restricted-syntax` for absolute literals/templates, with `<Link>` exempted, plus a forbidding rule against `assetUrl()` inside `<Link>` hrefs.)
- **Every page route must produce a file in `out/`.** New routes require updating `scripts/checkBuildOutput.ts` if they aren't covered by the data-driven loop (statics, quadrants, items). (Checked: `pnpm run check:build:routes` after `pnpm run build`.)
- **Bundle stays under budget.** Total JS, total CSS, and per-chunk sizes are capped in `bundle-budget.json`. Bumping the budget requires a justifying commit message — see `docs/decisions/0005-bundle-budget-fs-walk.md`. (Checked: `pnpm run check:build:budget` after `pnpm run build`.)
- **Framework-aware lints from `@next/eslint-plugin-next` (recommended set)** apply to `src/`. Two rules are deliberately disabled: `@next/next/no-img-element` (see ADR-0003) and `@next/next/no-html-link-for-pages` (we use `assetUrl()` with `<Link>`/`<a>`, which the rule misclassifies). (Checked: `eslint.config.mjs`.)

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
