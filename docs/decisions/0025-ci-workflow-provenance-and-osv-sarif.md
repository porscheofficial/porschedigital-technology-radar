# ADR-0025 — CI workflow, npm provenance, and OSV SARIF upload

- Status: accepted (amends ADR-0017, amends ADR-0006)
- Date: 2026-04-22

## Context

OpenSSF Scorecard run `862382c` rates the repo at 7.6/10. Three checks
have actionable, non-policy gaps:

1. **`Signed-Releases` = -1**: `npm publish` runs without `--provenance`,
   so released tarballs carry no SLSA build-provenance attestation. The
   `id-token: write` permission on the `publish` job (granted in
   ADR-0017 for OIDC trusted publishing) is the only prerequisite — the
   flag itself is a one-character change.
2. **OSV-Scanner findings invisible in code-scanning UI**: ADR-0017
   chose `--format=table` for the `deps` job and dropped
   `security-events: write` accordingly, on the rationale that table
   output is human-readable in the Actions log. In practice this means
   advisories surface only when someone opens the failing run, and they
   never appear in the GitHub code-scanning tab next to CodeQL findings.
   Aggregating SARIF in one UI is the whole point of code-scanning.
3. **`CI-Tests` scored 10/10 on a sample**: Scorecard found a workflow
   running on PRs (the `Security` workflow's `sanitize` job) and gave
   full marks. But the project's actual test suite (`pnpm test`) and
   architectural sensors (`pnpm run check:arch`) only ran locally and
   in `deploy.yml` (which fires on push to `pdig`, not on PRs from
   forks). A real PR-blocking CI workflow was missing.

## Decision

Three coordinated changes, all on `pdig`:

1. **`release-please.yml`**: append `--provenance` to the `npm publish`
   step. No new permissions; `id-token: write` was already granted.
2. **`security.yml` `deps` job**: switch OSV-Scanner from
   `--format=table` to `--format=sarif --output=osv-results.sarif`,
   add `security-events: write` to the job permissions, and add a
   `github/codeql-action/upload-sarif` step (pinned to the same SHA
   used by `codeql.yml` and `scorecard.yml`) with
   `category: osv-scanner`. The OSV step gets `continue-on-error: true`
   so the SARIF upload runs even when advisories are present — the
   gate stays red because the upload step itself reports findings to
   code-scanning, where severity policy lives.
3. **New `ci.yml`**: PR- and push-triggered workflow with a single
   `verify` job running `pnpm install --frozen-lockfile`, `lint`,
   `tsc --noEmit`, `test`, `check:arch`, `build`, and `check:build`.
   Top-level `contents: read`. Job permissions `contents: read` only.
   All `uses:` lines pinned to commit SHAs with `# vTAG` comments per
   ADR-0017.

The CI workflow deliberately omits `check:sec`, `check:quality`, and
`check:a11y` from this initial pass:

- `check:sec` requires `osv-scanner` and `trufflehog` system binaries
  (per ADR-0006 / ADR-0011) that are already covered by `security.yml`.
- `check:quality:coverage` re-runs the full test suite with v8
  instrumentation, doubling wall time; folding it in is a future
  iteration once the floor stabilizes (see ADR-0015).
- `check:a11y:axe` requires a built `out/` and adds non-trivial runtime;
  it is a candidate for a follow-up workflow split.

The deliberate scope is "hard-fail the merge on the things that break
day-to-day development" — lint, types, tests, architecture invariants,
build, and build-output validation.

## Consequences

**Positive**

- `Signed-Releases` lifts from -1 to 10 on the next published version.
- OSV findings appear in GitHub's code-scanning tab alongside CodeQL,
  enabling unified triage.
- `CI-Tests` now reflects reality: the test suite blocks PRs, not just
  the sanitize job that happened to be sampled.
- The new `ci.yml` is the natural place to add `check:quality` and
  `check:a11y` jobs incrementally without re-relitigating workflow
  scope.

**Negative**

- One additional workflow-run per PR (the `verify` job) — duration is
  bounded by `pnpm run build` (~1–2 min on this repo).
- The OSV `deps` job now requires `security-events: write`. ADR-0017
  treated this as a real-but-acceptable widening; this ADR confirms that
  treatment and adds an explicit `continue-on-error` on the scan step
  so the failure mode is "SARIF uploaded with findings" rather than
  "step skipped, findings hidden".
- The README's Scorecard badge will tick up gradually as the next
  release lands and the next OSV scan completes; expect a 24-hour lag.

## Rejected alternatives

- **Add `--provenance` without an ADR**. Rejected: ADR-0017 documents
  the precise reason `id-token: write` exists on the publish job; any
  future agent rolling back the permission would silently break
  provenance. The rationale needs to live next to the permission.
- **Run all `check:*` scripts in `ci.yml` from day one**. Rejected:
  bundling untested workflow surface area with a security-posture
  change inflates blast radius. Land the lean version, observe, then
  add quality/a11y/sec jobs in follow-up ADRs.
- **Keep OSV at `--format=table` and add a sidecar SARIF generator**.
  Rejected: OSV-Scanner emits SARIF natively; there is no maintained
  table→SARIF converter, and inventing one would re-introduce the
  parsing fragility OSV's own SARIF output exists to avoid.
- **Replace `deploy.yml`'s build with `ci.yml`'s build**. Rejected:
  `deploy.yml` has Pages-specific environment variables
  (`NEXT_PUBLIC_BASE_PATH`) and an artifact-upload contract for the
  `actions/deploy-pages` consumer. Merging the two workflows entangles
  unrelated concerns; the ~30 s of duplicated build time is acceptable.

## Amendment — ADR-0027 (pnpm workspace migration)

After the workspace split (ADR-0027), the CI commands described in this ADR — `lint`, `tsc --noEmit`, `test`, `check:arch`, `build`, `check:build` — still run from the repo root, but the root `package.json` scripts are now orchestration wrappers that delegate to `pnpm --filter @porscheofficial/porschedigital-technology-radar run <name>`. The script names at the root are preserved so the workflow YAML did not need to change names; the verification surface the workflow exercises is unchanged.

Two workflow steps WERE updated as part of the migration to reach package-local commands directly (since the root `package.json` does not wrap them): `pnpm run build:data` became `pnpm --filter @porscheofficial/porschedigital-technology-radar run build:data`, and `path: out` became `path: packages/techradar/out` in the deploy workflow's artifact upload step. See `.github/workflows/ci.yml`, `.github/workflows/deploy.yml`, and `.github/workflows/security.yml` for the actual current shape.

The ADR's core decisions — single `verify` job, OIDC trusted publishing for npm provenance, `osv-scanner-action` with `continue-on-error: true` + SARIF upload, deferral of `check:sec`/`check:quality`/`check:a11y` from required-to-pass status — are all unchanged.
