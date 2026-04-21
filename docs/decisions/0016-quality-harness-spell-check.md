# ADR-0016 — Quality harness: spell-check on documentation

- Status: accepted
- Date: 2026-04-21

## Context

The repository's load-bearing prose lives in:

- Root `README.md`
- `docs/HARNESS.md` (a teaching artifact — see root `AGENTS.md`
  "Harness Documentation Sync")
- `docs/decisions/*.md` (ADRs — load-bearing rationale per
  `docs/decisions/README.md`)
- Eight `AGENTS.md` files (point-of-entry rules for agents)

These files are read more often than most source files: by humans
during onboarding, by agents during every edit cycle, and by external
audiences when this repo is used as a worked example for harness
talks. Typos in load-bearing prose erode trust and obscure the
teaching intent.

No existing sensor catches them. Biome lints code; markdownlint
isn't wired in (and would be the wrong tool — it lints structure,
not content); jscpd / knip / sonarjs operate on TS/JS only.

## Decision

Add `check:quality:spell` using
[`cspell`](https://cspell.org/) scoped to `**/*.md`:

```
cspell --no-progress --no-summary --no-must-find-files '**/*.md'
```

Configuration in `.cspell.json`:

- **Languages**: `en,en-US`. We accept both AmEng and BrEng spellings
  (the project has authors using both — `personalisation` /
  `reorganised` coexist with `customization` / `optimization`).
- **Custom dictionary**: `cspell-words.txt` — a flat newline-delimited
  word list of project-specific terms (`porsche`, `techradar`,
  `biome`, `depcruise`, `sonarjs`, `knip`, `jscpd`, `trufflehog`,
  `osv`, `gitleaks`, `rehype`, `remark`, `frontmatter`, `blip`,
  `blips`, `Feedforward`, `doccoverage`, `trufflesecurity`, `pdig`,
  `autolinks`, `Ptext`, `Birgitta`, `Böckeler`, `Ashby`, `gatekeep`,
  `porscheofficial`, `wordmark`, …). Add a word to the dictionary
  when it is a real domain term; fix the typo otherwise.
- **`ignorePaths`** covers generated and external content:
  `node_modules/`, `out/`, `dist/`, `.next/`, `coverage/`, lock
  files, all `*.json`, all `*.svg`, `src/components/Icons/`,
  `data/data.json`, `data/radar/**` (radar item content is authored
  by external contributors and may include vendor names — checking
  it would generate false positives without signal),
  `data/about.md`, `data/about.json`, Husky scripts, `CHANGELOG.md`.

### Rejected alternatives

- **`misspell` (Go).** Rejected: a system binary, requires `brew
  install`. The harness already has two system-binary dependencies
  (osv-scanner, trufflehog per ADR-0006/0011); adding a third for
  spell-check raises the install bar without commensurate benefit.
  cspell is npm-native and zero-friction.
- **Wider scope (`**/*.md`, `src/**/*.{ts,tsx}`, comments).** Rejected
  for now: source-code spell-checking generates a long tail of false
  positives on identifier fragments (camelCase splits, abbreviations,
  type names) that would either inflate the dictionary indefinitely
  or train contributors to ignore the gate. Markdown is the highest
  signal-to-noise scope; widen later if a real failure mode emerges.
- **Wire into pre-commit only, not the harness.** Rejected: the
  harness principle (ADR-0006) is that every invariant has a CI
  gate. Pre-commit can be skipped (`--no-verify`); the harness
  cannot.
- **Ignore radar markdown but include `README.md` and `docs/`.**
  This is the chosen scope (via `ignorePaths`). Radar content stays
  in author hands; teaching artifacts get gated.

## Consequences

- `check:quality` grows from five to six sub-scripts (after ADR-0015
  added coverage). DoD command set unchanged in shape.
- `cspell-words.txt` becomes a living artifact. Adding a word is a
  small, diffable PR; removing one (because a typo got dictionaried
  by mistake) is equally diffable.
- Authors using either AmEng or BrEng can write naturally. The
  shared dictionary covers the cross-vocab terms specific to this
  project.
- The first time a new ADR or HARNESS.md update introduces a new
  technical term, the gate fires. Resolution: add the term to
  `cspell-words.txt` in the same PR that introduces it.
