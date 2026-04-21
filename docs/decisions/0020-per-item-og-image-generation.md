# ADR-0020 — Per-item Open Graph image generation

- Status: accepted
- Date: 2026-04-21

## Context

The Porsche Digital Tech Radar is a public static site shared in Slack,
Teams, X, LinkedIn, WhatsApp, iMessage, and similar clients. Those clients
derive previews almost entirely from Open Graph and Twitter Card metadata.

Before this change, the radar shipped little or no rich preview metadata and
no dedicated social card images. Item detail pages therefore previewed poorly:
links lacked meaningful context, looked generic in chat tools, and missed the
quadrant/ring information that makes the radar useful at a glance.

Runtime image generation is not available here. ADR-0002 locks the project to
static export, and the repo intentionally has no server runtime, API routes, or
middleware. Any solution must therefore generate preview assets entirely at
build time, deterministically, and without affecting the client bundle budget.

## Decision

Generate Open Graph PNGs at build time using `satori` to render SVG markup and
`@resvg/resvg-js` to rasterize it to 1200×630 PNG files.

Two card modes are emitted:

1. A shared default card for non-item pages at `public/og/default.png`.
2. A per-item card at `public/og/<quadrant>/<id>.png` for each radar item.

The per-item template includes:

- a dark brand background,
- a quadrant-colored band,
- the item title,
- a subtitle with ring + quadrant,
- a ring pill badge,
- a Porsche Digital Tech Radar footer label.

The generator reads from `data/data.json`, so the build order becomes:

1. `build:data`
2. `build:og`
3. `next build`

To keep builds fast, the generator maintains `public/og/.og-cache.json`, keyed
by a SHA-256 hash of the fields that affect rendering plus a `templateVersion`
constant. If the hash is unchanged and the PNG already exists, generation is
skipped.

Authors can override the generated card with an `ogImage` front-matter field:

- relative path under `public/` → use author-provided static asset,
- absolute `https://...` URL → use external asset,
- omitted → generate card automatically.

Item summaries follow the same pattern: an explicit `summary` field wins;
otherwise the site derives a fallback from stripped item body HTML.

## Consequences

- Link previews become richer and more recognizable across chat, social, and
  messaging platforms.
- Build time increases modestly (roughly a few seconds, depending on item
  count), but unchanged images are skipped by the cache.
- The repo gains build-only dependencies for image rendering and font loading:
  `satori`, `@resvg/resvg-js`, and `@fontsource/inter`.
- Generated PNGs and cache artifacts live under `public/og/` and are gitignored,
  so the repository does not bloat with hundreds of committed binary files.
- The implementation stays compatible with static export: no runtime server,
  no App Router expansion, and no client-side fetching.

### Alternatives considered

- **`@vercel/og`** — rejected because it is optimized for runtime edge/server
  generation, which this static-export site does not have.
- **Puppeteer / headless Chromium screenshots** — rejected as too heavy,
  slower, and more operationally complex for deterministic build-time cards.
- **Runtime generation on request** — impossible within the repo's static-only
  architecture.
- **Single shared image for every page** — rejected because item pages benefit
  materially from previews that encode the specific technology, ring, and
  quadrant.
