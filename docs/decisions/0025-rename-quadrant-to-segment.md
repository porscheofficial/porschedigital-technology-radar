# ADR-0025 — Rename quadrant to segment

- Status: accepted
- Date: 2026-04-24

## Context

The original codebase used "quadrant" as the term for radar segments, hardcoded around the 4-quadrant convention from the ThoughtWorks tech radar. Users want to configure radars with any number of segments (e.g., 2, 3, 5, 6). The word "quadrant" literally means "one of four". This is semantically wrong when the count is configurable. The internal vocabulary needs to match the configurable nature of the project.

## Decision

Rename internal vocabulary from `quadrant`/`quadrants` to `segment`/`segments` across types, accessors, components, route param folder names, CSS classes, DOM attributes, ARIA labels, frontmatter fields, config keys, and documentation.

URL slug values (e.g., `languages-and-frameworks`) remain unchanged. Only the dynamic route param folder `[quadrant]` becomes `[segment]`.

## Backward compatibility (shim)

Consumer projects (downstream repos that depend on `@porscheofficial/porschedigital-technology-radar` as an npm package) that have `quadrants:` in their `data/config.json` and `quadrant:` in their markdown frontmatter must continue to work. We implement a runtime shim at two boundaries:

1.  **`src/lib/config.ts`**: At module load, if `userConfig.quadrants` is present and `userConfig.segments` is absent, alias the value and emit `consola.warn('[deprecated] config key "quadrants" is renamed to "segments". Please update your config.json.')`. This must be top-level synchronous because `scripts/validateFrontmatter.ts` derives its Zod enum from `config.segments` at its module top-level. Load order is critical.
2.  **`scripts/validateFrontmatter.ts`**: In `parseRadarFrontmatter`, before `schema.parse(data)`, if `data.quadrant` is present and `data.segment` is absent, alias the value and emit a per-file `consola.warn` deprecation message. Slug values pass through unchanged.

## URL stability

Slug values in URLs are unchanged. The Next.js dynamic route folder rename (`[quadrant]` to `[segment]`) only changes the param name exposed to `getStaticProps`/`getStaticPaths` (`params.quadrant` becomes `params.segment`). It does not change the visitor-facing URL. Sitemaps, internal links, and asset URLs all interpolate slug values (e.g., `assetUrl(\`/${segment.id}\`)`), so external URLs remain identical.

## Test strategy

Test-driven development (TDD) is required for both shims. Write a failing test first, then implement the shim.

Per the repo's "Test Quality Requirement" in `AGENTS.md`, the shim tests must:
1.  Directly fail if the shim is removed.
2.  Assert the deprecation warning text via `vi.spyOn(consola, 'warn')`.
3.  Include an integration test that loads a `quadrants:`-style config and verifies the full pipeline (`getSegments()` etc.) returns the expected data. This proves the shim integrates, not just executes.

## Consequences

- Consumer projects continue to work without changes. They see one-time `consola.warn` lines at build time.
- In-repo data is migrated to the new vocabulary immediately (74 markdown files, `data/config.default.json`).
- Tests are renamed and edited but never deleted or weakened.
- `release-please` will roll the change up as a `refactor` block. There is no semver bump beyond patch since the public contract is preserved by the shim.

## Removal plan

The shim is intended to be removed in a future major version. Removal requires:

1.  A deprecation period of at least one minor release with the warning visible.
2.  A follow-up ADR documenting the removal.
3.  `BREAKING CHANGE` in the commit footer to trigger a major bump via `release-please`.

## Alternatives considered

- **Don't rename, just document.** Rejected: `quadrant` is semantically wrong for N≠4 segments and confuses contributors.
- **Rename without shim, hard break.** Rejected: This would silently break every consumer project's `data/config.json`. Unacceptable for a published npm package consumed by external repos.
- **Compile-time codemod for consumers.** Rejected: This adds too much complexity for a one-time vocabulary change. A runtime warn-and-alias is simpler and self-documenting.