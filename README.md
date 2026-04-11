# Porsche Digital Technology Radar

A static site generator for building and publishing your own Technology Radar.

<!-- TODO: Add new screenshot -->
<!-- ![Screenshot of the Technology Radar](./docs/assets/screenshot.png) -->

## About

This project is maintained by **Porsche Digital** and is based on the open-source [AOE Technology Radar](https://github.com/AOEpeople/aoe_technology_radar). The codebase has been substantially rewritten and extended — it is not a drop-in replacement. Your existing radar items (Markdown files) can be reused as-is, but the configuration needs to be updated to match the new schema.

## Features

- Interactive SVG radar visualization (no D3 dependency)
- Search with abbreviation support (e.g. "k8s" finds "Kubernetes")
- Filterable by tags, teams, and status
- Quadrant detail pages with zoomed radar view
- Item detail pages with revision history and team assignments
- Ring trajectory history page across all releases
- Fully configurable via a single `config.json`
- Custom branding: header logo, footer logo, colors, social links
- Static export for GitHub Pages or any static hosting
- Built with Next.js, React, and the Porsche Design System

## Quick Start

**Prerequisites:** Node.js 22+

### 1. Create a new project

```bash
mkdir my-technology-radar && cd my-technology-radar
npm init -y
```

### 2. Install the radar as a dependency

```bash
npm install porsche_technology_radar@porscheofficial/porschedigital-technology-radar
```

### 3. Initialize the project

Scaffolds starter files (`radar/`, `config.json`, `about.md`, `public/`, `custom.scss`, `.gitignore`) into your directory:

```bash
npx techradar init
```

### 4. Customize

Edit the scaffolded files to match your organization:

- `config.json` — branding, quadrants, rings, colors (see [Configuration](#configuration))
- `radar/` — your technology items as Markdown (see [Radar Items](#radar-items))
- `about.md` — content for the help & about page
- `public/` — favicon, images, background image
- `custom.scss` — optional style overrides

### 5. Run

```bash
npx techradar dev     # Start dev server with file watching
npx techradar build   # Build static site → build/
npx techradar serve   # Start dev server without file watching
```

### 6. Deploy

After `npx techradar build`, the static site is in `build/`. Deploy it to GitHub Pages, Vercel, Netlify, or any static hosting provider.

## Project Structure (consumer)

```
my-technology-radar/
├── config.json          # Your configuration overrides
├── about.md             # Content for the help & about page
├── custom.scss          # Optional style overrides
├── public/
│   ├── favicon.ico      # Your favicon
│   └── images/          # Images referenced in radar items
├── radar/
│   ├── 2024-06-01/
│   │   ├── react.md
│   │   └── kubernetes.md
│   └── 2025-01-15/
│       ├── react.md     # Updated entry overwrites previous
│       └── deno.md
├── build/               # Generated static site (after build)
├── .techradar/          # Shadow build dir (auto-generated)
└── .gitignore           # Auto-generated with .techradar/, build/, node_modules/
```

The CLI automatically creates a `.gitignore` (or extends your existing one) with the entries needed to keep generated directories out of version control.

Only `config.json`, `about.md`, `custom.scss`, `public/`, and `radar/` need your attention. Everything else is managed by the CLI.

## Configuration

All configuration lives in `data/config.json`. Any key you omit falls back to the defaults in `data/config.default.json`. You only need to set what you want to change.

### Root

| Key                 | Description                                                                                        | Default |
| ------------------- | -------------------------------------------------------------------------------------------------- | ------- |
| `basePath`          | URL path prefix. Set to `/` for root hosting, or `/techradar` for a sub-path.                      | `/`     |
| `baseUrl`           | Full URL where the radar is hosted. Used for `sitemap.xml`.                                        | `""`    |
| `editUrl`           | If set, shows an edit button on item pages. Supports `{id}` and `{release}` placeholders.          | `""`    |
| `headerLogoFile`    | Path to a logo image in `public/` for the header. Leave empty to use the default Porsche crest.    | `""`    |
| `footerLogoFile`    | Path to a logo image in `public/` for the footer. Leave empty to use the default Porsche wordmark. | `""`    |
| `jsFile`            | Path in `public/` or URL to a custom JavaScript file to include on every page.                     | `""`    |
| `backgroundImage`   | Path to an image in `public/` shown as a subtle background overlay. Leave empty to disable.        | `""`    |
| `backgroundOpacity` | Opacity of the background image overlay (0 = invisible, 1 = fully visible).                        | `0.06`  |
| `imprint`           | URL to your legal information / imprint page.                                                      | `""`    |

### `toggles`

| Key              | Description                                   | Default |
| ---------------- | --------------------------------------------- | ------- |
| `showSearch`     | Show the search bar in the header.            | `true`  |
| `showChart`      | Show the radar visualization on the homepage. | `true`  |
| `showTagFilter`  | Show the tag filter below the radar.          | `true`  |
| `showTeamFilter` | Show the team filter below the radar.         | `true`  |

### `colors`

A map of CSS color values that theme the entire radar.

| Key          | Description                          | Default   |
| ------------ | ------------------------------------ | --------- |
| `foreground` | Primary text and UI element color    | `#FBFCFF` |
| `background` | Page background                      | `#0E0E12` |
| `highlight`  | Highlighted text and active elements | `#FBFCFF` |
| `content`    | Secondary content text               | `#AFB0B3` |
| `text`       | Tertiary / muted text                | `#88898C` |
| `link`       | Link color                           | `#FBFCFF` |
| `border`     | Border and separator color           | `#404044` |
| `tag`        | Tag background color                 | `#404044` |

### `quadrants`

An array of exactly 4 quadrant objects.

| Key           | Description                                      |
| ------------- | ------------------------------------------------ |
| `id`          | Identifier used in radar Markdown files and URLs |
| `title`       | Display title of the quadrant                    |
| `description` | Shown on the homepage and quadrant detail page   |
| `color`       | CSS color for the quadrant arc and its blips     |

### `rings`

An array of ring objects (typically 4), ordered from innermost to outermost.

| Key           | Description                                                    |
| ------------- | -------------------------------------------------------------- |
| `id`          | Identifier used in radar Markdown files                        |
| `title`       | Display title, shown as badge label                            |
| `description` | Optional description text                                      |
| `color`       | CSS color for the ring badge                                   |
| `radius`      | Outer boundary of the ring as a fraction of the chart (0 to 1) |
| `strokeWidth` | Thickness of the ring's arc border in the SVG                  |

### `flags`

Flags mark items as `new`, `changed`, or `default` (unchanged). Each flag has a single key:

| Key     | Description                                                     |
| ------- | --------------------------------------------------------------- |
| `title` | Display label for the flag (e.g. "New", "Changed", "Unchanged") |

### `chart`

| Key        | Description                                                              | Default |
| ---------- | ------------------------------------------------------------------------ | ------- |
| `size`     | Base size of the radar chart in pixels. Increase if you have many items. | `800`   |
| `blipSize` | Radius of each blip dot in pixels                                        | `12`    |

### `social`

An array of social link objects shown in the footer.

| Key    | Description                                                                                                        |
| ------ | ------------------------------------------------------------------------------------------------------------------ |
| `href` | URL to the social profile                                                                                          |
| `icon` | Icon name. Available: `x`, `linkedin`, `facebook`, `instagram`, `youtube`, `xing`, `pinterest`, `github`, `gitlab` |

### `labels`

| Key                 | Description                                               | Default                                                                                             |
| ------------------- | --------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `title`             | Radar title shown in the header and page titles           | `"Technology Radar"`                                                                                |
| `imprint`           | Label for the imprint link in the footer                  | `"Legal Information"`                                                                               |
| `footer`            | Text shown in the footer                                  | `"Based on the open-source Technology Radar by AOE GmbH, extensively modified by Porsche Digital."` |
| `notUpdated`        | Warning shown on items not updated in the last 3 releases | `"This item was not updated in last three versions of the Radar."`                                  |
| `hiddenFromRadar`   | Info shown on items hidden from the radar chart           | `"This technology is currently hidden from the radar chart."`                                       |
| `searchPlaceholder` | Placeholder text in the search input                      | `"What are you looking for?"`                                                                       |
| `metaDescription`   | HTML meta description for SEO                             | `""`                                                                                                |

## Radar Items

Radar items are Markdown files organized by release date under `radar/`.

```
radar/
├── 2024-06-01/
│   ├── react.md
│   └── kubernetes.md
└── 2025-01-15/
    ├── react.md
    └── deno.md
```

Each file has a YAML front-matter header followed by Markdown content:

```markdown
---
title: "React"
ring: adopt
quadrant: languages-and-frameworks
tags: [frontend, javascript]
teams: [web-platform, mobile]
---

Description of the technology, why it was adopted, and any relevant context.
Supports full **Markdown** formatting.
```

### Front-matter attributes

| Attribute  | Required | Description                                                                                             |
| ---------- | -------- | ------------------------------------------------------------------------------------------------------- |
| `title`    | Yes      | Name of the technology                                                                                  |
| `ring`     | Yes      | Ring placement. Must match one of the `id` values in `config.rings`.                                    |
| `quadrant` | Yes      | Quadrant assignment. Must match one of the `id` values in `config.quadrants`.                           |
| `tags`     | No       | List of tags for filtering.                                                                             |
| `teams`    | No       | List of teams currently using this technology.                                                          |
| `featured` | No       | Set to `false` to hide from the radar chart while keeping the item in the overview. Defaults to `true`. |

### Versioning

The filename (without `.md`) serves as the item identifier. When the same filename appears in a newer release folder, the newer entry overwrites the previous one — attributes are merged and a new history entry is created.

### Images

Place images in `public/images/` and reference them in Markdown:

```markdown
![Architecture diagram](/images/architecture.png)
```

## Development (contributing to the generator)

To work on the radar generator itself:

```bash
git clone https://github.com/porscheofficial/porschedigital-technology-radar.git
cd porschedigital-technology-radar
npm install           # Also runs postinstall → build:icons
npm run build:data    # Parse Markdown files into data/data.json
npm run dev           # Start Next.js dev server
```

The build pipeline:

1. `build:icons` — generates React icon components from SVGs in `src/icons/`
2. `build:data` — parses `radar/` Markdown files into `data/data.json` and `data/about.json`
3. `next build` — builds the static site into `out/`

The `npm run build` command runs all three steps in sequence.

## Custom Styling

You can add custom SCSS rules in `custom.scss`. Since the project uses CSS Modules with hashed class names, use element or attribute selectors to target components:

```scss
/* Example: change headline fonts */
h1,
h2,
h3 {
  font-family: "Times New Roman", Times, serif;
}
```

Changes to `custom.scss` are picked up automatically in `dev` mode (with file watching).

## License

This project is open source under the [Apache License 2.0](./LICENSE).

Originally based on the [AOE Technology Radar](https://github.com/AOEpeople/aoe_technology_radar).
Maintained and developed by [Porsche Digital](https://www.porsche.digital/).
