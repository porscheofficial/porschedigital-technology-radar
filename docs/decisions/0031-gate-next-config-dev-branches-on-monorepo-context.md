# ADR-0031 — Gate `next.config.js` dev-only branches on monorepo execution context

- Status: accepted
- Date: 2026-05-06

## Context

`packages/techradar/next.config.js` runs in **two execution contexts** that
look identical to Next.js but have very different operational constraints:

1. **Monorepo dev** — the maintainer runs `pnpm dev` from
   `packages/techradar/` inside this pnpm workspace. The same tree also runs
   `pnpm build`, `pnpm test`, and the full harness, sometimes
   concurrently. `tsconfig.json` is committed and is consumed by
   `tsc --noEmit`, `next build`, and the `check:arch:eslint` arm.
2. **Consumer shadow build** — the user runs `techradar dev`/`techradar build`
   in their own project. `bin/techradar.ts ensureBuildDir()` materializes a
   `<consumer>/.techradar/` directory by copying the installed package, then
   runs `next dev` / `next build` from inside that directory. The shadow
   tree is regenerated whenever the consumer's `package.json` changes
   (content-hash check) and is gitignored. There is exactly one Next process
   running against it at a time.

Two `next.config.js` branches were originally introduced **only** for
context (1):

- `distDir` switches to `.next-dev` when `NODE_ENV=development` so the dev
  process's open file handles in `.next-dev/dev/server/webpack-runtime.js`
  don't collide with `next build` clearing `.next/`.
- `tsconfig.typescript.tsconfigPath` switches to `tsconfig.dev.json` when
  `NODE_ENV=development` so Next's startup auto-reconfigure (which appends
  `<distDir>/types/**/*.ts` to `include`) writes its mutations into the
  dev tsconfig and leaves the canonical `tsconfig.json` untouched. Without
  this split, the monorepo `pnpm build` fails with
  `Duplicate identifier 'PagesPageConfig'` because `next dev` had appended
  `.next-dev/dev/types/validator.ts` to the same tsconfig that `next build`
  later asks `tsc` to type-check.

Both branches were keyed on `process.env.NODE_ENV === "development"` alone.
That predicate matches in **both** execution contexts, even though only
context (1) needs the split. In context (2) the `tsconfig.dev.json` branch
is actively harmful: `ensureBuildDir()` only seeds `tsconfig.json` into
`.techradar/`, so when `next dev` is configured to read a non-existent
`tsconfig.dev.json` it falls through to its "no tsconfig found" code path
and silently writes a **bare** `tsconfig.json` without the
`paths: { "@/*": ["./src/*"] }` alias mapping. Every `@/*` import in the
user's source then fails with `Module not found`.

This was reproduced on a fresh radar created against
`@porscheofficial/porschedigital-technology-radar@2.0.0`: `techradar dev`
boots, `build:data` succeeds, then `next dev` panics with
`Module not found: Can't resolve '@/components/Layout/Layout'` at
`src/pages/_app.tsx`.

The file already detects context via `isMonorepoContext` (lines 33–35):

```js
const isMonorepoContext = __dirname.endsWith(
  path.join("packages", "techradar"),
);
```

This predicate is already used to gate `turbopackRoot` and
`outputFileTracingRoot` between workspace-root (monorepo) and `__dirname`
(consumer, ADR-0023 fence). The dev-only branches needed the same gate.

## Decision

Both dev-only branches in `packages/techradar/next.config.js` AND the
`NODE_ENV` check, so they take effect **only** in monorepo dev:

```js
const distDir =
  isMonorepoContext && process.env.NODE_ENV === "development"
    ? ".next-dev"
    : ".next";

const tsconfigPath =
  isMonorepoContext && process.env.NODE_ENV === "development"
    ? "tsconfig.dev.json"
    : "tsconfig.json";
```

Consumer shadow builds always use canonical `.next` + `tsconfig.json`,
identical to a vanilla Next.js project.

The accompanying comment blocks were rewritten to call out the two
execution contexts by name and document the failure modes that motivated
each branch, so the gate doesn't drift back. Each branch is preceded by
two paragraphs labelled `MONOREPO-DEV ONLY` and
`CONSUMER SHADOW BUILDS DO NOT NEED THIS` / `MUST NOT TAKE THIS BRANCH`.

A regression test
(`packages/techradar/bin/__tests__/next-config-context-gates.test.ts`)
spawns child Node processes that load `next.config.js` from a synthesized
`<tmp>/.techradar/` directory (consumer context) and from the real
`packages/techradar/` directory (monorepo context), under both
`NODE_ENV=development` and `NODE_ENV=production`, and asserts the
resulting `distDir` + `tsconfigPath` match the documented matrix:

| Context  | NODE_ENV    | distDir    | tsconfigPath        |
| -------- | ----------- | ---------- | ------------------- |
| Monorepo | development | `.next-dev`| `tsconfig.dev.json` |
| Monorepo | production  | `.next`    | `tsconfig.json`     |
| Consumer | development | `.next`    | `tsconfig.json`     |
| Consumer | production  | `.next`    | `tsconfig.json`     |

## Consequences

### Good

- Consumer `techradar dev` works on a fresh `2.0.x` install. The `@/*`
  alias resolves because Next reads the seeded `tsconfig.json` instead of
  inventing a bare one.
- The monorepo-dev workflow keeps the harness-collision protection it was
  designed for. The `tsconfig.dev.json` / `tsconfig.json` split and the
  `.next-dev/` / `.next/` split both stay live in context (1) — no
  regression to ADR-0014's `Duplicate identifier 'PagesPageConfig'`
  failure mode or to the `ENOENT: webpack-runtime.js` failure mode the
  splits originally fixed.
- The two execution contexts are now named explicitly in the file. The
  next reader who is tempted to "simplify" by removing one branch has to
  argue against the documented failure modes.

### Trade-offs / risks

- The execution-context detector is **path-shape-based**
  (`__dirname.endsWith("packages/techradar")`). If a future consumer
  happens to install the package under a path that ends with
  `packages/techradar` (e.g. they vendor the source into their own
  monorepo at the same relative path), the consumer would silently take
  the monorepo-dev branches and break the same way the bug fixed here did.
  This is the same risk ADR-0023 already carries for `turbopackRoot` and
  `tracingRoot`. The mitigation is the same: it is a load-bearing detector
  and any change to it must update both ADR-0023 and ADR-0031.
- `tsconfig.dev.json` is still expected to exist in the monorepo root.
  `next dev` creates it on first boot if missing; the file is gitignored.
  This was already the case before this ADR.

### Alternatives considered

- **Seed `tsconfig.dev.json` into `.techradar/` from `ensureBuildDir()`.**
  Would also fix the consumer crash but commits the codebase to having
  *two* tsconfigs in every consumer shadow build, with no benefit:
  consumers don't run concurrent dev+build harnesses and `tsc --noEmit`
  isn't invoked from `.techradar/`. Carrying the maintainer's harness
  workaround into every user's shadow tree is the wrong direction.
- **Drop the dev-tsconfig split entirely and tolerate the
  `Duplicate identifier` failure.** Would break the monorepo's `pnpm build`
  whenever `pnpm dev` had run since the last `git clean`. Re-introduces
  the failure mode the split was designed to fix.
- **Detect consumer context via a marker file
  (`.techradar/.shadow-marker`) instead of path shape.** More explicit but
  introduces a new file the CLI has to write and one more thing that can
  drift. The path-shape detector is already established and already
  load-bearing for two other branches in the same file.

## References

- `packages/techradar/next.config.js` — the gates and the two `MONOREPO-DEV
  ONLY` comment blocks
- `packages/techradar/bin/__tests__/next-config-context-gates.test.ts` —
  regression test
- `packages/techradar/bin/techradar.ts ensureBuildDir()` — only seeds
  `tsconfig.json` into `.techradar/`, never `tsconfig.dev.json`
- ADR-0023 — the `isMonorepoContext` detector and the resolution-root fence
- ADR-0024 — the `node_modules/` skip during shadow copy that prevents the
  dual-React `useContext` null crash
