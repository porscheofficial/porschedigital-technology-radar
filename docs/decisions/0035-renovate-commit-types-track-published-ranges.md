# ADR-0035 — Renovate commit types track the published dependency range

- Status: accepted (amends 0034)
- Date: 2026-08-05

## Context

ADR-0034 migrated dependency updates from Dependabot to Renovate. It recorded
that `.github/renovate.json5` sets a flat `semanticCommitType: "build"` so that
every dependency update lands as `build(deps): …`, and it justified that choice
as keeping release-please from cutting a release for each dependency bump.

Two weeks of real commits show that is not what happens, and that the recorded
intent was wrong on the merits.

`config:best-practices` pulls in `config:recommended`, which pulls in
`:semanticPrefixFixDepsChoreOthers`. That preset supplies its own `packageRules`,
and package rules are applied after — and therefore override — top-level
configuration. The effective mapping is:

| Commit type   | Emitted when                                                | Release? |
| ------------- | ----------------------------------------------------------- | -------- |
| `fix(deps)`   | a range in a published `dependencies` block moved            | yes      |
| `chore(deps)` | a devDependency moved, or only `pnpm-lock.yaml` moved        | no       |
| `build(deps)` | lock file maintenance                                        | no       |

Only the last row is actually set by our top-level value.

Of the 24 dependency commits that reached `main`, exactly two produced
`fix(deps)`: `@porsche-design-system/components-js` moving from `4.1.0` to
`4.5.0`, and `satori` moving from `^0.26.0` to `^0.29.0`. Both edited the
`dependencies` block of `packages/techradar/package.json`, which is published to
npm. Every other update — including `next`, `react`, `html-react-parser` and
`@radix-ui/react-dialog`, all of which live in `dependencies` — produced
`chore(deps)`, because the declared caret range already admitted the new version
and only the lockfile changed.

That distinction is precisely the one a consumer cares about. A consumer of
`@porscheofficial/porschedigital-technology-radar` resolves its own dependency
tree from our published `package.json`; our lockfile is not published. When our
declared range does not move, there is nothing for a consumer to install and no
reason to publish. When it does move, withholding the release means the change
never reaches anyone.

Flattening every update to `build(deps)`, as ADR-0034 described, would have
suppressed the release for the Porsche Design System bump. The published package
would have continued to declare `4.1.0` indefinitely while our own repository
built against `4.5.0`.

## Decision

Renovate's default commit-type mapping stands. `.github/renovate.json5` keeps
`semanticCommitType: "build"` — it is the correct value for the one case it
still governs, lock file maintenance — and does not attempt to override
`:semanticPrefixFixDepsChoreOthers`.

The rule to reason from is: **the commit type tracks whether the published
dependency range moved, not whether the dependency is a runtime or a development
one.** A dependency update cuts a release exactly when it changes what a
consumer would install.

This ADR changes no behaviour. It corrects the rationale recorded in ADR-0034
and the comment in `.github/renovate.json5`, both of which described a
configuration that was never in effect and should not be put into effect.

## Consequences

### Good

- Dependency updates that matter to consumers ship to npm without manual
  intervention; ones that do not, do not generate release noise.
- The `.github/renovate.json5` comment now matches observable behaviour, so the
  next reader will not "fix" the config to match a stale description.
- No release-please or Renovate configuration changes, so no risk of regression.

### Trade-offs / risks

- A `fix(deps)` update that is also eligible for automerge can reach `main` and
  cut a release without a human in the loop. This is intended — the harness is
  the gate, not a human — but it means the release cadence is driven by upstream
  publishing schedules.
- The mapping lives in an upstream preset. If Renovate changes
  `:semanticPrefixFixDepsChoreOthers`, our release-triggering behaviour changes
  with it. The `:configMigration` arm of `config:best-practices` will surface
  preset changes as a pull request, but the semantics are not pinned.
- Hand-written commits do not get this treatment. A lockfile-only change
  committed manually as `fix(deps)` will cut a release; use `chore` for those.
