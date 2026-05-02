# ADR-0010 — Clean-code harness: SonarJS via dedicated ESLint config

- Status: accepted
- Date: 2026-04-21

## Context

Phase 2 of the harness (per ADR-0007) closes with the fourth and final
clean-code arm: a code-smell sensor. The original ADR-0007 plan named
`eslint-plugin-sonarjs` but flagged it as "needs research" — SonarSource
moved the project into the `SonarSource/SonarJS` monorepo and aliases
appeared in the ecosystem.

Research (April 2026):

- **`eslint-plugin-sonarjs@4.0.3`** is still the canonical npm package
  (2.05M weekly downloads, LGPL-3.0, last published 2026-04-16).
- `@sonar/eslint-plugin` does not exist on npm. `eslint-plugin-sonar` is
  unofficial third-party.
- Native flat-config support: `import sonarjs from "eslint-plugin-sonarjs"`
  then spread `sonarjs.configs.recommended` (a flat-config object).
- Pure static analysis. No SaaS, no token, no network.
- Recommended preset: 204 of 269 rules. Categories: cognitive complexity,
  dead stores, code smells, security-adjacent (regex injection,
  prototype pollution), React hooks. Overlap with Biome and TS strict
  mode is minimal — Sonar operates above the type system.

A survey under `recommended` produced 13 errors across 11 files in four
shapes:

1. **Build-time regex on trusted input** (5×) — `slow-regex` warnings on
   patterns in `packages/techradar/scripts/*` and `packages/techradar/src/lib/*` that parse our own markdown
   at build time. The site is statically exported; these patterns never
   see user input at runtime. ReDoS is not in this threat model.
2. **Visual jitter** (2×) — `pseudo-random` on `Math.random()` calls in
   `packages/techradar/scripts/positioner.ts` that scatter blip positions inside the radar
   SVG. Not security-sensitive.
3. **Domain string aliases** (1×) — `redundant-type-aliases` on
   `type Release = string` in `packages/techradar/src/lib/types.ts`. The alias is
   intentional self-documentation across the data layer.
4. **Real code smells** (5×) — nested ternaries in JSX
   (`packages/techradar/src/components/ItemDetail/ItemDetail.tsx`, `packages/techradar/src/components/Teams/Teams.tsx`), nested functions in a tooltip
   cleanup pattern (`packages/techradar/src/hooks/useRadarTooltip.ts`), one cognitive-complexity
   overflow in `parseDirectory` (`packages/techradar/scripts/buildData.ts`), one
   `concise-regex` (`packages/techradar/scripts/checkConfigReadmeSync.ts`).

## Decision

Add `eslint-plugin-sonarjs` as a devDependency and run it through a
**dedicated flat config** (`packages/techradar/sonar.eslint.config.mjs`) so the sensor
reports independently from `check:arch:eslint`. The architectural arm
stays surgical (bans for `as any`, ts-suppression directives,
`dangerouslySetInnerHTML`, `assetUrl()` shape); the clean-code arm owns
the noise.

```
"check:quality:sonar": "eslint --config sonar.eslint.config.mjs src scripts bin"
```

Three rule disables in the new config, each with rationale:

- `sonarjs/slow-regex` — build-time on trusted markdown.
- `sonarjs/pseudo-random` — visual blip jitter.
- `sonarjs/redundant-type-aliases` — domain types are intentional.

Real-smell triage:

- **Fixed inline**: nested JSX ternaries (extracted to `let` +
  `if/else` in `ItemDetail.tsx`; explicit typed local in `Teams.tsx`),
  `concise-regex` (`[a-zA-Z0-9_]` → `\w`).
- **Per-line `eslint-disable-next-line` with rationale**:
  `parseDirectory` cognitive-complexity (refactoring would fragment a
  build-time pipeline without reducing real complexity);
  `useRadarTooltip` nested-functions (per-id closure binding inside a
  React state setter loop).

To prevent the disable directives from breaking `check:arch:eslint`
(which doesn't enable sonarjs rules and would otherwise see them as
"unused"), `packages/techradar/eslint.config.mjs` loads the sonarjs plugin without
enabling rules and sets `linterOptions.reportUnusedDisableDirectives:
"off"`.

### Rejected alternatives

- **Single config, dual invocation** — running both
  architectural-only and `--config sonar.eslint.config.mjs` against the
  same file set conflates failures. A regression in cognitive
  complexity would surface under `check:arch`, polluting the
  architectural signal.
- **Single config, drop dedicated script** — folding sonarjs into
  `check:arch:eslint` violates the Phase 2 "one sensor = one script"
  pattern (ADR-0007/0008/0009) and ties hygiene to architecture.
- **`@sonar/eslint-plugin`** — does not exist on npm.
- **`eslint-plugin-sonar`** — unofficial third-party (`un-ts`), not the
  upstream maintainer. Rejected.
- **Type-aware mode (`parserOptions.project`)** — would unlock 67
  additional rules at the cost of full type-check on every lint run.
  Recommended preset (202 syntactic rules) catches the relevant smells
  in this codebase; revisit if a specific type-aware rule becomes
  worth the wall-clock cost.
- **Refactor `parseDirectory`** — splitting the build-time directory
  walker fragments a per-file try/catch pipeline without reducing real
  complexity. The function is well-tested; the suppression is honest.

## Consequences

- The `check:quality` umbrella now runs four sensors in sequence:
  knip, jscpd, naming, sonar. All four must pass; a regression in any
  arm fails the gate.
- Two suppressions are encoded in source with rationale comments
  pointing at this ADR. Removing them later is a deliberate refactor.
- The architectural ESLint config has a hairline coupling to sonarjs
  (loads the plugin to resolve rule names in disable comments). The
  alternative — duplicate disable comments per config — was worse.
- Phase 2 of the harness is complete. Future expansion lives under
  separate ADRs.
