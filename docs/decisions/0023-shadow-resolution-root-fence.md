# ADR-0023 — Fence module resolution to the shadow workspace (`outputFileTracingRoot` + webpack alias)

- Status: superseded by ADR-0024 (config retained as defense-in-depth)
- Date: 2026-04-22

## Context

ADR-0022 pinned `next` to exactly `16.2.3` after consumer builds of
`@porscheofficial/porschedigital-technology-radar@1.2.1` failed during the
static-export prerender phase with:

```
TypeError: Cannot read properties of null (reading 'useContext')
    at ignore-listed frames
Error occurred prerendering page "/[quadrant]/[id]: /<…>/<…>"
```

That diagnosis was wrong.

`@porscheofficial/porschedigital-technology-radar@1.2.2` shipped the pin —
verified via `npm view ...@1.2.2 dependencies.next` → `16.2.3` and via
`<consumer>/.techradar/node_modules/next/package.json` showing `version
16.2.3`. The error reproduced **identically** in `cs-technology-radar`. So
the trigger is not the Next version.

### Real reproduction & isolation

Bisecting `cs-technology-radar` against a clean sandbox carrying the same
`config.json`, the same 250 radar markdown files, the same
`@porscheofficial/...@1.2.2` and `@porscheofficial/vercel-static-extensions`
deps, and the same Node version, the only systematic difference between
"fails" and "passes" was the version of `next` hoisted into the consumer's
**outer** `node_modules/next/`:

| Outer `node_modules/next` | Inner `.techradar/node_modules/next` | Outcome |
| ---: | ---: | --- |
| `15.5.15` (cs-technology-radar lockfile) | `16.2.3` | ❌ fail |
| `16.2.3` (sandbox lockfile) | `16.2.3` | ✅ pass |

`vercel-static-extensions@1.0.2` declares `next@15` as a peer/dep. npm has
to satisfy both that and our `next@16.2.3` and picks one to hoist based on
lockfile / install-order non-determinism. When the outer hoist landed on
`next@15`, `cs-technology-radar` failed; when it landed on `16.2.3`, it
passed. Confirmed by adding an `overrides` block to the consumer
`package.json` forcing `next: 16.2.3`, `react: 19.2.5`, `react-dom: 19.2.5`
— that single change made the failing build pass without any code change.

### Why the outer copy matters

`techradar build` runs `next build` from inside `<consumer>/.techradar/`.
Three resolution paths reach **out** of that directory by default:

1. **Node's `require('react')` resolver** climbs `node_modules` directories
   walking up from `cwd`, finding `.techradar/node_modules/next` first but
   pulling deeper transitive specifiers from the outer tree.
2. **Next's file tracer** (`outputFileTracingRoot`) defaults to the nearest
   `package.json` ancestor — without an explicit setting it ascends past
   `.techradar/`.
3. **Webpack's resolver** uses `resolve.modules` with the same upward walk
   and can land on the outer `react` even if the inner one was found first
   for a different specifier.

When the outer `node_modules/next` is `next@15`, that copy ships its own
bundled `next/dist/compiled/react/*`. The prerender worker ends up with
**two React runtimes** — `ReactSharedInternals` is initialised in one and
`null` in the other — and any Context-using component (everything that
imports from React via Next's Pages Router runtime) crashes on first
`useContext`. That perfectly matches the observed pattern: every
`/[quadrant]/[id]` page fails identically, no application stack frames,
index/quadrant/history pages succeed (they don't traverse the broken
runtime path).

This also explains why our local `pnpm run build` and our smaller test
sandboxes never reproduced the bug: there is no second `next` peer to hoist.

## Decision

Replace ADR-0022's version pin with a **resolution-root fence** in
`packages/techradar/next.config.js` that prevents Next, Webpack, and the file tracer from
reaching above `.techradar/`:

```js
const path = require("node:path");
const reactPath = path.resolve(__dirname, "node_modules/react");
const reactDomPath = path.resolve(__dirname, "node_modules/react-dom");
const nextPath = path.resolve(__dirname, "node_modules/next");

const nextConfig = {
  // ...
  outputFileTracingRoot: __dirname,
  turbopack: { root: __dirname },
  webpack: (cfg) => {
    cfg.resolve = cfg.resolve || {};
    cfg.resolve.alias = {
      ...(cfg.resolve.alias || {}),
      react: reactPath,
      "react-dom": reactDomPath,
      next: nextPath,
    };
    return cfg;
  },
};
```

Three layers, deliberately overlapping:

- `outputFileTracingRoot: __dirname` — production file-tracer cannot leave
  `.techradar/`.
- `turbopack.root: __dirname` — Turbopack's own root scoping.
- `webpack.resolve.alias` — every bare `react`/`react-dom`/`next` specifier
  resolves to the absolute path inside `.techradar/node_modules`, even when
  Webpack's upward resolver would otherwise reach the consumer's outer
  copy.

Defense-in-depth on purpose. Any single layer alone has historically failed
to fence at least one of Next's resolution paths.

The exact pin `"next": "16.2.3"` from ADR-0022 is reverted to `"^16.2.3"` in `packages/techradar/package.json`.

### Why not a Turbopack `resolveAlias` block

Turbopack's `experimental.turbo.resolveAlias` (and `turbopack.resolveAlias`)
treats values as **module specifiers**, not file paths. Passing the
absolute `/Users/.../node_modules/react` causes Turbopack to strip the
leading `/` and try to resolve the relative path `Users/.../node_modules/react`
from the project root, which fails. Webpack's `alias` accepts absolute
paths directly, which is why the alias only lives in the webpack closure.

### What does NOT change

- The shadow-workspace install pipeline (ADR-0021): unchanged.
- The dep recategorization (ADR-0021): unchanged.
- `react`, `react-dom`, `next` stay on caret ranges in `dependencies`.
- Maintainer Definition of Done: unchanged.
- No code changes outside `packages/techradar/next.config.js`. No test/harness changes.

## Alternatives considered

**A. Keep the version pin (ADR-0022).** Rejected — the pin doesn't actually
prevent the bug. Verified by 1.2.2 reproducing the failure with `next@16.2.3`
in `.techradar/`. The version pin protects against an upstream regression
that does not exist.

**B. Document the workaround on the consumer side only** (recommend
`overrides`). Rejected — the failure mode is an internal implementation
detail of how Node and Next resolve modules from a shadow workspace. Asking
every consumer to debug ERESOLVE-style symptoms by adding `overrides` is
poor DX. The fence is one config change in our package and works for all
consumers regardless of what other deps they pull in.

**C. Bundle our own `react`/`next` via a custom build.** Rejected —
massively increases shipped tarball size, fights Next's expected dep model,
and undoes ADR-0021's recategorization work.

**D. Switch from `cpSync` shadow workspace to symlink.** Rejected for now —
larger structural change, would interact with Husky/`prepare` scripts the
shadow already strips, and doesn't solve the resolution-walk-up problem on
its own.

## Consequences

**Positive**

- E2E verified: a fresh sandbox with `next@16.2.4` hoisted to outer
  `node_modules` (the version originally accused in ADR-0022) now builds
  the full 172-item / 183-page consumer radar to completion.
- The fix is local to our package — consumers don't have to touch their
  `package.json`.
- `next` regains its caret range, so consumers benefit from upstream patch
  releases.

**Negative**

- We accumulate three overlapping fence settings. Any of them being removed
  in a future Next release could re-open the bug; the comment in
  `next.config.js` cites this ADR so the rationale survives.
- `outputFileTracingRoot` slightly narrows what the file tracer sees; if
  we ever start importing modules from outside `.techradar/` at runtime we
  would need to widen this. Today we don't, and the static-export model
  forbids it anyway.

**Followups (not part of this ADR)**

- File a tracking issue against `vercel-static-extensions` recommending a
  bump to `next@16` so consumers don't end up with a `next@15` hoist in
  the first place.
- Consider a `check:build` sensor that asserts the built output contains
  no path references outside the shadow workspace, to detect future fence
  regressions automatically.

## Supersedes

ADR-0022 — `next` is no longer pinned to exactly `16.2.3`.
