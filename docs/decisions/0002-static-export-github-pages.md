# ADR-0002 — Static export targeting GitHub Pages

- Status: accepted
- Date: 2026-04-21

## Context

The site is published as a static asset bundle on GitHub Pages (and any
other static host the consumer chooses). There is no server-side rendering,
no API routes, no middleware, no edge runtime — the entire deliverable is
the contents of `out/` after `next build`.

GitHub Pages additionally requires that the site live under a configurable
sub-path (`basePath`, e.g. `/technology-radar`). Hard-coded absolute URLs
break in that environment.

## Decision

1. `next.config.js` sets `output: "export"` and `trailingSlash: true`. This
   is **load-bearing**; do not remove.
2. Disallow every Next.js feature that depends on a running Next server:
   - `pages/api/**` (no API routes).
   - `middleware.ts` (no request-time middleware).
   - `getServerSideProps` (no per-request rendering).
   - `next/headers`, `next/cache`, `next/server`, `server-only`,
     `'use server'` server actions.
   - `next/image` (separate decision — see ADR-0003).
3. All `getStaticPaths` use `fallback: false`.
4. All absolute URLs (`href="/..."`, `src="/..."`) are wrapped in
   `assetUrl()` from `@/lib/utils`, which prepends the configured
   `basePath`.

## Consequences

**Enforced by the harness:**

- `.dependency-cruiser.cjs` → `no-next-server-apis` bans the server-only
  module imports.
- `eslint.config.js` → `no-restricted-syntax` rejects bare absolute
  `href`/`src` literals and template literals.
- `src/__tests__/architecture/architecture.test.ts` → `no-pages-api`,
  `no-middleware` block forbidden directories/files.
- `scripts/checkBuildOutput.ts` (`check:build:routes`) asserts every
  expected route file exists in `out/` after build.
- `linkinator` (`check:build:links`) crawls the built site and fails on
  broken internal links.

**Implications for contributors:**

- Anything that "feels easier with a server" — auth, dynamic search,
  request-driven personalisation — is out of scope for this codebase.
  Pre-compute it at build time or push it client-side.
- `assetUrl()` wrapping is mechanical and easy to forget. The ESLint rule
  is the safety net; trust it.

## Alternatives considered

- **Vercel hosting (no `basePath`).** Rejected: the project has to remain
  hostable on GitHub Pages for OSS consumers. Vercel-only assumptions would
  break that.
- **Drop `assetUrl()` and rely on `<base href>`.** Rejected: `<base href>`
  has subtle interactions with anchor links, scripts, and hash routing.
  An explicit wrapper is more predictable and is statically checkable.
