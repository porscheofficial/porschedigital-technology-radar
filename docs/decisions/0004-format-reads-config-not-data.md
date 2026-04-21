# ADR-0004 — `format.ts` reads config, not `data.ts`

- Status: accepted
- Date: 2026-04-21

## Context

`src/lib/format.ts` exposes presentation helpers, notably `formatTitle()`,
which prefixes a per-page string with the site title.

Originally `formatTitle()` retrieved the site title via `getAppName()` from
`src/lib/data.ts`. But `src/lib/data.ts` itself imports formatting helpers
from `src/lib/format.ts`. The result was a **module cycle**:

```
data.ts ──▶ format.ts ──▶ data.ts
```

The cycle was tolerated by the bundler in development but violated the
`no-circular` invariant added with the architecture harness. More
importantly, it means changes in either file can produce hard-to-predict
load-order bugs (the `getAppName` symbol can be `undefined` at the moment
`format.ts` is evaluated, depending on import order).

The site title is *configuration*, not *data*. It lives in
`data/config.json` (or `data/config.default.json`) under
`labels.title`, and it is loaded by `src/lib/config.ts`. There is no
reason to route it through `data.ts`.

## Decision

`src/lib/format.ts` reads the title directly from `@/lib/config`:

```ts
import config from "@/lib/config";
// …
const title = config.labels.title || "";
```

`src/lib/format.ts` MUST NOT import from `src/lib/data.ts`. The
dependency direction is one-way: `data.ts` may import from `format.ts`,
but never the reverse.

## Consequences

**Enforced by the harness:**

- `.dependency-cruiser.cjs` → `no-circular` rejects any cycle in the
  module graph.
- `src/lib/AGENTS.md` documents the directionality explicitly so an
  agent reading the lib folder learns it before editing.

**Test fallout:**

- Every page test that previously mocked
  `vi.mock("@/lib/data", () => ({ getAppName: () => "..." }))` now also
  needs `vi.mock("@/lib/config", () => ({ default: { labels: { title:
  "Test Radar" } } }))`. Seven test files were updated when the cycle was
  broken; the convention is captured in `src/__tests__/AGENTS.md`.

**Implications for contributors:**

- Anything that smells like *configuration* (logos, labels, toggles,
  basePath) belongs to `@/lib/config`, not `@/lib/data`.
- `data.ts` stays the single importer of `data/data.json`
  (see `data-accessor-only`).

## Alternatives considered

- **Keep the cycle and silence the rule.** Rejected: cycles are fragile
  and the rule exists precisely because the JS module system handles
  them poorly.
- **Move `getAppName` into a third module both depend on.** Rejected:
  the title is not data; `config.ts` is the natural home, and an extra
  module would only hide the redundancy.
