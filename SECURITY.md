# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in this project, please report it
privately. **Do not open a public GitHub issue.**

Use one of the following channels:

- **GitHub Security Advisories** (preferred): open a private advisory at
  <https://github.com/porscheofficial/porschedigital-technology-radar/security/advisories/new>.
- **Email**: send a report to the Porsche Digital open-source team at
  <opensource@porsche.digital>.

When reporting, please include:

- A description of the issue and its impact.
- Steps to reproduce, or a minimal proof-of-concept.
- The affected version(s) or commit hash.
- Any suggested mitigation, if known.

We aim to acknowledge new reports within **5 business days** and to provide a
remediation plan or fix within **30 days** for high-severity issues.

## Supported Versions

Only the latest published release of
`@porscheofficial/porschedigital-technology-radar` on npm and the current
`pdig` branch on GitHub receive security fixes. Older releases are not
patched.

## Security Posture

This project is a **statically exported site** (Next.js → static HTML/JS in
`out/`). It has no server, no API routes, no runtime data fetching, and no
authentication surface of its own. The threat model focuses on:

1. **Build-time injection** — malicious content in `data/radar/**/*.md`
   reaching the rendered HTML. Mitigated by `rehype-sanitize` (see
   `docs/decisions/0006-security-harness.md`).
2. **Supply chain** — dependencies and GitHub Actions. Mitigated by:
   - `osv-scanner` (npm CVEs) — `npm run check:sec:deps`.
   - `trufflehog` (committed secrets) — `npm run check:sec:secrets`.
   - `license-checker` (license-family policy) — `npm run check:sec:licenses`.
   - All GitHub Actions pinned to commit SHAs
     (see `docs/decisions/0017-pin-actions-and-tighten-tokens.md`).
3. **Hosting** — the static output runs under a configurable `basePath` on
   GitHub Pages. The deploy workflow uses minimum-required token permissions
   (`pages: write`, `id-token: write` only on the deploy job).

For the full harness, see `docs/HARNESS.md`.
