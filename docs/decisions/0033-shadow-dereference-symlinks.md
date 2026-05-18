# ADR-0033 — Dereference symlinks when copying the package into the shadow workspace

- Status: accepted
- Date: 2026-05-18

## Context

ADR-0024 fixed the dual-React `useContext` crash on consumer builds by
skipping nested `node_modules/` when `ensureBuildDir()` copies the installed
package into `.techradar/`. That fix assumed everything else inside
`.techradar/` was real files after the copy.

That assumption is wrong on **pnpm-installed consumers running Node ≥26**.

### Reproduction

Consumer `cs-technology-techradar@2.0.2` (pnpm workspace, `engines.node >=22`,
actual Node `v26.0.0`) consumes
`@porscheofficial/porschedigital-technology-radar@2.2.0` and runs
`techradar build`:

```
Error: Cannot find module '@/lib/config'
Require stack: .../node_modules/.pnpm/@porscheofficial+porschedigital-technology-radar@2.2.0_postcss@8.4.31/node_modules/@porscheofficial/porschedigital-technology-radar/scripts/buildThemes.ts
  at resolveTsPaths (.../tsx/dist/register-B4MtRGQg.cjs:10:718)
  at wrapResolveFilename (node:internal/modules/cjs/loader:1048:27)
```

Note the `requireStack`: it reports the **pnpm content-addressed store path**,
not the `.techradar/scripts/buildThemes.ts` path that the shell `cd`'d into.

### Root cause

pnpm installs the package as a symlink tree from its content-addressed store:

```
<consumer>/node_modules/@porscheofficial/porschedigital-technology-radar/
  → <consumer>/node_modules/.pnpm/@porscheofficial+porschedigital-technology-radar@2.2.0_…/node_modules/@porscheofficial/porschedigital-technology-radar
```

`ensureBuildDir()` called:

```js
cpSync(SOURCE_DIR, BUILDER_DIR, {
  recursive: true,
  filter: (src) => !src.includes(`${PACKAGE_NAME}/node_modules`),
});
```

With Node's default `verbatimSymlinks: false`, `cpSync` does *not* dereference
symlinks: it rewrites them as **absolute paths** pointing back into the pnpm
store. So `.techradar/scripts/buildThemes.ts` is an absolute symlink into
`.../node_modules/.pnpm/.../scripts/buildThemes.ts`. Same for `src/`,
`tsconfig.json`, and every other file copied from the package tree.

When `tsx scripts/buildThemes.ts` then runs from inside `.techradar/`:

1. Node resolves the entry point's `realpath()` to the pnpm store path.
2. tsx's path-alias resolver (`resolveTsPaths` in `tsx/dist/register-*.cjs`)
   walks up from the entry's real path looking for `tsconfig.json`, finds
   the store's `tsconfig.json`, and resolves `@/lib/config` to a path inside
   the store.
3. On Node 26's CJS loader, that store-relative resolution returned from the
   resolver hook is rejected with `Cannot find module '@/lib/config'`.

The standalone case (running `tsx /tmp/test-import.ts` with the same import,
from the same `.techradar/`) succeeds, because the entry's realpath stays
inside `.techradar/` and tsx finds `.techradar/tsconfig.json` — the issue
only manifests when the entry script itself lives in the symlinked tree.

The symptoms map cleanly onto npm-installed consumers being unaffected (npm
doesn't symlink into a store) and onto why CI on `pdig/main` never caught it
(monorepo dev builds operate on real files in the worktree).

## Decision

Pass `dereference: true` to the `cpSync(SOURCE_DIR, BUILDER_DIR, …)` call
in `ensureBuildDir()` so that symlinks are followed and their target file
contents are copied as **real files** into `.techradar/`:

```ts
cpSync(SOURCE_DIR, BUILDER_DIR, {
  recursive: true,
  dereference: true,
  filter: (src) => !src.includes(`${PACKAGE_NAME}/node_modules`),
});
```

After dereferencing, every file inside `.techradar/` is a real file whose
`realpath()` stays inside `.techradar/`. tsx's resolver therefore finds
`.techradar/tsconfig.json` and produces resolutions Node's CJS loader
accepts on every supported version.

### Defense in depth: convert `@/*` to relative imports in `scripts/*.ts`

Even with `dereference: true`, the consumer-build scripts are still
**Node-tsx entry points** whose path-alias resolution depends on tsx
intercepting `Module._resolveFilename`. That hook surface has historically
been a source of cross-version breakage (the Node-26-vs-tsx-4.21 interaction
above is the third such regression in this codebase). To stop relying on it
for entry-point resolution, the imports in scripts that run on the consumer
are rewritten as relative paths:

- `scripts/buildThemes.ts`: `@/lib/config` → `../src/lib/config`,
  `@/lib/theme/schema` → `../src/lib/theme/schema`
- `scripts/buildData.ts`: `@/lib/types` → `../src/lib/types`
- `scripts/buildOgImages.ts`: `@/lib/types` → `../src/lib/types`
- `scripts/positioner.ts`: `@/lib/types` → `../src/lib/types`
- `scripts/theme/scanner.ts`: `@/lib/theme/schema` → `../../src/lib/theme/schema`
- `scripts/theme/assets.ts`: `@/lib/theme/schema` → `../../src/lib/theme/schema`

Test files under `scripts/__tests__/` and `scripts/theme/__tests__/` keep
the `@/*` alias: they run via Vitest only inside the dev repo (the shadow
build excludes them via `sanitizeShadowTsconfig()`), and Vitest's resolver
is configured against the dev-repo `tsconfig.json` independently.

A regression test in `bin/__tests__/shadow-build-symlinks.test.ts`
table-tests every `scripts/**/*.ts` (excluding `__tests__/`) for absence of
`from "@/…"` imports, and asserts the `cpSync` call in `bin/techradar.ts`
still carries `dereference: true`.

The `.dependency-cruiser.cjs` rule `no-deep-relative-imports` is unaffected:
it only flags `from: { path: "^src" }`, not `^scripts`, and only blocks
chains of three or more `../`.

## Alternatives considered

**A. Add a `tsconfig.json` shim inside `.techradar/` that re-asserts paths.**
Already done — the shadow `.techradar/tsconfig.json` has the correct
`paths` mapping. It doesn't help, because tsx walks up from the *real*
entry path, not from `cwd`. The shim is invisible to the resolver.

**B. Tell consumers to downgrade Node.** Not viable. Node 26 is shipping
default on new macOS/Linux installs; the user explicitly refused to
downgrade. We must work on `engines.node >=22` as declared.

**C. Bump tsx to a version with different resolver semantics.** Tried
`tsx@4.x` latest; same failure. tsx ≥5 hasn't shipped. Even if it did,
relying on tsx fixing its alias-resolution interaction with every future
Node major is fragile — the relative-import escape hatch is permanent.

**D. Symlink the package into `.techradar/` instead of `cpSync`.** Would
move the problem, not solve it: the entry script's `realpath()` would
still land in the package's install location (store under pnpm).

**E. Only convert imports to relative, skip the `cpSync` change.** Would
fix the immediate `Cannot find module` crash. Rejected because the
underlying invariant — "`.techradar/` is a self-contained shadow whose
real paths stay inside it" — is the same invariant ADR-0024 relied on for
the `node_modules/` fix. Restoring that invariant explicitly is cheaper
than enumerating which downstream code paths assume it.

## Consequences

**Positive**

- `techradar build` works on pnpm-installed consumers on Node ≥22 including
  Node 26, restoring the assumption that `.techradar/` is a self-contained
  build dir.
- Entry-point scripts no longer depend on tsx's `Module._resolveFilename`
  hook to resolve the package's own `src/`. The remaining `@/*` users are
  Next.js-compiled modules inside `src/` where Next/Webpack/Turbopack does
  the path-alias work, not tsx.
- A regression test enforces both halves of the fix.

**Negative**

- `cpSync(…, { dereference: true })` traverses the full source tree
  instead of writing symlinks. On the package's current size this adds a
  few hundred ms to the first build of each consumer; subsequent builds
  hit the `hash` short-circuit unchanged.
- Two import styles now coexist in `scripts/`: relative for production
  entry scripts, `@/*` for test files. The split is documented in this
  ADR and enforced by the regression test.

**Followups (not part of this ADR)**

- Consider a sensor that asserts `realpathSync('.techradar/scripts/buildData.ts')`
  starts with `BUILDER_DIR` after `ensureBuildDir()` runs, as a runtime
  check complementing the string-match regression test.

## References

- ADR-0021 (strip devDependencies from shadow `package.json`).
- ADR-0024 (skip nested `node_modules/` when copying — the precedent for
  this class of "shadow workspace path identity" bugs).
