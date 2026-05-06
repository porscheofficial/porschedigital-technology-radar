# Migration Guide

This document covers upgrading **consumer projects** (forks and projects that
install `@porscheofficial/porschedigital-technology-radar` as a dependency)
across breaking releases.

If you maintain the framework itself, see `CHANGELOG.md` for the full release
history and `docs/decisions/` (workspace root) for the architectural rationale
behind each change.

---

## v1 → v2

Two breaking changes ship in v2:

1. **Quadrants were renamed to segments** — soft, shimmed with a deprecation
   warning. Affects `config.json` and every Markdown frontmatter under
   `radar/`.
2. **Inline color theming was replaced by per-theme manifest files** under
   `themes/<id>/manifest.jsonc`. Hard break: the build now throws on the
   removed config keys and requires a new `defaultTheme` field.

A full v1 → v2 upgrade has three steps (Section 1 → 2 → 3 below). Steps 1 and
2 are mechanical; step 3 is the only one that takes any thought.

### Start here: `npx techradar migrate`

Before reading the rest of this guide, run the detector against your project:

```bash
npx techradar migrate
```

It is **read-only** — nothing is rewritten. The output lists every legacy key
it finds in `config.json`, every `quadrant:` frontmatter still in `radar/`, and
every theme manifest still on the v1 `colorScheme` shape, with a one-line
pointer per finding into the section of this document that explains the fix.
Exit code is `0` when the project is v2-clean and `1` otherwise, so the same
command doubles as a CI gate during your migration.

The setup step that runs before `npx techradar dev` / `build` / `validate` /
`serve` also prints a one-line nudge if it spots any of these errors in your
project, so you do not need to remember to run `migrate` by hand.

#### Apply the safe mechanical rewrites: `npx techradar migrate --apply`

Once you've reviewed the report, re-run with `--apply` to perform the two
deterministic rewrites that need no input from you:

```bash
npx techradar migrate --apply
```

This renames `quadrants` → `segments` in `config.json` (preserving key order)
and `quadrant:` → `segment:` in the YAML frontmatter of every file under
`radar/` (Markdown bodies are never touched). Before any write, every modified
file is mirrored into `.techradar-migrate-backup/<timestamp>/` so you can diff
or restore. Add that path to `.gitignore` or commit the snapshot — your call.

`--apply` does **not** touch the v2-incompatible color and theme keys (Section
3 below). Those need to land in a `themes/<id>/manifest.jsonc` you author
by hand, and the detector reports them as remaining work after `--apply` runs.

#### Auto-generate the theme manifest: `npx techradar migrate --extract-theme`

To skip the hand-authoring of Section 3, run:

```bash
npx techradar migrate --extract-theme
```

You will be prompted for a theme id, label, supported modes (`light`, `dark`,
or both), and the default mode (when both are supported). The command then
reads the legacy `colors`, `backgroundImage`, `backgroundOpacity`,
`segments[].color`, and `rings[].color` from `config.json`, writes a complete
`themes/<id>/manifest.jsonc`, copies the background asset alongside it,
strips those keys from `config.json`, and inserts `"defaultTheme": "<id>"`.
All modified files are mirrored into `.techradar-migrate-backup/<timestamp>/`
first, exactly like `--apply`.

Non-interactive flags: `--theme-id`, `--theme-label`, `--theme-supports`
(comma-separated, e.g. `light,dark`), `--theme-default`. Useful for CI or
scripted migrations.

Any v1 color key that has no v2 equivalent is reported as `unmappedColors` —
the manifest is still written, and you decide whether to drop those keys or
add `cssVariables` overrides by hand.

### What you get for free

- `quadrants` in `config.json` and `quadrant:` in frontmatter still work, but
  emit a `[deprecated]` warning at build time. Both shims are scheduled for
  removal in v3 — fix them now, while the warnings make them easy to find.

### What will break the build until you fix it

| Symptom | Cause | Fix |
|---|---|---|
| `config.json: 'colors' is no longer supported in v2.x.x.` | Root `colors` block in `config.json` | Move into `themes/<id>/manifest.jsonc` (Section 3). |
| `config.json: 'backgroundImage' is no longer supported in v2.x.x.` | Root `backgroundImage` in `config.json` | Move into `themes/<id>/manifest.jsonc` `background.image` (Section 3). |
| `config.json: 'backgroundOpacity' is no longer supported in v2.x.x.` | Root `backgroundOpacity` in `config.json` | Move into `themes/<id>/manifest.jsonc` `background.opacity` (Section 3). |
| `config.json: 'segments[].color' is no longer supported in v2.x.x.` | `color:` field on any segment object | Move into `radar.segments[]` of your theme manifest (Section 3). |
| `config.json: 'rings[].color' is no longer supported in v2.x.x.` | `color:` field on any ring object | Move into `radar.rings[]` of your theme manifest (Section 3). |
| `config.json: 'defaultTheme' is required and must be a non-empty string …` | New required field | Add `"defaultTheme": "<id>"` (Section 1). |
| `Theme '<id>' uses the legacy v1 schema (colorScheme field).` | An existing custom theme uses v1's flat `colorScheme` shape | Rewrite `manifest.jsonc` against `themes/.example/manifest.jsonc` (Section 3). |

---

### 1. Decide on a theme id, then add `defaultTheme` to `config.json`

`defaultTheme` is now required. Pick a short, lowercase id for the theme
you're about to author — typically your organization name.

```diff
 {
   "basePath": "/techradar",
   "baseUrl": "https://techradar.acme.io",
+  "defaultTheme": "acme",
   ...
 }
```

If you only want to use one of the seven shipped themes (`blueprint`,
`matrix`, `neutral`, `porsche`, `porsche-heritage`, `solarized`, `synthwave`),
use that id and skip Section 3 entirely.

You can optionally pin the initial mode with `:light` or `:dark`:

```jsonc
"defaultTheme": "acme:dark"
```

When omitted, dual-mode themes start in `system` mode and single-mode themes
use the only mode they support. The user can override at runtime; the choice
is persisted to `localStorage`.

---

### 2. Rename `quadrants` → `segments` (mechanical)

Two places need this rename. Both are no-ops in behavior — only the key
name changed.

#### 2a. `config.json`

```diff
 {
-  "quadrants": [
+  "segments": [
     { "id": "languages-and-frameworks", "title": "Languages & Frameworks" },
     ...
   ]
 }
```

#### 2b. Every `radar/<release>/<id>.md` file

```diff
 ---
 title: "React"
 ring: adopt
-quadrant: languages-and-frameworks
+segment: languages-and-frameworks
 ---
```

A one-shot rewrite for the markdown files (run from your project root, dry-
run with `--dry-run` first if your `sd` version supports it):

```bash
# Using sd (https://github.com/chmln/sd)
find radar -name '*.md' -print0 | xargs -0 sd '^quadrant:' 'segment:'
```

Or with `sed` on macOS / BSD:

```bash
find radar -name '*.md' -exec sed -i '' 's/^quadrant:/segment:/' {} +
```

After the rename, `pnpm run validate` (or `npx techradar validate`) should be
silent — no more `[deprecated] frontmatter key "quadrant" …` warnings.

---

### 3. Move colors out of `config.json` and into a theme manifest

This is the only step that requires authoring rather than mechanical
rewrites.

#### 3a. Create the theme folder

Copy the annotated example into a folder named after the id you picked in
Section 1:

```bash
mkdir -p themes/acme
cp node_modules/@porscheofficial/porschedigital-technology-radar/data/themes/.example/manifest.jsonc themes/acme/
```

Or, if you already ran `npx techradar init` against v2, the `.example` folder
is also discoverable under your local `themes/`. The leading dot makes
it hidden from the theme scanner — **your copy must NOT start with a dot**.

#### 3b. Map your v1 keys into the new manifest

This is the full mapping. Anything on the right is required unless marked
*(optional)*; anything not in your v1 file gets a sensible default — the
template comments tell you what each field is for.

| v1 `config.json` field | v2 location in `manifest.jsonc` |
|---|---|
| `colors.foreground` | `cssVariables.foreground` |
| `colors.background` | `cssVariables.background` |
| `colors.highlight` | `cssVariables.highlight` |
| `colors.content` | `cssVariables.content` |
| `colors.text` | `cssVariables.text` |
| `colors.link` | `cssVariables.link` |
| `colors.border` | `cssVariables.border` |
| `colors.tag` | `cssVariables.tag` |
| `backgroundImage` *(optional)* | `background.image` (and copy the file into the theme folder) |
| `backgroundOpacity` *(optional)* | `background.opacity` |
| `segments[].color` (in declaration order) | `radar.segments[]` (same order) |
| `rings[].color` (in declaration order) | `radar.rings[]` (same order) |

Four `cssVariables` keys did not exist in v1 and must be filled in:

| New key | What it controls | Quick default |
|---|---|---|
| `surface` | Card / panel background sitting on top of `background` | `#FFFFFF` for light, one tier lighter than `background` for dark |
| `footer` | Footer-strip background | Same as `surface` (or a darker band) |
| `shading` | Modal / overlay scrim | `rgba(20, 20, 20, 0.2)` light, `rgba(20, 20, 20, 0.67)` dark |
| `frosted` | Backdrop blur tint behind sticky header | `rgba(255, 255, 255, 0.5)` light, `rgba(40, 40, 40, 0.35)` dark |

If you're unsure, copy the values from `themes/neutral/manifest.jsonc`
— it's the safest baseline.

#### 3c. Pick `supports` and `default`

```jsonc
"supports": ["light", "dark"],   // 1–2 entries from {"light","dark"}
"default":  "dark"               // must appear in supports
```

If your v1 site only had a single palette, the simplest path is to declare
`supports: ["dark"]` (or `["light"]`) and use single-string values
everywhere instead of `{ "light": …, "dark": … }` objects.

If you want both modes, you have two options:

1. **Quick**: duplicate your v1 palette into both modes (visually identical,
   tweak later).
2. **Better**: copy the dark palette from a built-in theme like `porsche` or
   `synthwave` and use your v1 colors as the light palette.

#### 3d. Strip the migrated keys from `config.json`

After the manifest is in place, remove every key the harness rejected:

```diff
 {
-  "backgroundImage": "/images/bg-pattern.png",
-  "backgroundOpacity": 0.04,
-  "colors": {
-    "foreground": "#F0F0F5",
-    "background": "#1A1A2E",
-    ...
-  },
   "segments": [
     {
       "id": "languages-and-frameworks",
       "title": "Languages & Frameworks",
-      "description": "...",
-      "color": "#0F9D58"
+      "description": "..."
     },
     ...
   ],
   "rings": [
     {
       "id": "adopt",
       "title": "Adopt",
-      "description": "...",
-      "color": "#0F9D58",
+      "description": "...",
       "radius": 0.5,
       "strokeWidth": 5
     },
     ...
   ]
 }
```

`segments[]` and `rings[]` keep `id`, `title`, `description`, `radius`, and
`strokeWidth` — they lose only the `color` field.

---

### 4. Verify

```bash
npx techradar validate     # frontmatter shimmed warnings disappear
npx techradar build        # config + theme schema both pass
```

If the build still throws, the error message tells you exactly which key /
field is at fault — re-check the table in the "What will break the build"
section above.

For custom themes that lived under `data/themes/` in a v1 fork (using the
flat `colorScheme` shape), there is no automated migration — rewrite each
`manifest.jsonc` against `themes/.example/manifest.jsonc`.

### 5. Custom theme assets

Background images and logos live alongside the manifest:

```
themes/acme/
├── manifest.jsonc
├── background-dark.jpg          ← referenced by background.image.dark
├── logo-header-light.svg        ← referenced by headerLogoFile.light
├── logo-header-dark.svg
└── logo-footer.svg
```

Asset paths in the manifest are bare filenames (no leading slash, no
`/themes/...` prefix). The build copies each referenced file into
`public/themes/<id>/` automatically.

---

## Earlier versions

There is no automated migration tool from pre-v1 forks. Open an issue if you
need help upgrading from a much older release.
