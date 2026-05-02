# `data/` — Content & Configuration

Source-of-truth content for the radar. Markdown items + JSON config.

## Layout

```
data/
  radar/<period>/<segment>/<id>.md    Radar items (one per blip)
  config.json                          User config overrides (deep-merged ON TOP of default)
  config.default.json                  Project defaults — DO NOT EDIT for customization
  about.md                             About-page body content
  about.json                           About-page metadata
  data.json                            Generated, gitignored — `pnpm run build:data`
```

## Rules

- **`data.json` is gitignored and generated.** Run `pnpm run build:data` after any change under `data/radar/**` or to the schema.
- **Item frontmatter must satisfy the Zod schema in `scripts/validateFrontmatter.ts`.** Run `pnpm run validate` to check.
- **Date strings in frontmatter:** use plain `YYYY-MM` or `YYYY-MM-DD`. The `toSafeDate()` helper in `format.ts` appends `T00:00:00` to avoid timezone shifts. Do not pre-suffix.
- **Config edits go in `data/config.json`**, not `data/config.default.json`. Only deep-merge keys are: `colors`, `labels`, `toggles`. All other top-level keys (`segments`, `rings`, `flags`, `chart`, `social`, `imprint`, `basePath`, etc.) are shallow-replaced.
- **Back-compat shim:** The legacy `quadrant` frontmatter field maps to `segment` with a warning. See [`../../../docs/decisions/0028-rename-quadrant-to-segment.md`](../../../docs/decisions/0028-rename-quadrant-to-segment.md) (ADRs live at the workspace root, not inside this package).
- **Configuration ↔ README sync is enforced.** Any change to `config.default.json` keys or to the frontmatter Zod schema must also update the corresponding tables in `README.md`. **Documented default values must match `config.default.json` exactly** — the harness parses each table's `Default` column (namespaced by the surrounding `<details><summary>` block, so `imprint` at root is distinct from `labels.imprint`) and fails on drift. (Checked: `pnpm run check:arch:readme`.)

## Wiki-style links

Inside item markdown bodies you can write:

```
See also [[other-blip-id]] or [[other-blip-id|custom label]].
```

`scripts/remarkWikiLink.ts` resolves these against the pre-scanned blip lookup table at build time. Unknown ids will fail the build. (Checked: `pnpm run check:arch:wikilinks`.)

## After editing

1. `pnpm run validate` — Zod check on all frontmatter
2. `pnpm run build:data` — regenerate `data.json`
3. `pnpm test` — make sure data-dependent tests still pass
