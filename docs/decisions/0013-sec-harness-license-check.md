# ADR-0013 — Security harness: license compliance check

- Status: accepted
- Date: 2026-04-21

## Context

ADR-0006 framed the security arm around three failure modes: XSS in
markdown rendering (`check:sec:sanitize`), known CVEs in the npm graph
(`check:sec:deps`), and committed secrets (`check:sec:secrets`).
License contamination is a fourth failure mode in the same arm —
shipping a copyleft dependency under an Apache-2.0 project creates
legal exposure that no other sensor catches.

The risk profile is asymmetric: a single transitive copyleft can
require relicensing the entire site (in the AGPL/SSPL/BUSL case) or
demand source distribution (GPL/LGPL). Detection is cheap; the cost
of missing it is catastrophic.

## Decision

Add `check:sec:licenses` to the security arm using
`license-checker-rseidelsohn` (the maintained successor to
`license-checker`):

```
license-checker-rseidelsohn --production \
  --excludePackages '@porscheofficial/porschedigital-technology-radar@1.0.4' \
  --failOn 'GPL;AGPL;LGPL;SSPL;BUSL;CC-BY-NC'
```

Three deliberate choices:

- **`--production`** — devDependencies are excluded. Build-time tools
  with copyleft licenses (e.g. `eslint-plugin-sonarjs` is LGPL-3.0,
  per ADR-0010) don't ship to users and don't trigger contamination.
- **`--excludePackages` for the project's own self-listing** —
  `license-checker-rseidelsohn` includes the project under
  inspection in its output. Without the exclusion, the project's own
  Apache-2.0 listing would conflict with itself in some
  configurations. The exclusion is surgical: only this exact
  versioned package name.
- **`--failOn` allowlist by license family** — explicit deny-list of
  the copyleft families that pose real exposure (GPL/AGPL/LGPL),
  the source-availability families (SSPL/BUSL), and non-commercial
  Creative Commons (CC-BY-NC). Permissive licenses (MIT, ISC, BSD,
  Apache, Unlicense) and SaaS-friendly source-available
  (CC-BY/CC-BY-SA, MPL-2.0) are allowed.

### Rejected alternatives

- **`license-checker` (original).** Rejected: unmaintained since
  2022. `license-checker-rseidelsohn` is a drop-in fork with active
  releases.
- **`@oss-review-toolkit/ort` or FOSSA.** Rejected: heavyweight,
  requires a daemon or SaaS account. The harness principle is local
  gating; ORT/FOSSA belong in a separate compliance pipeline.
- **Manual license review on `npm install`.** Rejected: violates the
  "every invariant has an automated sensor" rule (ADR-0006).
- **Allowlist mode (`--onlyAllow`) instead of denylist.** Rejected:
  permissive licenses have a long tail (MIT-0, BSD-Source-Code,
  Python-2.0, …) and an allowlist would generate false positives
  every time a transitive dep ships an obscure-but-fine license.
  Denylist is the right shape for known-bad license families.

## Consequences

- `check:sec` grows from three to four sub-scripts. CI must run
  `check:sec:licenses` on every PR; the local DoD command set is
  unchanged in shape.
- `license-checker-rseidelsohn` is added to `devDependencies`. It is
  pure JS (no Go binary), so it works in every dev environment
  without `brew install`.
- The `--excludePackages` self-listing is brittle to version bumps.
  When `package.json`'s `version` changes, the exclusion string must
  follow. (Captured in code review checklist; trivial to spot when
  the sensor flags the project itself.)
- Adding a new dependency now has a license dimension. If a
  prospective dep is GPL/AGPL/LGPL/SSPL/BUSL, the sensor fails fast
  before it merges.
