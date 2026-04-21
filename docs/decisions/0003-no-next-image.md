# ADR-0003 — No `next/image`

- Status: accepted
- Date: 2026-04-21

## Context

`next/image` is the recommended image primitive in Next.js. It performs
automatic resizing, format negotiation, lazy loading, and serves images
through a built-in optimization endpoint at `/_next/image`.

That endpoint is a **server-side route**. With `output: "export"` (see
ADR-0002) the export pipeline cannot generate it; the only supported
configurations are `images.unoptimized: true` (which strips most of the
benefit) or pointing at an external loader (which adds infrastructure).

Additionally, the radar renders **user-provided** image URLs from
`data/radar/**/*.md` frontmatter and `data/config.json` (logos). These URLs
point at remote CDNs that the consumer controls; we cannot enumerate them
at build time, and we will not require consumers to register every host
with `images.remotePatterns`.

## Decision

`next/image` is forbidden everywhere in the codebase. Use a plain `<img>`
tag whose `src` flows through `assetUrl()` for local assets, or is the
caller-supplied URL for remote ones.

## Consequences

**Enforced by the harness:**

- `.dependency-cruiser.cjs` → `no-next-image` rejects any import resolving
  to `node_modules/next/image`.

**Implications for contributors:**

- Set `width`/`height` attributes manually to prevent layout shift.
- For above-the-fold images, add `loading="eager"` and
  `fetchPriority="high"` explicitly.
- If a future use-case truly needs runtime optimization (it almost
  certainly doesn't), supersede this ADR and pick a CDN-based loader
  rather than relying on the Next-managed endpoint.

## Alternatives considered

- **`next/image` with `unoptimized: true`.** Rejected: adds the
  component's API surface and bundle weight without the upside.
- **`next/image` with a third-party loader.** Rejected: adds runtime
  infrastructure that contradicts the static-export goal (ADR-0002) and
  wouldn't work uniformly for OSS consumers.
