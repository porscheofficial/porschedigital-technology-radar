# Architecture Decision Records

This directory holds **ADRs** — short, dated records of architectural decisions
that shape the codebase and the steering harness. Each ADR is immutable once
accepted; new decisions supersede old ones rather than editing them.

## Format

Each file follows the [Nygard ADR template](https://github.com/joelparkerhenderson/architecture-decision-record):

```
# ADR-NNNN — Title

- Status: accepted | superseded by ADR-XXXX
- Date: YYYY-MM-DD

## Context
## Decision
## Consequences
```

## Why ADRs in this repo

The steering harness ([docs/HARNESS.md](../HARNESS.md)) tells agents **what** the
rules are. ADRs tell them **why** — the historical context that makes the rule
non-obvious. When an agent (or a human) is tempted to "fix" a constraint, the
relevant ADR is the first stop.

Per-rule `comment` strings in `.dependency-cruiser.cjs` and per-line
`(Checked: …)` references in the `AGENTS.md` files cite specific rules; the
ADRs cite the *decisions behind those rules*.

## Index

| ID   | Title                                          | Status   |
| ---- | ---------------------------------------------- | -------- |
| 0001 | Pages Router, not App Router                   | accepted |
| 0002 | Static export targeting GitHub Pages           | accepted |
| 0003 | No `next/image`                                | accepted |
| 0004 | `format.ts` reads config, not `data.ts`        | accepted |
| 0005 | Bundle budget enforced via fs walk, not @next/bundle-analyzer | accepted |
| 0006 | Security harness (Phase 1)                     | accepted (amended by 0011, 0017, 0025) |
| 0007 | Clean-code harness, Phase 2a: knip             | accepted |
| 0008 | Clean-code harness, Phase 2b: jscpd            | accepted |
| 0009 | Clean-code harness, Phase 2c: useNamingConvention | accepted |
| 0010 | Clean-code harness, Phase 2d: SonarJS           | accepted |
| 0011 | Swap gitleaks for TruffleHog                    | accepted |
| 0012 | Architecture harness: wiki-link integrity sensor | accepted |
| 0013 | Security harness: license compliance check     | accepted |
| 0014 | Build harness: HTML structural validation      | accepted |
| 0015 | Quality harness: test coverage floor           | accepted |
| 0016 | Quality harness: spell-check on documentation  | accepted |
| 0017 | Pin GitHub Actions to commit SHAs and tighten `GITHUB_TOKEN` permissions | accepted (amends 0006, amended by 0025) |
| 0018 | A11y harness: jsx-a11y on source + axe-core on built HTML | accepted |
| 0019 | Package manager: pnpm via Corepack             | accepted |
| 0020 | Per-item Open Graph image generation           | accepted |
| 0021 | Recategorize build-time deps so the consumer shadow workspace can install with `--omit=dev` | accepted |
| 0022 | Pin `next` to `16.2.3` (no caret) until upstream regression #92580 is fixed | superseded by ADR-0023 |
| 0023 | Fence module resolution to the shadow workspace (`outputFileTracingRoot` + webpack alias) | superseded by ADR-0024 (config retained as defense-in-depth) |
| 0024 | Skip nested `node_modules/` when copying the shadow workspace | accepted (supersedes 0023) |
| 0025 | CI workflow, npm provenance, and OSV SARIF upload | accepted (amends 0006, amends 0017) |
| 0026 | Rename default branch from `pdig` to `main`   | accepted |
| 0027 | pnpm workspace monorepo                        | accepted |
| 0028 | Rename quadrant to segment                     | accepted |
| 0029 | Per-package licensing: techradar Apache-2.0, create-techradar MIT | accepted |
| 0030 | `create-techradar` is a one-shot bootstrapper, not a template owner | accepted |

## When to write a new ADR

Write one when you make a decision that:

- Constrains future work in a way that isn't self-evident from the code.
- Trades off two reasonable options and picks one.
- Adds, removes, or changes a steering-harness sensor or rule.

Skip ADRs for routine implementation choices. ADRs are for the load-bearing
decisions an agent should not silently revisit.
