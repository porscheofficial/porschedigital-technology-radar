# ADR-0011 — Swap gitleaks for TruffleHog as the secrets-scanning sensor

- Status: accepted
- Date: 2026-04-21
- Amends: ADR-0006

## Context

ADR-0006 picked `gitleaks` for `check:sec:secrets`, with the official
`gitleaks/gitleaks-action@v2` running in CI and `brew install gitleaks` for
local devs. That decision held for the binary itself (MIT-licensed, free) but
overlooked a wrinkle in the *Action* wrapper:

`gitleaks-action@v2` requires a `GITLEAKS_LICENSE` secret for any
organization-owned repository. The license is free for personal accounts and
public org repos in some configurations, but obtaining one routes through a
sign-up flow that is friction we don't want to ask contributors or fork
maintainers to navigate. In practice this turns the secrets gate into a
"contact us" step the moment the repo moves under an organization.

Two clean fixes:

1. Drop the Action wrapper and run the gitleaks binary directly in CI
   (no license needed — only the wrapper is gated).
2. Swap to a tool that has no commercial gate at any layer.

Either preserves the invariant. Option 2 was picked.

## Decision

Replace gitleaks with **TruffleHog** as the `check:sec:secrets` sensor.

TruffleHog (`trufflesecurity/trufflehog`):

- Apache-2.0, no license gate at any layer (binary or Action).
- Larger detector set than gitleaks (700+ detectors as of v3.x).
- **Verifies** detected secrets by default — calls the live API for the
  matched provider (AWS, GitHub, Stripe, etc.) to confirm the credential is
  active. Reduces false-positive churn dramatically.
- Native flat invocation: `trufflehog git file://. --no-update --fail
  --results=verified,unknown`.
- Official GitHub Action: `trufflesecurity/trufflehog@main`. No token
  required for OSS use.

**Wiring:**

| Layer       | Command                                                                          |
| ----------- | -------------------------------------------------------------------------------- |
| Local       | `npm run check:sec:secrets` → `trufflehog git file://. --no-update --fail --results=verified,unknown` |
| CI          | `trufflesecurity/trufflehog@main` step in `.github/workflows/security.yml`       |
| Local install | `brew install trufflehog`                                                      |

`--results=verified,unknown` is the conservative default: report verified
hits (definite live credentials) plus unknowns (detectors with no
verification path). False positives from "unverified" matches against
example/dummy keys are excluded.

`knip.json` `ignoreBinaries` updated: `gitleaks` → `trufflehog`. ADR-0006
flagged the same pattern when `osv-scanner` and `gitleaks` were added.

### Rejected alternatives

- **Run gitleaks binary directly in CI** (Option 1 above) — keeps the
  current rule engine and avoids a new dependency, but TruffleHog's secret
  *verification* is a real upgrade and worth the swap. The license issue
  was the trigger; TruffleHog's verification is the reason we didn't just
  patch around it.
- **Detect-secrets (Yelp)** — Python-based, slower, no verification,
  smaller community. Not worth the swap.
- **GitHub native secret scanning** — free for public repos but doesn't run
  locally, doesn't gate PRs the same way, and offers no parity for forks.
  Useful as belt-and-braces; not a replacement for the explicit sensor.

## Consequences

- ADR-0006's secrets-scanner choice is superseded; everything else in
  ADR-0006 (sanitize sensor, OSV-Scanner, Scorecard advisory workflow,
  binary-distribution policy) stands.
- Local devs who had `gitleaks` installed need `brew install trufflehog`.
  `brew uninstall gitleaks` is optional cleanup.
- Verified-only scanning means a leaked-but-revoked credential won't fail
  the gate. That is correct behavior — revoked credentials are not a live
  risk — but it means the gate does not double as an audit trail. For
  audit, GitHub native secret scanning (which is enabled on public repos
  by default) is the complementary signal.
- The invariant table in `docs/HARNESS.md` (#15) and the security section
  of the root `AGENTS.md` reference TruffleHog instead of gitleaks; the
  two-layer defense framing for #13 (sanitize) is unchanged.

## Update — 2026-04-21: Worktree caveat and pre-commit gate

### Context

Local contributors increasingly work from Git worktrees, where `.git` is a
text file pointing at the real gitdir instead of a directory. TruffleHog's
`git` mode currently has an upstream worktree bug (`trufflesecurity/trufflehog`
issue #4553). As of this ADR update, the fix is proposed in PR #4690 but has
not shipped in a release.

That bug only affects the local worktree path. CI runs against a normal fresh
checkout, so the existing `check:sec:secrets` command remains correct there and
was intentionally **not** changed.

### Decision

Add a complementary local pre-commit gate that scans only the staged blobs.

- Husky runs `pnpm run precommit:secrets` after `lint-staged`.
- The script materializes staged content into a temporary tmpdir mirror.
- It invokes `trufflehog filesystem <tmpdir> --fail --results=verified,unknown --no-update --json`.
- If the `trufflehog` binary is missing locally, the hook warns and exits 0 so
  contributors are nudged to install it without blocking commits.

Using `filesystem` mode sidesteps the worktree bug entirely while still giving
developers a fail-fast local guard before a secret lands in history.

### Consequences

- CI keeps using `trufflehog git file://.` because that remains the right sensor
  for committed history in a normal checkout.
- Local developers get fast feedback on the exact staged payload, including
  partial staging via `git add -p`.
- When PR #4690 lands and is released, we can revisit whether local hooks can
  switch back to `git` mode without the tmpdir mirror workaround.
