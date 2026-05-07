# `data/themes/` — Built-in Themes

This directory contains the built-in themes for the Technology Radar Generator. Each theme defines its visual appearance across light and/or dark modes.

## Theme Schema

- Themes are defined via `manifest.jsonc` files.
- The schema is governed by `ThemeJsonSchema` in [`../../src/lib/theme/schema.ts`](../../src/lib/theme/schema.ts).
- Legacy v1 themes using the flat `colorScheme` format are not supported.

## Generated Files & Edit Policy

- **Do not edit generated outputs.** The build process combines these files with consumer overrides.
- `scripts/buildThemes.ts` outputs `data/themes.generated.json`.
- `scripts/theme/assets.ts` copies theme assets to `public/themes/`.
- If you need to update a built-in theme, edit the source `manifest.jsonc` here, then run the build scripts to regenerate the outputs.

## Scanner Script

- Built-in and consumer themes are merged by the scanner script: [`../../scripts/theme/scanner.ts`](../../scripts/theme/scanner.ts).
- Consumer themes (in the project root `data/themes/`) override built-ins by ID.

## File Inventory

- `.example/` — Reference schema and documentation for creating new themes.
- `blueprint/` — Blueprint theme.
- `matrix/` — Matrix theme.
- `neutral/` — Neutral theme.
- `porsche/` — Porsche theme (default dark).
- `porsche-heritage/` — Porsche Heritage theme.
- `solarized/` — Solarized theme.
- `synthwave/` — Synthwave theme.
