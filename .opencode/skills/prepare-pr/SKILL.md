---
name: prepare-pr
description: End-to-end PR workflow for the porschedigital-technology-radar pnpm monorepo. Prepares atomic conventional commits, runs the full local harness (lint/typecheck/test/check:arch/check:sec/check:quality/check:a11y/check:build), rebases onto main, pushes, opens a GitHub PR with a substantive description, then watches `gh pr checks` plus review comments in a loop and reacts (fix → commit → push) until green. Trigger this skill whenever the user wants to "open a PR", "create a PR", "push these changes", "ship this", "submit for review", "prepare a pull request", or any phrasing that implies turning local work into a reviewed PR — even when they don't explicitly say "PR". Also trigger when the user asks to react to failing CI on a PR they just opened, or wants the agent to babysit a PR until checks pass.
---

# prepare-pr

End-to-end PR workflow for this repo. The goal: turn local work into a green, well-described PR with minimal back-and-forth, and stay on it until CI passes and reviewers are unblocked.

## Why this skill exists

Opening a PR in this repo isn't just `git push && gh pr create`. The harness is strict (architecture, security, accessibility, quality, build sensors all gate merges), commit scopes are restricted, husky enforces hooks, and the project values atomic commits with `why` in the message. Skipping any of that wastes CI minutes and reviewer time. This skill encodes the full workflow so you don't have to remember it.

The whole loop is roughly:

1. Understand what changed and why
2. Self-review the diff
3. Stage atomically and commit with conventional messages
4. Sync with `main` (rebase)
5. Run the full harness locally — fix anything red before pushing
6. Push and open a PR with a substantive description
7. Watch CI + review comments; fix-and-push until green; notify the user

Stop conditions: green CI **and** no unresolved review comments. Do **not** auto-merge.

## Repo invariants you must respect

These are non-negotiable conventions enforced by tooling. Violating them wastes a CI cycle.

- **Conventional commits.** `commitlint.config.js` allows types: `feat | sec | fix | bug | test | refactor | rework | ops | ci | cd | build | doc | docs | perf | chore | update`. Scopes (when present): `techradar | create-techradar | deps | release | docs | ci | harness | chore | commitlint`. PR titles follow the same format — release-please relies on it.
- **Husky hooks run automatically.** pre-commit runs lint-staged + sanitize; pre-push runs `pnpm run check:quality`. Don't bypass with `--no-verify` unless the user explicitly asks.
- **Docs sync invariant.** Any change to a harness sensor, an `AGENTS.md`, or a `pnpm run check:*` script MUST update `docs/HARNESS.md` in the same PR. ADR changes go under `docs/decisions/`. If your diff touches harness wiring and HARNESS.md is unchanged, that's a red flag — flag it and update.
- **Workspace boundaries.** Framework code lives in `packages/techradar/`; scaffolder in `packages/create-techradar/`. Read the nearest `AGENTS.md` before editing package code.
- **No type-error suppression.** Never add `as any`, `@ts-ignore`, `@ts-expect-error` to make a check pass.

## Workflow

Use the TodoWrite tool to track these steps as you go. Mark each completed immediately — the user can see progress.

### 1. Pre-flight: understand the change

Before touching git, build a mental model of what's being shipped:

- `git status` and `git diff` (staged + unstaged) — see all in-flight work.
- `git log --oneline origin/main..HEAD` — what's already committed on the branch.
- Identify the affected packages (`techradar`, `create-techradar`, root tooling). The scope set follows from this.
- Detect the change kind (feat / fix / refactor / docs / chore / etc.) — this drives the commit type and PR title.
- If the diff touches harness wiring, sensors, or AGENTS.md files: confirm `docs/HARNESS.md` and/or relevant ADRs are updated in the same change set. If not, surface it to the user before continuing.

If the diff is empty / nothing staged or unstaged and no unpushed commits exist — there's nothing to PR. Stop and ask the user what they want.

### 2. Branch hygiene

- If currently on `main`: create a feature branch first. Branch naming: `<type>/<short-kebab-summary>` (e.g. `feat/sponsor-card-layout`, `fix/harness-secret-scan-flake`, `docs/harness-sync`). Keep names short — they show up in URLs.
- If on an existing feature branch: keep it.
- Never push directly to `main`.

### 3. Self-review the diff

Skim the full diff with fresh eyes before committing. Look for:

- Debug logs (`console.log`, `dbg!`, `print(`), commented-out blocks, `TODO`/`FIXME` left from the work session
- Stray secrets or local config that shouldn't be committed (the `check:sec:secrets` sensor will catch verified ones, but unverified leaks slip through)
- Files that were edited incidentally and shouldn't be in this PR (lockfile churn from unrelated `pnpm install`, editor metadata, etc.)
- Generated artifacts that AGENTS.md flags as outputs (e.g. `packages/techradar/src/components/Icons/`, `public/og/`, `data/{data,about}.json`, package `dist/`) — usually these shouldn't be hand-edited

If anything looks off, fix or unstage it before committing.

### 4. Atomic commits with conventional messages

Split the work into commits that each represent one logical concern. A good test: could a reviewer understand and revert this single commit independently? If yes, it's atomic enough.

Commit message format:

```
<type>(<scope>): <imperative summary in lower case, no trailing period>

<body explaining WHY, not what — the diff shows what.
Wrap at ~72 cols. Reference issues here.>

Closes #123
```

Tips for good messages:
- The summary line should let a reviewer skip the body and still get the gist.
- The body answers "why now" and "why this approach" — the diff is self-evidence for "what".
- Use the footer for `Closes #N`, `Refs #N`, or `BREAKING CHANGE:` notes.
- Examples to model:
  - `feat(techradar): expose technology slug in og-image manifest`
  - `fix(harness): make secret-scan tolerate detached HEAD in pre-push`
  - `docs(harness): sync HARNESS.md with new check:a11y sensor`
  - `refactor(create-techradar): extract template copy step into helper`

### 5. Sync with main (rebase)

```bash
git fetch origin main
git rebase origin/main
```

If the rebase produces conflicts: stop the automation, surface the conflicts to the user, and resolve them with their guidance. After resolving, continue the rebase. Do not silently skip or take one side.

### 6. Run the full local harness

Run from the repo root. Mirror what CI runs so red CI is the rare exception, not the norm:

```bash
pnpm run lint
pnpm run typecheck
pnpm run test
pnpm run check:arch
pnpm run check:sec
pnpm run check:quality
pnpm run check:a11y
pnpm run check:build
```

Run them sequentially (so failure output stays paired with the right command). If any fails:

1. Read the failure carefully — fix the root cause, not the symptom.
2. Re-run **only the failing command** to confirm the fix, then continue from where you stopped.
3. After all changes for the fix are made, re-run the full sequence once more before pushing — fixes can regress earlier checks.

Do not push with anything red locally. The pre-push hook will block `check:quality` failures anyway, but the others (arch / sec / a11y / build) will fail in CI and waste a cycle.

### 7. Push and open the PR

```bash
git push -u origin <branch>
```

Then open the PR with `gh`. Use a heredoc for the body so formatting survives:

```bash
gh pr create --title "<conventional-commit-style title>" --body "$(cat <<'EOF'
## Summary

<2-4 sentences: what changes, why, and the impact. Reviewer-facing — assume they have not seen the issue.>

## Changes

- <Bullet per logical change, mapped to commits where useful>
- <Note any docs / ADR / HARNESS.md updates>

## Verification

- Local harness: lint, typecheck, test, check:arch, check:sec, check:quality, check:a11y, check:build — all green
- <Any manual verification steps you ran (e.g. visited /technology/foo, ran the scaffolder against tmpdir)>

## Notes for reviewers

<Optional: trade-offs, follow-ups intentionally out of scope, or anything you want a second opinion on. Skip the section if there's nothing useful to add.>

Closes #<n>  <!-- if applicable; remove the line otherwise -->
EOF
)"
```

Open as **ready-for-review**, not draft (the user confirmed local checks are sufficient gating). If the work is genuinely WIP and the user explicitly asks for draft, pass `--draft`.

After creation, capture the PR URL — you'll need it for the watch loop. `gh pr view --json url -q .url` works if you didn't capture stdout from `gh pr create`.

### 8. Watch loop: react to CI and reviews

Poll until the PR is green AND has no unresolved review threads.

```bash
# CI status — combines workflow runs + required checks
gh pr checks <pr-number-or-url>

# Review comments and review state
gh pr view <pr-number-or-url> --json reviews,reviewDecision,comments
```

Loop logic:

1. **Are checks still running?** Wait. End your response and let the system notify you when there's something to do — do not spin in a tight poll. A reasonable pattern: check, wait 60-120s, check again. After ~2 idle checks with no progress, end the response and ask the user to ping you when they want another look.
2. **Any check red?**
   - Pull the failing job's logs: `gh run view <run-id> --log-failed` (get `<run-id>` from `gh pr checks` or `gh run list --branch <branch>`).
   - Diagnose the actual failure (read the log, don't guess).
   - Fix locally. Re-run the matching local check to confirm.
   - Commit (small, focused: `fix(<scope>): address <specific failure>` or `ci(<scope>): ...`). Push. Loop.
3. **Review comments?**
   - Read every unresolved comment with `gh api repos/<owner>/<repo>/pulls/<n>/comments` (or scrape from `gh pr view --json comments`).
   - For each: either address with a code change (commit + push) or reply explaining why the existing approach is correct (`gh pr comment` or via the API). Don't silently ignore.
   - When all addressed, re-request review if appropriate.
4. **Green CI + approval + no unresolved threads?** Stop. Notify the user with the PR URL and a one-line status. Do not auto-merge.

### 9. Failure recovery

- If 3 consecutive push-fix cycles fail to clear the same CI check: stop, summarise what was tried, and consult the user before further attempts. CI flakes happen — don't spiral.
- If a check is failing on `main` too (not introduced by this PR): say so explicitly and ask the user whether to wait for `main` to recover or to proceed differently.
- If `git push` is rejected because someone else pushed to the branch: `git pull --rebase` first, re-run the local harness (fast: typecheck + lint at minimum), then push again.

## Communication style during the workflow

- Don't narrate every shell command. Use TodoWrite for visible progress and only surface text on decisions, failures, or completion.
- When something fails, lead with what failed and the proposed fix — not a wall of log output.
- Final message when done: PR URL + checks status + any reviewer asks still pending. One short paragraph.

## Don'ts

- Don't `--no-verify` past hooks unless the user asks.
- Don't force-push to `main`. Force-push to a feature branch is fine after a rebase, but use `--force-with-lease`, never `--force`.
- Don't squash merge or merge from the agent side — the user does the final merge.
- Don't open the PR before local harness is green.
- Don't keep editing while CI runs unless you've spotted something the agent itself flagged. Wait for signal.
