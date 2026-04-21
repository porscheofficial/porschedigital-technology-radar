# Harness Engineering — Worked Example

> **Keep in sync.** This file is a teaching artifact built from the real harness in this repo. Any change to a sensor, a rule, an `AGENTS.md`, or a `npm run check:*` script MUST be reflected here in the same PR. Out-of-date diagrams teach the wrong lesson. (See root `AGENTS.md` → _Harness Documentation Sync_.)

This document explains what a coding-agent harness is, then walks through the one wired into this project — concretely, with file paths and rule names you can grep for.

---

## 1. What is a harness?

A **harness** is the set of guides and sensors that surrounds a coding agent (or a human, for that matter) so the loop _converges_ on correct, on-spec changes instead of drifting.

Martin Fowler & Birgitta Böckeler frame it as a 2×2 grid:

|                        | **Feedforward** (teaches before you act) | **Feedback** (catches after you act)                 |
| ---------------------- | ---------------------------------------- | ---------------------------------------------------- |
| **Computational** (deterministic, fast)   | Type signatures, schemas, examples       | Linters, type-checkers, dep-cruiser, fitness tests   |
| **Inferential** (LLM-judged, slow)        | Architectural narratives, ADRs           | Review skills, generator+evaluator loops             |

Two regulation principles drive the design:

1. **Ashby's Law of Requisite Variety** — the regulator (harness) must have at least as much variety as the system it regulates. If the codebase has _N_ invariants, you need _N_ sensors.
2. **Keep quality left** — distribute sensors across the change lifecycle so violations are caught at the cheapest possible point (editor → pre-commit → CI → after-build).

This project currently fields the **computational column** of the grid in both rows. The inferential row is on the roadmap.

Two complementary artifacts in this repo:

- **`AGENTS.md` files** — point-of-entry rules. What to do, what not to do, which sensor enforces it.
- **`docs/decisions/`** — Architecture Decision Records. The *why* behind the rules. When an agent (or human) wants to revisit a constraint, the ADR is the first stop.

---

## 2. The two arms in this repo

```mermaid
flowchart LR
    subgraph FF["Feedforward — what the agent reads BEFORE editing"]
        direction TB
        FF1["AGENTS.md (root)"]
        FF2["src/pages/AGENTS.md"]
        FF3["src/app/AGENTS.md"]
        FF4["src/components/AGENTS.md"]
        FF5["src/lib/AGENTS.md"]
        FF6["src/__tests__/AGENTS.md"]
        FF7["scripts/AGENTS.md"]
        FF8["data/AGENTS.md"]
    end

    subgraph FB["Feedback — what fires AFTER editing"]
        direction TB
        subgraph SRC["Source-only (npm run check:arch)"]
            S1["check:arch:depcruise<br/>(.dependency-cruiser.cjs)"]
            S2["check:arch:eslint<br/>(eslint.config.mjs)"]
            S3["check:arch:readme<br/>(scripts/checkConfigReadmeSync.ts)"]
            S4["check:arch:doccoverage<br/>(scripts/checkDocCoverage.ts)"]
            S5["architecture.test.ts<br/>(vitest, fs invariants)"]
        end
        subgraph BUILD["Build-output (npm run check:build)"]
            B1["check:build:routes<br/>(scripts/checkBuildOutput.ts)"]
            B2["check:build:links<br/>(linkinator)"]
            B3["check:build:budget<br/>(scripts/checkBundleBudget.ts)"]
        end
        subgraph SEC["Security (npm run check:sec)"]
            X1["check:sec:sanitize<br/>(scripts/checkSanitize.ts + XSS test)"]
            X2["check:sec:deps<br/>(osv-scanner, CI binary)"]
            X3["check:sec:secrets<br/>(gitleaks, CI binary)"]
        end
        subgraph QUAL["Clean-code (npm run check:quality)"]
            Q1["check:quality:knip<br/>(dead code + unlisted deps)"]
            Q2["check:quality:jscpd<br/>(copy-paste detection)"]
            Q3["check:quality:naming<br/>(useNamingConvention via Biome)"]
            Q4["check:quality:sonar<br/>(eslint-plugin-sonarjs, dedicated config)"]
        end
    end

    Agent(("agent")) -.reads.-> FF
    Agent ==edits==> Code["src/, scripts/, data/"]
    Code --> SRC
    Code --> SEC
    Code --> QUAL
    Code --> BuildStep["npm run build → out/"]
    BuildStep --> BUILD
    SRC -.violation cites doc.-> Agent
    SEC -.violation cites doc.-> Agent
    QUAL -.violation cites doc.-> Agent
    BUILD -.violation cites doc.-> Agent
```

Every feedback rule's failure message **cites the `AGENTS.md` doc that explains why** — closing the loop back to the feedforward arm. This is the single most important property of the harness.

---

## 3. The invariant buckets

The regulator's variety. Each row is one architectural property the harness preserves; the columns show which sensor enforces it, which doc teaches it, and which phase introduced it. Nineteen buckets and counting — every time review catches a new class of issue, a row is added (see § 8).

| #  | Invariant                                              | Feedback sensor                                                                 | Feedforward doc            | Phase |
|----|--------------------------------------------------------|----------------------------------------------------------------------------------|----------------------------|-------|
| 1  | Static export only (no SSR/API/middleware)             | `architecture.test.ts` + `no-next-server-apis`                                  | `src/pages/AGENTS.md`      | 0     |
| 2  | Pages Router topology (no `.test.tsx` in pages)        | `architecture.test.ts` (6 fs tests)                                             | `src/pages/AGENTS.md`      | 0     |
| 3  | App Router scoped to `sitemap.ts`                      | `architecture.test.ts` → `app-router-only-sitemap`                              | `src/app/AGENTS.md`        | 0     |
| 4  | One importer of `data/data.json`                       | `data-accessor-only` (dep-cruiser)                                              | `src/lib/AGENTS.md`        | 0     |
| 5  | Component shape (`Name.tsx` + `Name.module.scss`)      | `architecture.test.ts` → `component-folder-shape`                               | `src/components/AGENTS.md` | 0     |
| 6  | No type suppressions, `assetUrl()` for absolute URLs   | ESLint `ban-ts-comment` + `no-restricted-syntax`                                | `src/components/AGENTS.md` | 0     |
| 7  | Config / Zod schema documented in README               | `scripts/checkConfigReadmeSync.ts`                                              | `data/AGENTS.md`           | 0     |
| 8  | Every expected route file lands in `out/`              | `check:build:routes`                                                            | `src/pages/AGENTS.md`      | 1     |
| 9  | No broken internal links in the built site             | `check:build:links` (linkinator)                                                | `src/pages/AGENTS.md`      | 1     |
| 10 | Every `(Checked: …)` reference resolves to a live rule | `check:arch:doccoverage`                                                        | every `AGENTS.md`          | 2     |
| 11 | JS / CSS / per-chunk sizes stay under explicit caps    | `check:build:budget` (`bundle-budget.json`)                                     | `src/pages/AGENTS.md`      | 3     |
| 12 | No top-level helper functions in component files       | ESLint `no-restricted-syntax` + `architecture.test.ts` → `no-component-helpers` | `src/components/AGENTS.md` | 4     |
| 13 | rehype-sanitize stays wired into the markdown pipeline | `check:sec:sanitize` + `scripts/__tests__/sanitize.test.ts` (XSS regression)    | `scripts/AGENTS.md`        | 5     |
| 14 | No known-CVE npm dependencies                          | `check:sec:deps` (osv-scanner) + `.github/workflows/security.yml`               | root `AGENTS.md`           | 5     |
| 15 | No committed secrets / API tokens                      | `check:sec:secrets` (gitleaks) + `.github/workflows/security.yml`               | root `AGENTS.md`           | 5     |
| 16 | No dead code, unused exports, or unlisted deps         | `check:quality:knip` (`knip.json`)                                              | root `AGENTS.md`           | 6     |
| 17 | No new significant copy-paste duplication              | `check:quality:jscpd` (`.jscpd.json`)                                           | root `AGENTS.md`           | 6     |
| 18 | Naming conventions (PascalCase types, camelCase vars)  | `check:quality:naming` (Biome `style/useNamingConvention`)                      | root `AGENTS.md`           | 6     |
| 19 | No high-signal code smells (cognitive complexity, nested ternaries) | `check:quality:sonar` (eslint-plugin-sonarjs, `sonar.eslint.config.mjs`) | root `AGENTS.md`           | 6     |

**Notes on #12** — catches two failure modes at once: helper duplication across components (e.g. multiple components copy-pasting `stripHtml` instead of importing the canonical `@/lib/format` version) and component files accreting non-component logic. The fix is one of three: move pure helpers to `src/lib/`, convert JSX-returning helpers to PascalCase sub-components, or inline single-use render helpers as `const` arrows inside the component body.

**Notes on #13–#15** — the security arm. #13 is two-layer defense: `scripts/buildData.ts` calls `remarkRehype` without `allowDangerousHtml` *and* runs `rehypeSanitize` immediately after. The sensor enforces the second layer (the first is a one-keystroke regression that the second catches). #14 and #15 use Go binaries (`osv-scanner`, `gitleaks`) deliberately *not* added to `devDependencies` — CI runs the official actions, local devs install via `brew`. See ADR-0006.

**Notes on #16** — the clean-code arm opens with knip, the cheapest of four Phase-2 sensors. The remaining three (jscpd for duplication, Biome `useNamingConvention`, and eslint-plugin-sonarjs) ship as separate ADRs. `ignoreBinaries` in `knip.json` covers the `osv-scanner` / `gitleaks` system binaries so the security and clean-code arms don't fight. See ADR-0007.

**Notes on #17** — jscpd uses a percentage threshold (3%), not zero tolerance. The current 0.89% baseline is the documented `Radar` ↔ `QuadrantRadar` mirror — two views that intentionally evolve independently. The threshold catches new significant duplication while letting that mirror stand. Tests, SCSS modules, and the generated `Icons/` directory are excluded; their duplication is naturally high and produces noise without signal. See ADR-0008.

**Notes on #18** — Biome owns naming (not `@typescript-eslint/naming-convention`) so the rule integrates with the existing `npm run lint` loop instead of forking a second source of truth. `strictCase` is `false` to allow externally-dictated names (`PText`, `getXYPosition`, `JSON`, `IP`); test files are exempted via override because mock factories must mirror real PascalCase exports verbatim. The sensor uses `--only=` + `--diagnostic-level=error` to scope failures to `src` and `scripts` while letting Biome's overrides keep tests quiet. See ADR-0009.

**Notes on #19** — SonarJS runs through a *dedicated* flat config (`sonar.eslint.config.mjs`) so its smell findings stay separate from `check:arch:eslint`'s architectural bans. Three rules are disabled with rationale: `slow-regex` (build-time on trusted markdown, not runtime user input), `pseudo-random` (visual blip jitter, not security-sensitive), and `redundant-type-aliases` (domain string aliases are intentional). Two real smells are suppressed per-line with `eslint-disable-next-line` comments that cite this ADR (`parseDirectory` cognitive complexity, `useRadarTooltip` nested function). The architectural ESLint config loads the sonarjs plugin without enabling rules and sets `reportUnusedDisableDirectives: "off"` so the per-line disables don't fail `check:arch:eslint`. See ADR-0010.

Plus framework-aware lints from `@next/eslint-plugin-next` (recommended set, with `no-img-element` and `no-html-link-for-pages` disabled per ADRs / our `assetUrl()` convention — see `eslint.config.mjs` header).

A non-gating advisory workflow — **OpenSSF Scorecard** (`.github/workflows/scorecard.yml`) — runs weekly and uploads SARIF to GitHub's code-scanning UI. Findings are a posture metric, not a blocking check.

---

## 4. Sensor placement across the change lifecycle

```mermaid
flowchart LR
    edit["edit file"] --> lsp["LSP / TS<br/>(in editor)"]
    lsp --> precommit["pre-commit<br/>(husky → lint-staged → biome)"]
    precommit --> push["push"]
    push --> arch["check:arch<br/>(source-only, ~3s)"]
    arch --> test["npm test<br/>(6 fs invariants + unit/integration)"]
    test --> build["npm run build<br/>(static export → out/)"]
    build --> bld["check:build<br/>(routes + links)"]
    bld --> ship["ship"]

    classDef cheap fill:#d4edda,stroke:#155724
    classDef medium fill:#fff3cd,stroke:#856404
    classDef costly fill:#f8d7da,stroke:#721c24
    class lsp,precommit cheap
    class arch,test medium
    class build,bld costly
```

Cheap-to-expensive ordering matters: every sensor moved leftward saves agent time, tokens, and CI minutes.

---

## 5. Anatomy of a single rule

Every dep-cruiser rule has the same shape. This is the smallest unit of the harness:

```js
{
  name: "no-next-server-apis",
  severity: "error",
  comment:
    "Static export has no server. No imports from next/headers, " +
    "next/cache, next/server, or server-only. " +
    "Fix: use getStaticProps + module-level data imports. " +
    "See src/pages/AGENTS.md → static-export contract.",
  from: { path: "^src/" },
  to:   { path: "^node_modules/(next/(headers|cache|server)|server-only)(\\.|/|$)" },
}
```

Three properties make this rule _agent-legible_:

1. **`severity: "error"`** — non-negotiable. The rule won't be ignored.
2. **`comment`** — embeds **the fix** and **the citation** to the doc that explains the constraint. The agent reads this on failure and knows exactly what to do.
3. **Resolved-path matching** — `to.path` matches the resolved `node_modules/...` location, not the bare specifier. This is documented in the banner of `.dependency-cruiser.cjs` so the next person doesn't burn an hour finding out.

---

## 6. The agent-correction loop

```mermaid
sequenceDiagram
    actor A as Agent
    participant C as Code
    participant S as Sensor (e.g. dep-cruiser)
    participant D as AGENTS.md

    A->>C: edit src/foo.tsx<br/>(adds `import 'next/server'`)
    A->>S: npm run check:arch
    S-->>A: ✗ no-next-server-apis<br/>"...See src/pages/AGENTS.md → static-export contract"
    A->>D: read src/pages/AGENTS.md
    D-->>A: rationale + the right pattern (getStaticProps)
    A->>C: rewrite without next/server
    A->>S: npm run check:arch
    S-->>A: ✔ 0 violations
```

The arrow from sensor back to doc is what makes this an _engineered harness_ rather than a pile of linters. Without that citation, the agent fixes the symptom, not the principle.

---

## 7. What's intentionally _not_ here yet

The harness is computational-only. The inferential column is the next frontier:

- **/doc-gardener skill** — periodically audits whether the AGENTS.md files still describe reality. (`check:arch:doccoverage` is the computational floor for this; `/doc-gardener` is the inferential ceiling — it can spot stale prose, not just stale identifiers.)
- **/review-radar skill** — LLM-as-judge against the invariant table on a diff.
- **Generator + evaluator loop** — Anthropic-style two-agent pattern for visual changes to the radar SVG.

Also deliberately deferred: visual regression on the SVG, mutation testing, Lighthouse/axe — see roadmap notes in the project's planning artifacts.

---

## 8. The meta-rule (humans-ON-loop)

Kief Morris's distinction (Fowler exploring-gen-ai series):

- **Humans IN the loop** — gatekeep every change. Bottleneck.
- **Humans ON the loop** — improve the harness whenever a class of issue recurs. Compounds.

The rule for this project: **when a violation slips past every sensor and a human catches it in review, the fix is not just the code — it's also a new sensor, a new AGENTS.md line, or both.** That's the only way the harness keeps up with the codebase.

---

## 9. Quick reference

```bash
npm run check:arch          # source-only sensors (~3s)
  ├─ check:arch:depcruise   # import graph
  ├─ check:arch:eslint      # JSX / TS suppressions
  ├─ check:arch:readme      # config ↔ README
  └─ check:arch:doccoverage # AGENTS.md (Checked: …) refs resolve

npm run check:sec           # security sensors
  ├─ check:sec:sanitize     # rehype-sanitize wired in buildData.ts
  ├─ check:sec:deps         # osv-scanner (requires `brew install osv-scanner`)
  └─ check:sec:secrets      # gitleaks (requires `brew install gitleaks`)

npm run check:quality       # clean-code sensors
  ├─ check:quality:knip     # unused files / exports / deps
  ├─ check:quality:jscpd    # copy-paste detection
  ├─ check:quality:naming   # Biome useNamingConvention (src + scripts)
  └─ check:quality:sonar    # eslint-plugin-sonarjs (dedicated config)

npm run build               # static export → out/
npm run check:build         # build-output sensors
  ├─ check:build:routes     # every expected file present
  ├─ check:build:links      # no broken internal links
  └─ check:build:budget     # JS/CSS sizes within bundle-budget.json

npm test                    # includes architecture.test.ts (6 fs invariants)
```

Read these as a single command set: `check:arch && check:sec && check:quality && build && check:build && test`. If all six are green, the harness has signed off.
