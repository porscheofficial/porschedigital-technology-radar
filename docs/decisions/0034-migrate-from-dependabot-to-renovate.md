# ADR-0034 — Migrate dependency updates from Dependabot to Renovate

- Status: accepted (amends 0017)
- Date: 2026-08-04

## Context

Dependency updates have been driven by `.github/dependabot.yml` since the
security harness landed (ADR-0006, ADR-0017): two ecosystems (`npm`,
`github-actions`), a weekly Monday 08:00 Europe/Berlin schedule, seven
`npm` groups, and `build` / `ci` commit prefixes.

Mend Renovate has since been approved for the organization and the GitHub App
is installed on this repository. It opened its onboarding PR (#193) proposing a
root `renovate.json` with `extends: ["config:recommended"]`. Left as-is, the two
bots would run in parallel and open competing pull requests for the same
dependencies.

Four things made a straight copy of Dependabot's behaviour impossible:

1. **`config:recommended` emits `fix(deps):` for runtime dependencies** (via
   `:semanticPrefixFixDepsChoreOthers`). `release-please` treats `fix` as
   releasable, so every dependency bump would cut a patch release.
2. **Renovate treats Node as a dependency.** It reads `node-version:` from the
   workflows and `engines.node` from all three `package.json` files and proposes
   bumping 22 → 24. Node 22 is the deliberate *lowest supported* runtime, and
   the scaffolder e2e matrix intentionally spans 22/24/26.
3. **Dependabot emitted `build(deps-dev):`**, but `deps-dev` is not in the
   `scope-enum` in `commitlint.config.js`. This was invisible because the
   `commit-msg` hook is local-only and bot commits go through the GitHub API.
4. **Renovate can update `packageManager`** in the root `package.json` —
   a capability Dependabot never had, and one that needs to be a deliberate,
   reviewable change rather than a surprise.

Renovate also does not read `.github/dependabot.yml`
([renovatebot/renovate#21081](https://github.com/renovatebot/renovate/issues/21081)),
so the group definitions have to be re-expressed by hand.

## Decision

Renovate replaces Dependabot as the dependency-update tool.
`.github/dependabot.yml` is deleted in the same commit that adds
`.github/renovate.json5`, so the two bots never overlap.

**Preset.** `config:best-practices`, which adds SHA-digest pinning for GitHub
Actions, `:pinDevDependencies`, a three-day npm release cooldown
(`security:minimumReleaseAgeNpm`), weekly lockfile maintenance, and automatic
config migration on top of `config:recommended`.

**Commit contract.** `semanticCommitType: "build"` with a flat
`semanticCommitScope: "deps"` for npm, overridden to `ci` for the
`github-actions` manager. This keeps every bot commit inside the commitlint
`scope-enum`, retires the invalid `deps-dev` scope, and keeps dependency bumps
out of release-please's releasable types.

**Groups.** The seven Dependabot groups are carried over verbatim using
`matchPackageNames` globs with `!` negation — `matchPackagePatterns` and
`excludePackagePatterns` are deprecated.

**Node is pinned by policy, not by Renovate.** `node` is disabled across all
managers. Raising the floor stays a human decision recorded in an ADR.

**Automerge.** `minor`, `patch`, `pin` and `lockFileMaintenance` updates
automerge once the harness passes. Major updates never automerge:
`separateMajorMinor` (default `true`) takes priority over grouping, so a major
always lands in its own PR and cannot be swept in alongside minors.

**GitHub Actions updates are exempt from automerge.** ADR-0017 requires that a
proposed Action SHA be audited against its trailing `# vX.Y.Z` tag comment
before merge; that is the only thing standing between a reviewer and an opaque
40-character hash. Renovate keeps the SHA and the tag comment in sync
automatically and skips any reference without a version comment
(`skipReason: unversioned-reference`), so ADR-0017's idiom is preserved — but
the human check remains.

**Vulnerability handling.** Renovate has no vulnerability scanner of its own; it
reads GitHub's Dependabot alert data. Therefore **Dependabot alerts stay
enabled** and only **Dependabot security updates** are disabled. Security PRs
are labelled `security` and are *not* auto-merged: they deliberately bypass the
schedule, the concurrency limit, and the three-day cooldown, and that cooldown
is precisely the supply-chain guard that would otherwise be discarded.

This ADR amends ADR-0017, whose narrative refers to Dependabot as the tool that
maintains SHA pins and whose `CodeReviewID` justification cites auto-merged
Dependabot bumps. The SHA-pinning decision itself is unchanged; only the tool
that proposes the bumps changes.

## Consequences

### Good

- One bot, one dependency dashboard, no competing pull requests.
- Bot commits are valid conventional commits for the first time; the invalid
  `build(deps-dev):` scope is gone.
- Dependency bumps no longer risk triggering releases.
- `packageManager` and pnpm-workspace resolution are now covered, which
  Dependabot could not do.
- Non-major updates land without human intervention, so the review budget is
  spent on majors and on Action SHA audits — the two places it matters.
- The three-day npm cooldown puts a deliberate delay between a package being
  published and it being installable here.

### Trade-offs / risks

- `:pinDevDependencies` rewrites roughly thirty caret devDependency ranges to
  exact versions. Diffs get noisier; reproducibility improves.
- The first Renovate run proposes on the order of 39 pull requests, throttled by
  `prHourlyLimit: 2`. Expect a backlog for the first week.
- Automerge depends on repository settings the config cannot express: "Allow
  auto-merge" must be on, and branch protection must require the harness checks.
  If required checks are missing, automerge silently merges unverified changes.
- Closing Renovate's onboarding PR unmerged is Renovate's documented signal to
  *disable the repository*. It must be merged, or superseded by merging this
  configuration to `main`.
- Sixteen Dependabot pull requests are open at migration time. They do not close
  themselves and must be closed manually.
- Renovate's three-day cooldown is shorter than the fourteen days its own
  upgrade-best-practices guide suggests when automerge is enabled. Raising
  `minimumReleaseAge` is the knob if the automerge surface feels too wide.
