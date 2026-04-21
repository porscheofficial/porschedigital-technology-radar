# ADR-0017 — Pin GitHub Actions to commit SHAs and tighten `GITHUB_TOKEN` permissions

- Status: accepted
- Date: 2026-04-21
- Amends: ADR-0006

## Context

The advisory OpenSSF Scorecard workflow (introduced in ADR-0006) opened
27 code-scanning alerts on the repository. Grouped by rule:

| Rule                  | Count | Severity | Source                                                       |
| --------------------- | ----- | -------- | ------------------------------------------------------------ |
| `PinnedDependenciesID`| 18    | medium   | Actions referenced by tag (`@v4`) instead of commit SHA      |
| `TokenPermissionsID`  | 2     | high     | Workflow / job using broader `GITHUB_TOKEN` scope than needed |
| `BranchProtectionID`  | 1     | high     | No branch protection on `pdig`                               |
| `CodeReviewID`        | 1     | high     | 0/29 changesets had an approving review                      |
| `SecurityPolicyID`    | 1     | medium   | No `SECURITY.md`                                             |
| `SASTID`              | 1     | medium   | No SAST tool runs on every commit (Scorecard's allow-list)   |
| `FuzzingID`           | 1     | medium   | No fuzzer integration                                        |
| `CIIBestPracticesID`  | 1     | low      | No OpenSSF Best Practices badge                              |
| `CITestsID`           | 1     | low      | 0/1 sampled merged PR had a CI test (sampling artifact)      |

ADR-0006 declared Scorecard advisory and non-gating, so none of these block
CI. They are still public posture signals on a flagship Porsche Digital OSS
repository, so we want a deliberate disposition for each one rather than
ignoring them collectively.

The 18 `PinnedDependenciesID` alerts and the 2 `TokenPermissionsID` alerts
are also genuine supply-chain concerns: a tag like `@v4` is mutable and a
compromised maintainer of a popular Action can repoint it without a release;
a `contents: write` token on every job widens the blast radius of any
compromised step. These were worth fixing on their own merits, independent
of Scorecard.

## Decision

Address the 27 alerts in three buckets — **fix**, **add**, **dismiss** —
rather than treating them as one undifferentiated pile.

### 1. Fix in workflow code (20 alerts → 0)

**`PinnedDependenciesID` (18 alerts).** Pin every Action reference to the
full 40-char commit SHA. The human-readable tag stays as a trailing
comment — that is the convention Dependabot, Renovate, and Scorecard all
expect, and it is the *only* way a reviewer can audit an opaque SHA against
an expected release. Without the comment the SHA is unreviewable.

The `npmCommand not pinned by hash` alert on
`release-please.yml`'s `npm install -g npm@latest` is addressed by pinning
to a specific minimum version (`npm@11.5.1`, the version Trusted Publishing
requires). True hash-pinning of `npm install -g` has no first-party tooling
and is not worth a custom integrity-checking install script for a single
binary that already runs against npm's own registry.

Bumping a pinned action becomes a deliberate, diffable act — same pattern
as the bundle budget (ADR-0005) and coverage floor (ADR-0015). Dependabot's
GitHub Actions ecosystem is configured separately (it understands the
SHA + comment idiom and updates both atomically).

**`TokenPermissionsID` (2 alerts).** Adopt **default-read, elevate-per-job**
for every workflow:

- Workflow-level `permissions: { contents: read }`.
- Each job re-declares `permissions:` with only what that job needs.

Concretely:

| Workflow             | Before                                                | After                                                       |
| -------------------- | ----------------------------------------------------- | ----------------------------------------------------------- |
| `deploy.yml`         | top-level `pages: write`, `id-token: write`           | `build` job: `contents: read`. `deploy` job: `pages: write`, `id-token: write` |
| `release-please.yml` | top-level `contents: write`, `pull-requests: write`   | top-level `contents: read`. `release-please` job: `contents: write`, `pull-requests: write`. `publish` job unchanged. |
| `security.yml`       | `deps` job: `security-events: write`                  | `deps` job: `contents: read` only — we emit `--format=table`, not SARIF, so the SARIF-upload permission was never used |

### 2. Add new gates (2 alerts → 0)

**`SecurityPolicyID` (1 alert).** Add `SECURITY.md` at the repo root with
a private-disclosure flow (GitHub Security Advisories preferred, email as
fallback), supported-versions statement, and a brief threat-model note that
links back to ADR-0006 and `docs/HARNESS.md`.

**`SASTID` (1 alert).** Add `.github/workflows/codeql.yml` running CodeQL
against `javascript-typescript` with the `security-and-quality` query pack
on every push to `pdig`, every PR, and weekly. Build mode `none` because
the static export does not need a build to analyse the source. Scorecard's
SAST detector has a closed allow-list (CodeQL, Snyk, SonarCloud,
Pysa, …); our existing Biome + dep-cruiser + ESLint + sonarjs stack does
not count, so we add the one Scorecard recognises. CodeQL findings will
appear in the same code-scanning UI as the Scorecard alerts, which gives
us a real second opinion on top of the harness.

CodeQL runs are advisory by default. If `security-and-quality` produces
high-confidence findings we will gate on them in a follow-up ADR; until
then, the workflow exists to (a) close the SAST alert and (b) provide
auditable evidence that an industry-standard SAST tool inspects every PR.

### 3. Dismiss with documented rationale (5 alerts → "won't fix")

The remaining five Scorecard rules don't fit the project. Dismissing
without explanation would leak as quietly-ignored alerts; dismissing with
a rationale (and pointing at this ADR in the dismissal comment) is the
deliberate signal.

| Alert                  | Disposition          | Rationale                                                                                                                                                                                              |
| ---------------------- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `FuzzingID`            | won't fix            | The artifact is a static HTML/JS site with no runtime input surface. There is no parser, no IPC, no network listener, nothing to fuzz. Adding a stub fuzzer to satisfy a checkbox would be theatre.    |
| `CIIBestPracticesID`   | won't fix            | The OpenSSF Best Practices badge is a self-attestation questionnaire. The signals it claims to capture (CI, tests, code review, security policy, license) are already independently visible: real CI workflows, the harness, this ADR set, `SECURITY.md`, the Apache-2.0 `LICENSE`. The badge would duplicate, not add.       |
| `CITestsID`            | won't fix            | The score is a sampling artifact: Scorecard inspected one merged PR. The repo has CI on every PR (`.github/workflows/security.yml`, `codeql.yml`, plus the harness). Score will self-correct with PR volume; no code change can fix a one-PR sample. |
| `BranchProtectionID`   | won't fix (for now)  | The repo runs with a small maintainer set under a Porsche Digital org. Branch protection on `pdig` requires PR review counts and status-check policies that don't match a one-maintainer cadence. Revisit when the maintainer set grows; until then, the repository ruleset would block release-please's automated PRs. |
| `CodeReviewID`         | won't fix (for now)  | Same root cause as `BranchProtectionID`. release-please commits and Dependabot bumps are auto-merged after the harness passes, by design. Forcing reviewer count > 0 would block automation that the harness already validates more rigorously than a human review would.   |

These are dismissed via the GitHub code-scanning API with `dismissed_reason:
won't fix` and a `dismissed_comment` pointing at this ADR. Re-running
Scorecard reopens dismissed alerts only if the underlying score *changes*,
so the dismissal sticks across the weekly run.

The two "for now" entries (`BranchProtectionID`, `CodeReviewID`) are
explicitly time-boxed: when the maintainer count grows past a single team,
re-evaluate and either lift the dismissal or amend this ADR.

## Consequences

- **27 → 0 open Scorecard alerts** with explicit dispositions for every
  rule. Future re-runs will not regress: pinning is enforced by the
  workflow code itself, dismissals carry rationale.
- The `# vN` trailing comments on every `uses:` line are now load-bearing —
  they are how a reviewer audits a SHA against a release. **Do not remove
  them when "cleaning up" workflow files.** The comment-hook in this
  workspace is configured to flag comment additions; the workflow comments
  are explicitly retained as security-required (priority-3 necessary).
- Bumping an Action becomes a two-line diff: SHA + tag comment. Dependabot
  handles this idiom natively. When Dependabot proposes a SHA, verify the
  tag comment matches the release before merging.
- `SECURITY.md` introduces a private-disclosure channel. Reports come in
  via GitHub Security Advisories or `opensource@porsche.digital`. The 5
  business day acknowledgement target is a soft commitment, not a contract.
- The CodeQL workflow consumes ~2–4 minutes of CI time per push.
  Acceptable; runs in parallel with the other security jobs.
- The minimum-permissions `GITHUB_TOKEN` policy is now the standard for
  this repo. Adding a new workflow that needs broader permissions requires
  declaring them at the job level — never at the workflow level — and
  citing this ADR in a comment if the elevated scope is non-obvious.

### Rejected alternatives

- **Disable the Scorecard workflow entirely.** Tempting given its
  advisory-only role and the noise. Rejected: Scorecard is a useful
  outside-perspective signal exactly because we don't pick what it
  measures. The fix is to make it pass, not to mute it.
- **Pin Actions with `dependabot.yml` only.** Dependabot can pin newly-added
  Actions but cannot retroactively pin existing ones. Manual one-shot
  conversion (this ADR) plus Dependabot maintenance going forward is the
  durable arrangement.
- **Skip CodeQL; argue Biome + dep-cruiser + sonarjs already cover SAST.**
  The harness *does* cover most of what CodeQL catches in this codebase.
  But Scorecard's SAST allow-list is closed, and CodeQL adds taint-tracking
  that the lint stack doesn't model. Worth the CI minutes; harmless if
  always green.
- **Add `SECURITY.md` and stop there.** Doesn't address pinning, doesn't
  address token scope, doesn't add the SAST signal. This ADR groups the
  whole Scorecard cleanup so the trade-offs are visible together rather
  than spread across five micro-PRs.
