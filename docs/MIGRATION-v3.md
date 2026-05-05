# Migration guide for the next major release

See the [framework theming documentation](../packages/techradar/README.md#theming)
for the live reference.

## v4 PDS Migration

Porsche Design System v4 drops the component-level `theme` prop entirely.
Theme reactivity now comes from `.scheme-light`, `.scheme-dark`, and
`.scheme-light-dark` classes on the document root.

What changed:

- all `theme={...}` props on PDS components were removed
- the provider no longer accepts a `theme` prop
- `_document.tsx` now applies the initial scheme class before paint
- markdown external links render as plain `<a>` elements instead of
  `<p-link-pure>` wrappers

If you customized PDS components in a downstream fork, remove any remaining
`theme` props and rely on the scheme classes instead.

## Theme×Mode Restructure

Theme folders now declare both palette and supported modes in a single
`manifest.jsonc` file (JSON-with-comments). The old flat schema looked like
this:

```json
{
  "label": "Porsche Dark",
  "colorScheme": "dark",
  "cssVariables": {
    "foreground": "#FBFCFF"
  }
}
```

The new schema is theme × mode and lives in `manifest.jsonc`:

```jsonc
{
  // Inline comments are allowed — manifests use JSONC.
  "label": "Porsche",
  "supports": ["light", "dark"],
  "default": "dark",
  "cssVariables": {
    "foreground": {
      "light": "#010205",
      "dark": "#FBFCFF"
    }
  }
}
```

Breaking changes:

- per-theme config files are renamed `theme.json` → `manifest.jsonc` and
  parsed as JSONC (line/block comments are now allowed)
- `colorScheme` at the root is no longer accepted
- each theme must declare `supports` and `default`
- per-mode values now live inside `cssVariables`, `background`, and logo fields
- `defaultTheme` now points at a theme id such as `"porsche"`, optionally with
  `:light` or `:dark`
- the runtime selection keys are now `techradar-theme` and `techradar-mode`
  (the previous `techradar-brand` key is no longer read)
- the document root attribute is `data-theme` (previously `data-brand`)
- the public `ThemeContext` API uses `themes`, `activeTheme`, `theme`, `mode`,
  `setActiveTheme`, `setMode` (the previous `brand`/`setBrand` names are gone)

There is **no automated migration tool** for this schema change. Rewrite each
legacy `theme.json` into `manifest.jsonc` by hand using
`data/themes/.example/README.md` and `data/themes/.example/manifest.jsonc` as
the references.
