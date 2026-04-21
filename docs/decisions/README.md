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
| 0006 | Security harness (Phase 1)                     | accepted (amended by 0011, 0017) |
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
| 0017 | Pin GitHub Actions to commit SHAs and tighten `GITHUB_TOKEN` permissions | accepted (amends 0006) |

## When to write a new ADR

Write one when you make a decision that:

- Constrains future work in a way that isn't self-evident from the code.
- Trades off two reasonable options and picks one.
- Adds, removes, or changes a steering-harness sensor or rule.

Skip ADRs for routine implementation choices. ADRs are for the load-bearing
decisions an agent should not silently revisit.
