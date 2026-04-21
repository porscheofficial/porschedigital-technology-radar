# ADR-0006 — Security harness (Phase 1)

- Status: accepted (secrets-scanner choice amended by ADR-0011)
- Date: 2026-04-21

## Context

The steering harness (docs/HARNESS.md) covers architecture and build-output
invariants but has no sensors for the three security concerns most likely to
hurt a static, content-driven site:

1. **Vulnerable npm dependencies.** A purely-static export still ships a JS
   bundle to every visitor; a known-CVE transitive dep is a real exposure.
2. **Committed secrets.** Any token leaked to git history is public the moment
   `pdig` is pushed (the repo is open source).
3. **XSS in user-supplied markdown.** `data/radar/**/*.md` is converted to HTML
   at build time with the unified/rehype pipeline in `scripts/buildData.ts`.
   The pipeline currently calls `remarkRehype` without `allowDangerousHtml`, so
   raw HTML is dropped — but that protection is one keystroke away from being
   reverted, and there is no sensor that would catch the regression.

Adjacent options considered and rejected for Phase 1:

- **knip / jscpd / stricter naming-convention rules.** Useful, but clean-code
  concerns, not security. Deferred to a separate phase.
- **`eslint-plugin-sonarjs`.** The package has been reorganised upstream;
  picking a successor is a research task that should not block the security
  work. Deferred.
- **Snyk / Socket.dev.** Both require an account and a token. OSV-Scanner uses
  the public OSV.dev database, runs entirely in CI, and needs no secrets.

## Decision

Add a third harness arm — `check:sec` — with three sensors and one
non-gating advisory workflow.

**Source-only sensors (run locally + in CI):**

| Script               | Tool                                | Concern                                       |
| -------------------- | ----------------------------------- | --------------------------------------------- |
| `check:sec:sanitize` | `tsx scripts/checkSanitize.ts`      | rehype-sanitize stays wired into buildData.ts |
| `check:sec:deps`     | `osv-scanner --lockfile=…`          | known CVEs in npm graph                       |
| `check:sec:secrets`  | `gitleaks detect --no-git -s .`     | committed secrets / API tokens                |

`scripts/checkSanitize.ts` parses `scripts/buildData.ts` and asserts that
`rehypeSanitize` is imported, called immediately after `remarkRehype`, and
that `allowDangerousHtml: true` appears nowhere in the file. A companion
Vitest suite (`scripts/__tests__/sanitize.test.ts`) feeds XSS payloads —
`<script>`, `<iframe>`, inline event handlers, `javascript:` URIs in both
markdown links and autolinks — through the real pipeline and asserts the
executable surface is stripped.

`rehype-sanitize` is wired into `createProcessor` in `scripts/buildData.ts`
as defense-in-depth: even if a future change flips `allowDangerousHtml`,
sanitize will still strip dangerous markup. The two-layer setup
(no-`allowDangerousHtml` + sanitize) is intentional and the sensor enforces
the second layer.

**Advisory workflow (CI-only, non-gating):**

`.github/workflows/scorecard.yml` runs OpenSSF Scorecard weekly and on push
to `pdig`. Results upload as SARIF to GitHub's code-scanning UI. Findings do
not fail PRs — Scorecard is a posture metric, not a blocking check.

**Binary distribution:**

`osv-scanner` and `gitleaks` are NOT added to `devDependencies`. They are
Go binaries with no useful npm wrapper; pulling them through npm would add
platform-specific binary downloads to every `npm ci`. Instead:

- **CI** uses the official actions (`google/osv-scanner-action@v2`,
  `gitleaks/gitleaks-action@v2`).
- **Local devs** install via `brew install osv-scanner gitleaks` (one-time).
  Without them installed, `npm run check:sec:deps` / `:secrets` exits with
  `command not found` — that is the intended UX, documented in the root
  `AGENTS.md`.

## Consequences

- One new umbrella script (`npm run check:sec`) and three new sensors.
  Definition of Done in `AGENTS.md` is updated to require it alongside
  `check:arch`.
- Local devs without `osv-scanner` / `gitleaks` installed cannot run the full
  `check:sec` suite locally. The `:sanitize` sensor needs no extra binary and
  remains the primary local feedback loop. CI is the source of truth for the
  other two.
- The wiki-link / external-link / PDS rewriting plugins in `buildData.ts` run
  *after* `rehypeSanitize`. Their output (`target=_blank`, `rel`, the
  `<p-link-pure>` custom element) is therefore not subject to the sanitize
  schema. The pipeline ordering is load-bearing and called out in the
  `createProcessor` comment block.
- Scorecard's SARIF upload requires `security-events: write` and the
  `branch_protection_rule` event; both are scoped to the Scorecard job only.
- Phase 2 (clean-code harness — knip wire-in, duplication detection,
  naming-convention enforcement, sonar successor) is explicitly out of scope
  for this ADR and will be its own ADR when picked up.
