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

```bash
git clone https://github.com/porscheofficial/porschedigital-technology-radar.git
cd porschedigital-technology-radar
npm install
```

Create your configuration by copying the defaults:

```bash
cp data/config.default.json data/config.json
```

Edit `data/config.json` to match your organization (see [Configuration](#configuration) below).

Add your radar items as Markdown files under `radar/` (see [Radar Items](#radar-items) below), then build:

```bash
npm run build:data
npm run build
```

The static site is generated in the `out/` directory. For local development:

```bash
npm run build:data
npm run dev
```

Open `http://localhost:3000` (or the `basePath` you configured).

## Project Structure

```
├── data/
│   ├── config.default.json   # Default configuration (do not edit)
│   ├── config.json            # Your configuration overrides
│   └── about.md               # Content for the help & about page
├── public/
│   ├── favicon.ico            # Your favicon
│   ├── images/                # Images referenced in radar items
│   └── custom.css             # Optional custom styles
└── radar/
    ├── 2024-06-01/
    │   ├── react.md
    │   └── kubernetes.md
    └── 2025-01-15/
        ├── react.md           # Updated entry overwrites previous
        └── deno.md
```

Only `data/config.json`, `data/about.md`, and the `radar/` directory need your attention. Everything else is part of the generator.

## Configuration

All configuration lives in `data/config.json`. Any key you omit falls back to the defaults in `data/config.default.json`. You only need to set what you want to change.

### Root

| Key              | Description                                                                                        | Default |
| ---------------- | -------------------------------------------------------------------------------------------------- | ------- |
| `basePath`       | URL path prefix. Set to `/` for root hosting, or `/techradar` for a sub-path.                      | `/`     |
| `baseUrl`        | Full URL where the radar is hosted. Used for `sitemap.xml`.                                        | `""`    |
| `editUrl`        | If set, shows an edit button on item pages. Supports `{id}` and `{release}` placeholders.          | `""`    |
| `headerLogoFile` | Path to a logo image in `public/` for the header. Leave empty to use the default Porsche crest.    | `""`    |
| `footerLogoFile` | Path to a logo image in `public/` for the footer. Leave empty to use the default Porsche wordmark. | `""`    |
| `jsFile`         | Path in `public/` or URL to a custom JavaScript file to include on every page.                     | `""`    |
| `imprint`        | URL to your legal information / imprint page.                                                      | `""`    |

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

## Development

To work on the radar generator itself:

```bash
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

You can add custom CSS rules in `public/custom.css`. Since the project uses CSS Modules with hashed class names, use attribute prefix selectors to target components:

```css
/* Example: change headline fonts */
h1,
h2,
h3 {
  font-family: "Times New Roman", Times, serif;
}

/* Example: add a background image */
body {
  background: url("../../public/background.png");
}
```

Changes to `custom.css` require a rebuild — they are not reflected in the dev server's hot reload.

## License

This project is open source under the [MIT License](./LICENSE).

Originally based on the [AOE Technology Radar](https://github.com/AOEpeople/aoe_technology_radar).
Maintained and developed by [Porsche Digital](https://www.porsche.digital/).
