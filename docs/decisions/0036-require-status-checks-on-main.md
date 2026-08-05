# ADR-0036 — Require status checks on `main` and approve bot-authored release PRs

- Status: accepted
- Date: 2026-08-05

## Context

The `main` branch has been governed by repository ruleset "Protect main
(OpenSSF)" since 2026-05-05. It enforced `deletion`, `non_fast_forward`,
`required_linear_history` and `pull_request` with
`required_approving_review_count: 0`.

None of those rules consult CI. The branch was protected against force-pushes
and non-linear history, but a pull request whose entire harness was red could
still be merged. Nothing surfaced the gap while every merge was human-driven and
every human waited for the checks.

Enabling Renovate changed that. Renovate enables GitHub auto-merge on
minor/patch updates, and GitHub auto-merge only waits for checks that are
*required*. With no required checks, "auto-merge when ready" meant "merge now".
On 2026-08-04 twelve dependency pull requests merged into `main` between 10:59
and 17:00 UTC while failing, and left it broken four ways at once:

- `pnpm-lock.yaml` desynchronised from an exact-pinned `@types/node`, so
  `pnpm install --frozen-lockfile` — the first step of every job — failed;
- Biome 2.5.6 renamed a linter configuration key and began applying a JSX
  accessibility rule to standalone `.svg` assets;
- `eslint-plugin-sonarjs` 4.2.0 added `super-linear-regex`, which flagged eight
  existing patterns;
- the CSS bundle exceeded its budget.

Each masked the next. Repairing them took a dedicated pull request.

Adding required checks fixes this, but interacts badly with one pull request:
the release-please PR. `.github/workflows/release-please.yml` authenticates with
`secrets.GITHUB_TOKEN`, and GitHub places workflow runs triggered by a
`GITHUB_TOKEN`-authored pull request into an approval-required state rather than
running them. Such a run reports no check runs at all, so every required context
stays pending forever and the release PR can never merge. Because the ruleset
has no bypass actors, an administrator cannot override it either.

## Decision

Add `required_status_checks` to the existing ruleset, covering the nine contexts
that run on pull requests:

- `Lint, types, tests, build`
- `Bootstrap fresh clone`
- `Scaffolder to framework e2e (Node 22)`, `(Node 24)`, `(Node 26)`
- `Analyze (javascript-typescript)`
- `OSV-Scanner (npm advisories)`
- `TruffleHog (committed secrets)`
- `rehype-sanitize wiring + XSS regression`

`strict_required_status_checks_policy` stays `false`. Requiring branches to be
up to date with `main` would mean every merge invalidates every other open pull
request; with a Renovate backlog in the dozens that serialises the queue and
defeats auto-merge.

Jobs that only run on `push` to `main` — `build`, `deploy`, `publish`,
`release-please`, `OpenSSF Scorecard` — are deliberately excluded. A required
context that never reports on a pull request blocks every pull request.

Approvals stay at zero. The harness is the gate; requiring a reviewer would stop
auto-merge without adding a check that CI does not already perform.

The release-please pull request is unblocked by approving its pending workflow
runs — the **Approve workflows to run** button in the merge box, or
`POST /repos/{owner}/{repo}/actions/runs/{run_id}/approve`. This is a manual
step, once per release, performed by someone with write access.

## Consequences

### Good

- A pull request cannot merge into `main` with a failing harness, whether it is
  opened by a human, by Renovate, or by auto-merge.
- Renovate's auto-merge becomes safe: it now queues behind the harness instead
  of racing it.
- Administrators are not exempt, so the guarantee holds uniformly.

### Trade-offs / risks

- Every release requires a human to approve the release PR's workflow runs.
  Forgetting leaves the release PR permanently blocked, which is visible but
  silent — nothing fails, the PR simply never becomes mergeable.
- `strict: false` means a pull request can merge against a slightly stale
  `main`. Two individually-green changes can still combine into a red `main`;
  the `push` run on `main` is what catches that.
- The required context list is coupled to job names. Renaming a job in
  `.github/workflows/` without updating the ruleset silently drops that gate, or
  blocks every pull request if the old name is still required.

### Alternatives considered

- **Give release-please a GitHub App or personal access token.** Pull requests
  authored by either run workflows without the approval prompt. Installing an
  App requires organisation-owner rights we do not have, which is why Renovate
  itself was installed as a marketplace app rather than self-hosted; a
  fine-grained token needs the same approval. Rejected as unavailable.
- **Dispatch the workflows from `release-please.yml`.** `workflow_dispatch` is
  an explicit exception to the `GITHUB_TOKEN` suppression rule, so the job could
  trigger its own checks. Rejected: it exists specifically to circumvent a
  deliberate safety gate on bot-authored code, it cannot be tested before it is
  on the default branch, and it would spread release plumbing across four
  workflow files to save one click per release.
- **Add a bypass actor to the ruleset.** One API call, but release PRs would
  then merge untested — reinstating the exact failure mode this ADR exists to
  close.
