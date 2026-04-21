# `data/` — Content & Configuration

Source-of-truth content for the radar. Markdown items + JSON config.

## Layout

```
data/
  radar/<period>/<quadrant>/<id>.md    Radar items (one per blip)
  config.json                          User config overrides (deep-merged ON TOP of default)
  config.default.json                  Project defaults — DO NOT EDIT for customization
  about.md                             About-page body content
  about.json                           About-page metadata
  data.json                            Generated, gitignored — `npm run build:data`
```

## Rules

- **`data.json` is gitignored and generated.** Run `npm run build:data` after any change under `data/radar/**` or to the schema.
- **Item frontmatter must satisfy the Zod schema in `scripts/validateFrontmatter.ts`.** Run `npm run validate` to check.
- **Date strings in frontmatter:** use plain `YYYY-MM` or `YYYY-MM-DD`. The `toSafeDate()` helper in `format.ts` appends `T00:00:00` to avoid timezone shifts. Do not pre-suffix.
- **Config edits go in `data/config.json`**, not `data/config.default.json`. Only deep-merge keys are: `colors`, `labels`, `toggles`. All other top-level keys (`quadrants`, `rings`, `flags`, `chart`, `social`, `imprint`, `basePath`, etc.) are shallow-replaced.
- **Configuration ↔ README sync is enforced.** Any change to `config.default.json` keys or to the frontmatter Zod schema must also update the corresponding tables in `README.md`. (Checked: `npm run check:arch:readme`.)

## Wiki-style links

Inside item markdown bodies you can write:

```
See also [[other-blip-id]] or [[other-blip-id|custom label]].
```

`scripts/remarkWikiLink.ts` resolves these against the pre-scanned blip lookup table at build time. Unknown ids will fail the build. (Checked: `npm run check:arch:wikilinks`.)

## After editing

1. `npm run validate` — Zod check on all frontmatter
2. `npm run build:data` — regenerate `data.json`
3. `npm test` — make sure data-dependent tests still pass
