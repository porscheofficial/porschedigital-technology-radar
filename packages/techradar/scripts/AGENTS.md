# `scripts/` — Build-time Tooling

Run at build/validate time only. Never imported by `src/`.

## Files

| File | Purpose |
| --- | --- |
| `buildData.ts` | Walks `data/radar/**/*.md`, validates frontmatter, renders markdown → HTML, emits `data/data.json`. |
| `validateFrontmatter.ts` | **The Zod schema for radar item frontmatter.** Single source of truth shared by `buildData.ts` and `pnpm run validate`. Handles the legacy `quadrant` → `segment` frontmatter shim (ADR-0028). |
| `remarkWikiLink.ts` | Remark plugin: resolves `[[id]]` and `[[id|label]]` to internal links using the blip lookup table. |
| `positioner.ts` | Computes blip coordinates within rings/segments. |
| `errorHandler.ts` | Consola-based error reporting helpers. |
| `checkConfigReadmeSync.ts` | Asserts that every leaf key in `data/config.default.json` and every Zod field in `validateFrontmatter.ts` is documented in `README.md`, AND that documented default values in README tables match the actual values in `config.default.json` (namespaced by the surrounding `<details><summary>` block). Run via `pnpm run check:arch:readme`. |
| `checkNoNodeBuiltins.ts` | Scans `out/_next/static/chunks/*.js` for Node.js built-in module error stubs leaked by Turbopack. Run via `pnpm run check:build:no-node-builtins`. |
| `recordDemo.ts` | Captures the animated WebP shown in the root `README.md`. Boots a static server against `out/`, drives a headless Chromium through a declarative scene list with Playwright (theming + key pages), captures a WebM via `recordVideo`, then assembles the animated WebP from PNG frames using system `ffmpeg` (frame extraction) and `img2webp` from libwebp (animation muxing). Output: `docs/media/demo.webp`. **Requires** `pnpm build` to have produced `out/` first, plus system binaries `ffmpeg` and `img2webp` on PATH (`brew install ffmpeg webp` on macOS) — same precedent as `osv-scanner` / `trufflehog` per ADR-0006/0011. Run via `pnpm run record:demo`. |

## Rules

- **Scripts are not orphans.** They are entry points invoked by `package.json` scripts. Dependency-cruiser's `no-orphans` warning excludes `scripts/`.
- **Do not import `scripts/*` from `src/*`.** These are Node-side only.
- **Keep `validateFrontmatter.ts` and `data/config.default.json` in sync with `README.md`.** Any field add/rename/removal must also update the README's Configuration tables and/or Front-matter attributes table. (Checked: `pnpm run check:arch:readme`.)

## When to add a new script

- Wire it via a `package.json` script so it is not flagged as orphaned.
- Use `consola` for output (already a project dependency).
- Use `tsx` to run it (`tsx scripts/foo.ts`), no compile step needed.
