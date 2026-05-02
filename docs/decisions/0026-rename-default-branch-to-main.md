# ADR-0026 — Rename default branch from `pdig` to `main`

- Status: accepted
- Date: 2026-04-23

## Context

The repository used `pdig` as its default branch because it originated as a
fork. It is now an independent, standalone project. `pdig` is an unconventional
name that confuses contributors and tooling that assumes `main`.

All CI workflows, the `release-please` target branch, the `editUrl` config, and
documentation badges were hard-coded to `pdig`.

## Decision

Rename the default branch from `pdig` to `main` on GitHub and update all
references in source:

- GitHub Actions workflows (`ci.yml`, `deploy.yml`, `release-please.yml`,
  `scorecard.yml`, `security.yml`, `codeql.yml`) — trigger branch updated.
- `release-please.yml` `target-branch` — updated to `main`.
- `packages/techradar/data/config.default.json` `editUrl` — `/blob/pdig/` → `/blob/main/`.
- `README.md` badge URLs — `?branch=pdig` → `?branch=main`.
- `SECURITY.md` — supported branch reference updated.
- `AGENTS.md` — release process documentation updated.

Historical ADRs (0006, 0016, 0017, 0025) that reference `pdig` are left
unchanged — they accurately describe the world at the time they were written.
The `cspell-words.txt` entry for `pdig` is retained to support those historical
documents.

## Consequences

- The GitHub Pages environment protection rule must be manually updated in
  repository Settings → Environments → `github-pages` to allow `main` instead
  of `pdig`. GitHub does not auto-update environment branch allowlists on
  branch rename.
- `release-please` will now target `main` and its automated PRs will carry the
  scope `chore(main): release X.Y.Z`.
- The stale remote branches `pdig` and both
  `release-please--branches--pdig--*` branches can be deleted.