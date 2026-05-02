# ADR-0001 — Pages Router, not App Router

- Status: accepted
- Date: 2026-04-21

## Context

Next.js ships two routers:

- **Pages Router** (`packages/techradar/src/pages/`) — file-based routing, `getStaticProps` /
  `getStaticPaths`, fully static export via `output: "export"`.
- **App Router** (`packages/techradar/src/app/`) — RSC-first, Server Components, server-only APIs
  (`next/headers`, `next/cache`, `next/server`, `server-only`), partial
  pre-rendering, edge runtime hooks.

This project is a **purely static** technology-radar site deployed to GitHub
Pages. There is no server, no edge runtime, no request-time anything. Every
piece of data is known at build time and baked into HTML/JS.

The App Router's defining features (RSC streaming, server actions, dynamic
metadata, `next/cache`) are unusable without a runtime. Mixing the two
routers in the same app produces routing ambiguity and inflates the bundle.

## Decision

The Pages Router is the **only** router for runtime page rendering.

`packages/techradar/src/app/` exists as a **deliberate, single-file exception** holding only
`packages/techradar/src/app/sitemap.ts`. The App Router is required there because
`MetadataRoute.Sitemap` lives in the App Router namespace; it is invoked at
build time and produces a static `sitemap.xml`. No other file is allowed in
`packages/techradar/src/app/`.

## Consequences

**Enforced by the harness:**

- `packages/techradar/.dependency-cruiser.cjs` → `app-router-only-sitemap` rule rejects any
  import path under `packages/techradar/src/app/` other than `sitemap.ts` (and tests).
- `packages/techradar/src/__tests__/architecture/architecture.test.ts` → `app-router-only-sitemap`
  fs-test rejects any non-test, non-AGENTS file in `packages/techradar/src/app/` other than
  `sitemap.ts`.
- `packages/techradar/src/pages/AGENTS.md` documents the static-export contract (no
  `getServerSideProps`, `getStaticPaths` with `fallback: false`).

**Implications for contributors:**

- New pages go in `packages/techradar/src/pages/`. Period.
- Server-only Next APIs are banned (see ADR-0002 + `no-next-server-apis`).
- If a future feature genuinely needs the App Router, supersede this ADR
  rather than silently widening the `src/app/` allowlist.

## Alternatives considered

- **Migrate fully to App Router.** Rejected: requires a Next server runtime
  for many features; static export support is partial and shifting; no
  user-visible benefit for a content-only site.
- **Hybrid with both routers active for routes.** Rejected: routing
  precedence is opaque, doubles the mental model, and yields bigger bundles.
