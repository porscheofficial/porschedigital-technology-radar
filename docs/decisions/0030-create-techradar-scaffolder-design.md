# ADR-0030 — `create-techradar` is a one-shot bootstrapper, not a template owner

- Status: accepted
- Date: 2026-05-02

## Context

ADR-0027 split the repo into a pnpm workspace monorepo with two published
packages: the framework (`@porscheofficial/porschedigital-technology-radar`)
and a scaffolder skeleton (`@porscheofficial/create-techradar`). PR #1 landed
the framework migration; this ADR is the design pin for the scaffolder
implementation that ships in PR #2.

Two facts shape the design:

1. **The framework already ships its own template content.** The framework's
   `bin/techradar.ts` exposes a `techradar init` subcommand that copies a
   starter `radar/`, `public/`, `config.json`, `about.md`, `custom.scss`, and
   `.markdownlint-cli2.jsonc` from `node_modules/@porscheofficial/porschedigital-technology-radar/`
   into the consumer's working directory, plus appends `.gitignore` entries.
   The template files are committed inside the framework package (`data/`,
   `public/`, `src/styles/custom.scss`, `.markdownlint-cli2.jsonc`) and
   travel with each framework release.
2. **A consumer's working installation is small.** Once `techradar init`
   has run, the consumer project on disk is `package.json`, `radar/`,
   `public/`, `config.json`, `about.md`, `custom.scss`,
   `.markdownlint-cli2.jsonc`, `.gitignore` — that is it. Everything
   substantive lives inside `node_modules`.

Given those, the scaffolder has two viable shapes:

- **Template owner.** `create-techradar` ships its own copy of the radar /
  config / styling files in a `template/` folder inside its own tarball.
  Pros: hermetic, version-locked to the scaffolder release. Cons: bloats
  the tarball; introduces a second source of truth for template content
  that must be kept in sync with the framework's own copy under `data/`
  and `public/`; users who run `npx techradar init` later get
  framework-version content while users who scaffolded got
  scaffolder-version content — drift hazard.
- **One-shot bootstrapper.** `create-techradar` only collapses the four
  steps a user would otherwise type by hand:

  ```bash
  mkdir my-radar && cd my-radar
  npm init -y                                                   # 1
  npm install @porscheofficial/porschedigital-technology-radar  # 2
  npx techradar init                                            # 3
  git init                                                      # 4
  ```

  into one:

  ```bash
  npm create @porscheofficial/techradar my-radar
  ```

  Pros: zero template duplication; the framework remains the single
  source of truth for what a starter project contains; the scaffolder
  package stays tiny and dependency-light (matches `packages/create-techradar/AGENTS.md`).
  Cons: scaffolder requires network access and a successful framework
  install before `techradar init` can run.

## Decision

Adopt the **one-shot bootstrapper** shape.

### Pipeline

The scaffolder runs these steps in order, refusing to clobber on conflict:

1. **Resolve target directory.** Take the first positional argument as the
   target dir name; default to prompting for nothing else. If the directory
   exists and is non-empty (excluding common dotfiles like `.git`,
   `.DS_Store`, `Thumbs.db`), exit 1 with a clear message. If it does not
   exist, create it.
2. **Detect package manager.** Read `npm_config_user_agent` (set by
   npm/pnpm/yarn/bun when invoked via `npm create`/`pnpm create`/`yarn create`/`bun create`).
   Fall back to `npm` when the variable is absent or unrecognized.
3. **Resolve the framework version.** Query the npm registry's
   `https://registry.npmjs.org/@porscheofficial/porschedigital-technology-radar/latest`
   endpoint for the current `latest` tag, and write `^X.Y.Z` into the
   generated `package.json`. The caret range is what `npm install` would
   produce for a fresh user; pinning to an exact version was rejected
   because it would require a release-please coupling between the two
   packages and would silently lock new users to old framework versions
   when the scaffolder is not republished alongside every framework release.
4. **Write `package.json`.** Minimal shape: `name` = directory basename,
   `private: true`, `type: "module"`, the framework as a dependency at the
   resolved `^X.Y.Z`, and three scripts (`dev`, `build`, `validate`) that
   shell out to `techradar dev`, `techradar build`, `techradar validate`.
   Also write a one-paragraph `README.md` pointing at the framework's
   docs and the configuration / authoring sections.
5. **Install.** Run `<pm> install` in the target directory with stdio
   inherited so the user sees real install output. If install fails, exit
   with the package manager's exit code and a hint about the most common
   causes (no network, node version mismatch).
6. **Run `techradar init`.** Invoke the freshly-installed framework's bin
   via the detected package manager's exec convention (`npx techradar init`
   for npm, `pnpm exec techradar init` for pnpm, `yarn techradar init` for
   yarn, `bun x techradar init` for bun). This is the step that copies the
   starter `radar/`, `public/`, `config.json`, etc. from inside
   `node_modules` into the working directory.
7. **Initialize git.** If `git` is on PATH and the target is not already
   inside a git working tree, run `git init` and stage everything with a
   single initial commit message (`chore: initial scaffold via @porscheofficial/create-techradar`).
   Failures here are non-fatal — print a warning, continue.

### CLI surface

- Positional arg: target directory (required, no default — if absent, exit 1
  with usage message).
- No flags in the initial release. The `--help` / `--version` subcommands
  come from `citty` (matched to the framework's CLI library — already in
  the repo's stack — for stylistic consistency).
- No interactive prompts. Pattern matches `create-vite`'s minimalism: ask
  for nothing, do the obvious thing, fail loudly if any assumption breaks.

### Dependency posture

The scaffolder takes two runtime dependencies, both already used by the
framework CLI in `packages/techradar/bin/techradar.ts`:

- `citty` — argument parsing, `--help` / `--version`.
- `consola` — the logger. Picked over an ad-hoc stdout/stderr facade
  for stylistic consistency with the framework CLI (`techradar dev`,
  `techradar build`, `techradar init` all log via `consola`), so the
  bootstrap output blends seamlessly into the immediately-following
  `techradar init` output. `consola` is small (~15 KB) and is already
  in the workspace lockfile, so the marginal install cost is zero.

Everything else uses Node's built-ins:

- `node:fs` / `node:path` for filesystem work.
- `node:child_process`'s `spawnSync` for `<pm> install`, `<pm> exec`, and
  `git`. Avoids `execa` to keep the dependency count low.
- `node:https` for the registry GET. Avoids `node-fetch`/`undici` adds.
- `node:test` for tests (already configured via `"test": "node --test"`
  in `packages/create-techradar/package.json`). Avoids the vitest stack
  the framework package uses.

This keeps the scaffolder tarball small, install-cold-start fast, and
honors the "tiny and dependency-light" constraint in
`packages/create-techradar/AGENTS.md`.

### Error handling and observability

Every recoverable failure prints a one-line cause + one-line suggested fix
and exits with a non-zero code. Unrecoverable failures (network errors,
permission denied, missing `git`) propagate the underlying error message.
The CLI does not wrap errors in stack traces by default — if a user wants
the trace, they re-run with `DEBUG=1` in the environment.

## Consequences

- The scaffolder is a thin wrapper. Most of the user-visible behavior
  (what files exist after `init`, what the radar starter content is)
  remains owned by the framework package and evolves with each framework
  release. A user who runs `npm create @porscheofficial/techradar` six
  months from now gets the framework's then-current starter, not the
  scaffolder's frozen snapshot of it.
- The scaffolder version is decoupled from the framework version. Bug
  fixes to the bootstrap flow ship without touching the framework;
  changes to the starter content ship without touching the scaffolder.
  Release-please handles each package independently.
- The scaffolder requires network access and a successful framework
  install. There is no offline mode. This is acceptable because
  `npm create` is itself an online flow.
- The published `create-techradar@0.0.0` placeholder is harmless: until a
  `feat:` commit triggers release-please, no version is published. The
  first published version will be `0.1.0` (or `1.0.0` if the maintainer
  promotes it) and will contain the implementation defined here. Users
  who try to install the placeholder name before that will get a 404
  from npm — there is no broken first impression.
- Adding new template files in the future is a framework change, not a
  scaffolder change. The scaffolder's pipeline never grows for content
  reasons — only for bootstrap-flow reasons (e.g. supporting a new
  package manager, or a new post-install hook).

## Rejected alternatives

- **Embedded `template/` folder in the scaffolder tarball.** Rejected
  for the drift reason in Context. Re-consider only if the framework's
  `init` subcommand is ever removed.
- **`git clone` from a separate `porsche-digital/techradar-template` repo.**
  Adds a third repo to maintain, requires git on PATH at scaffold time,
  and the version-pinning story is worse than registry resolution.
- **Interactive prompts (`@clack/prompts`).** Adds a dependency for an
  affordance no real user has asked for. Adoptable later as a non-breaking
  change if real-world usage suggests the friction is high; cheaper to
  add prompts than to remove them.
- **Pinning the framework dep to an exact known-good version.** Rejected
  because it forces a release-please coupling between the two packages
  and locks new users to old framework versions whenever the scaffolder
  has not been republished. The caret range matches what users would
  type by hand.
