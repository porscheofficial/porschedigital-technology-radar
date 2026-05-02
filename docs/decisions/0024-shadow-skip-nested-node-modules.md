# ADR-0024 — Skip nested `node_modules/` when copying the shadow workspace

- Status: accepted (supersedes ADR-0023)
- Date: 2026-04-22

## Context

ADR-0022 pinned `next` to `16.2.3`. ADR-0023 added a Webpack/Turbopack alias
fence in `next.config.js` plus `outputFileTracingRoot: __dirname`. Both were
attempts to stop the same prerender crash in
`@porscheofficial/porschedigital-technology-radar` consumer builds:

```
TypeError: Cannot read properties of null (reading 'useContext')
    at ignore-listed frames
Error occurred prerendering page "/[quadrant]/[id]: /<…>/<…>"
```

Releases 1.2.1, 1.2.2 (with the pin) and 1.2.3 (with the fence) all kept
failing in `cs-technology-radar`. The fence was necessary but not sufficient,
and the version pin protected against a regression that didn't exist. The
real cause sits one layer deeper, inside our own `packages/techradar/bin/techradar.ts`.

### Real reproduction & isolation

`cs-technology-radar` carries a `vercel-static-extensions@1.0.2` peer that
pulls `next@15`. npm therefore can't install our `next@16` flat at the
consumer root; it has to **nest** a copy of `next@16` inside our own package
directory:

```
<consumer>/node_modules/
├── next/                                            ← outer (next@15)
└── @porscheofficial/porschedigital-technology-radar/
    └── node_modules/
        ├── next/                                    ← nested (next@16.2.4)
        ├── react/
        └── .bin/
            └── next -> ../next/dist/bin/next        ← *relative* symlink
```

When `techradar build` runs, `ensureBuildDir()` in `packages/techradar/bin/techradar.ts` did:

```js
cpSync(SOURCE_DIR, BUILDER_DIR, { recursive: true });
```

with `SOURCE_DIR =
<consumer>/node_modules/@porscheofficial/porschedigital-technology-radar`.
That copy then ran `npm install` inside `.techradar/` to top off any
missing deps.

Two Node behaviours combine to break this:

1. **`cpSync` rewrites relative symlinks to absolute paths.** With its
   default `verbatimSymlinks: false`, recursive copy resolves each symlink
   and writes an absolute path into the destination. The relative
   `.bin/next -> ../next/dist/bin/next` (which would have correctly pointed
   inside `.techradar/` after the copy) becomes
   `<consumer>/node_modules/@porscheofficial/.../node_modules/next/dist/bin/next`
   — pointing **out** of `.techradar/` and back into the consumer tree.
2. **`npm install` will not regenerate a bin link if one already exists.**
   The shadow install therefore left `.techradar/node_modules/.bin/next`
   pointing at the outside copy of `next`.

When `npm run build` ran inside `.techradar/`, `next` resolved via PATH →
`.bin/next` → the *outside* `next@16.2.4`. That outside `next` then
`require()`'d its own `react` from its own absolute path, while the rest of
the worker imported `react` from `.techradar/node_modules/react`. Even
though both were React `19.2.5`, Node's CommonJS module identity is
keyed by absolute path: two `react` modules existed simultaneously,
`ReactSharedInternals` was initialised in one and `null` in the other, and
every Context-using component crashed on first `useContext`.

This perfectly explains the observed symptoms:

- Pages Router pages crash uniformly on `/[quadrant]/[id]`.
- Static pages with no Context use (404, sometimes index pre-hydrate)
  succeed.
- Pinning `next` (ADR-0022) didn't help — both copies were the pinned
  version; the issue is path identity, not version identity.
- Aliasing inside `next.config.js` (ADR-0023) didn't help either — the
  Webpack alias only affects modules Webpack resolves, not what the
  *outside* `next` binary `require()`s as it boots before user code runs.
- Local `pnpm run build` worked because there is no nested `node_modules/`
  in the source tree to copy from.

## Decision

In `packages/techradar/bin/techradar.ts`, exclude any nested `node_modules/` when copying the
installed package into `.techradar/`:

```ts
cpSync(SOURCE_DIR, BUILDER_DIR, {
  recursive: true,
  filter: (src) => !src.includes(`${PACKAGE_NAME}/node_modules`),
});
```

The subsequent `npm install --no-audit --no-fund` in `.techradar/` then
populates `node_modules/` from scratch. Every binary and every bin-link is
created fresh, so `.techradar/node_modules/.bin/next` correctly points at
`.techradar/node_modules/next/dist/bin/next` (relative, inside the shadow).
There is exactly one `next` and exactly one `react` reachable from the
build, and CommonJS module identity is single-instance.

The filter intentionally matches anywhere the substring
`@porscheofficial/porschedigital-technology-radar/node_modules` appears in
the absolute path — that pattern is unique to "nested under the package we
are copying" and won't false-match on consumer file names.

### Defense-in-depth: ADR-0023 stays in place

The `outputFileTracingRoot`, `turbopack.root`, and `webpack.resolve.alias`
fences from ADR-0023 are kept in `packages/techradar/next.config.js`. They are now redundant
under normal install paths — but they cost nothing at runtime and would
catch a future regression where some other code path leaks an outside
module into the build. Removing them would be a separate decision.

The `next` caret range from ADR-0023 (reverting ADR-0022's exact pin)
also stays.

## Alternatives considered

**A. Use `cpSync` with `verbatimSymlinks: true`.** Would preserve the
relative `.bin/next` symlink and let it resolve correctly *after* the
copy. Rejected because (a) the nested `node_modules/` is still copied,
which means the shadow install becomes a no-op for whatever npm hoisted
there, leaving us building against whichever versions npm chose for the
*consumer* root rather than against the package we just published; and
(b) it leaves a working `.bin/next` pointing into a directory tree
(`<consumer>/node_modules/...`) that may move or be cleaned independently
of `.techradar/`.

**B. Delete `.techradar/node_modules/.bin` after copy and let `npm
install` rebuild.** Brittle. `npm install` only regenerates bin links for
top-level deps, not for nested ones, and the precise behaviour varies by
npm major version. Skipping the copy at the source is deterministic.

**C. Symlink the package into `.techradar/` instead of copying.** Larger
restructuring. Would interact with the lifecycle-script stripping done in
`ensureBuildDir()` (ADR-0021) — we'd be modifying `package.json` of the
consumer's installed copy in-place. Rejected for now; the filter is a
one-liner that doesn't disturb any other invariant.

**D. Pin `next` in our `dependencies` to dodge the nested install.**
Wrong layer. The nest exists because of an *unrelated* peer dep
(`vercel-static-extensions@1.0.2 → next@15`). Even with our `next` pinned
exactly, npm still has to nest because the outer hoist landed on a
different version.

## Consequences

**Positive**

- Root cause fixed at the source — no more dual-React situations on
  consumer builds, regardless of what other peer deps the consumer has.
- E2E verified: `npm install file:/tmp/ptr-1.2.4.tgz
  @porscheofficial/vercel-static-extensions@1.0.2 && npx techradar build`
  in `cs-technology-radar` builds 183/183 pages including every
  `/[quadrant]/[id]` route that previously crashed.
- The shadow install is now deterministic: it runs as a fresh `npm
  install` against the package's own `package.json`, with no leakage from
  whatever happened to be in the source's nested `node_modules/`.

**Negative**

- The first `techradar build` in a new consumer takes longer because npm
  must download every dependency rather than copying the already-resolved
  nested tree. In practice this is one-time per consumer + per upgrade,
  cached by npm thereafter.
- Two layers of fence (this filter + ADR-0023's aliases) overlap. Any
  future maintainer must understand that ADR-0024 is the load-bearing
  fix; ADR-0023 is the safety net.

**Followups (not part of this ADR)**

- Consider a `check:build` sensor that runs `npm exec which next` inside
  `.techradar/` and asserts the resolved path starts with the
  `.techradar/` prefix. Would catch any future regression of this exact
  shape automatically.
- Track the upstream issue at
  `vercel/vercel-static-extensions` recommending a `next@16` peer bump so
  consumer trees stop nesting in the first place.

## Supersedes

ADR-0023 — the alias fence is no longer the load-bearing fix, but the
config remains as defense-in-depth.
