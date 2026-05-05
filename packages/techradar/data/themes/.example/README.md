# Example Theme

This folder is a living-doc seed for creating custom themes. Copy the folder,
rename it, and rewrite `manifest.jsonc` by hand.

The folder name becomes the theme `id` — use lowercase, hyphens only (for
example `my-company`).

## `manifest.jsonc` — JSON with comments

Theme manifests are stored as **JSONC** (JSON with comments) and parsed with
`jsonc-parser`. You can use `//` line comments and `/* … */` block comments
freely to document each field. Trailing commas are NOT allowed — values must
remain strict JSON.

See `manifest.jsonc` in this folder for an annotated reference example.

## Theme × mode schema

Each theme lives in one folder and declares which modes it supports.

```jsonc
{
  "label": "My Company",
  "supports": ["light", "dark"],
  "default": "dark"
}
```

- `supports` accepts `"light"`, `"dark"`, or both.
- `default` must be included in `supports`.
- There is no automated migration. If your old `theme.json` still has a root
  `colorScheme` field, it is legacy and must be rewritten by hand into the
  new `manifest.jsonc` shape.

## Per-mode values

Most authored fields accept either:

- a single string or number value used for every supported mode, or
- an object with `{ "light": ..., "dark": ... }`

Examples:

```jsonc
"footerLogoFile": "logo-footer.svg"
```

```jsonc
"headerLogoFile": {
  "light": "logo-header-light.svg",
  "dark": "logo-header-dark.svg"
}
```

## `cssVariables` (required)

All 12 chrome keys are required. Each supported mode must have a value.

| Key | Role |
| --- | --- |
| `foreground` | Primary text and UI element color |
| `background` | Page background |
| `highlight` | Highlighted and active element color |
| `content` | Secondary content text |
| `text` | Tertiary or muted text |
| `link` | Link color |
| `border` | Border and separator color |
| `tag` | Tag background color |
| `surface` | Elevated surface color |
| `footer` | Footer background color |
| `shading` | Semi-transparent overlay |
| `frosted` | Frosted glass effect |

## `background` (optional)

`background.image` is resolved relative to the theme folder and may be
dark-only, light-only, or dual-mode. `background.opacity` follows the same
mode rules.

Example dual-mode:

```jsonc
"background": {
  "image": {
    "dark": "background-dark.jpg",
    "light": "background-light.jpg"
  },
  "opacity": {
    "light": 0.02,
    "dark": 0.06
  }
}
```

Example single-mode dark-only:

```jsonc
"supports": ["dark"],
"default": "dark",
"background": {
  "image": "background-dark.jpg",
  "opacity": 0.06
}
```

## `headerLogoFile` / `footerLogoFile` (optional)

Both fields may be a single file or a per-mode object. Paths are resolved
relative to the theme folder and copied into `public/themes/<theme>/`.

## `radar` (required)

`radar.segments` and `radar.rings` must match the counts from `config.segments`
and `config.rings`. Each entry may be single-value or per-mode.

## Dual-mode example

Use the shipped `.example/manifest.jsonc` as the complete dual-mode reference.

## Single-mode example

For a theme that only supports dark mode, collapse the fields to single
values:

```jsonc
{
  "label": "My Company Dark",
  "supports": ["dark"],
  "default": "dark",
  "cssVariables": {
    "foreground": "#FFFFFF",
    "background": "#000000",
    "highlight": "#88B5FF",
    "content": "#CCCCCC",
    "text": "#999999",
    "link": "#88B5FF",
    "border": "#333333",
    "tag": "#333333",
    "surface": "#111111",
    "footer": "#212225",
    "shading": "rgba(20, 20, 20, 0.67)",
    "frosted": "rgba(40, 40, 40, 0.35)"
  },
  "radar": {
    "segments": ["#7EC9AA", "#8AB6DB", "#E0C77E", "#DA8A8A"],
    "rings": ["#7EC9AA", "#8AB6DB", "#E0C77E", "#DA8A8A"]
  }
}
```

## Scanner behaviour

The `.example` folder is ignored by the theme scanner because dot-folders are
skipped. It is safe to ship as documentation.

## Consumer overrides

Consumer themes in `<your-project>/data/themes/` override built-in themes
with the same id. To customize Porsche, copy `data/themes/porsche/` into your
own project and edit that copy.
