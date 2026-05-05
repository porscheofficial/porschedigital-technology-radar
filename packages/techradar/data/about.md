# About this Technology Radar

<!-- NOTE: Rewrite this file for each instance of the Technology Radar. -->
<!-- This content is displayed on the "Help & About" page visible to end users. -->
<!-- Tailor the introduction, segment descriptions, and ring definitions to your audience. -->

Welcome! You're looking at a **live showcase of the open-source [Porsche Digital Technology Radar Generator](https://github.com/porscheofficial/porschedigital-technology-radar)**. Everything here — the radar in the center, the segment views, the detail pages, the search, the theming, the changelog — is a feature you get out of the box. The entries are illustrative, so feel free to click anything and explore.

## How to read the radar

Every entry on the radar is a **blip**. Each blip has two coordinates:

- **Segment** (the slice of the circle): the area of practice it belongs to, e.g. _Languages & Frameworks_, _Infrastructure_, or _Data & AI_.
- **Ring** (the distance from the center): the current recommendation.
    - **Adopt**: proven in production; safe default for new work.
    - **Trial**: worth pursuing; use in non-critical projects to build experience.
    - **Assess**: interesting; explore in spikes or proofs of concept.
    - **Hold**: do not start new work with this; migrate away when practical.

Click a blip to open its detail page with the full description, tags, teams, links, and a complete revision history. Use the **search** and **filter** controls to narrow things down by name, tag, team, or status. The **changelog** shows what moved between releases at a glance.

The structure of the radar (segments, rings, labels, colors, branding) is fully configurable per instance and may evolve over time.

## 🎨 Try the theme switcher

This radar is **fully themeable** — and you can try it right now without setting anything up:

- 🎨 Open the **Spotlight command palette** to pick a different theme — that's where the look-and-feel lives. Press <kbd>⌘K</kbd> (macOS) or <kbd>Ctrl</kbd>+<kbd>K</kbd> (Windows/Linux) to open it, then type <kbd>&gt;</kbd> to switch into action mode and search for _theme_. The header toggle next to it flips _light_ and _dark_ for the active theme.
- 🎁 Seven **built-in themes** are bundled out of the box — _Neutral_, _Porsche_, _Porsche Heritage_, _Blueprint_, _Matrix_, _Solarized_, and _Synthwave_ — to demonstrate the range from corporate-restrained to retro-neon. Most ship with both light and dark variants; a few are intentionally single-mode (_Blueprint_ light-only, _Matrix_ dark-only).

## What the generator gives you

The Technology Radar Generator is an open-source tool for teams who want their own radar **without building the platform themselves**. Out of the box you get:

- 🚀 **Scaffold in one command** — starter content, dev server, and build scripts included
- 🏷️ **Configurable taxonomy** — define your own segments, rings, labels, and colors
- 🎨 **Custom theming** — seven built-in themes plus a documented `manifest.jsonc` template for your own
- 🌗 **Theme × mode** — light/dark variants where the theme provides them, plus header toggle and Spotlight controls
- 📡 **Radar visualization** — interactive overview with segment and ring layout
- 📄 **Technology detail pages** — each entry gets its own page with full context
- 🔍 **Search and filters** — find technologies by name, tag, team, or status
- 📜 **Revision history** — track how assessments change across releases
- 📋 **Changelog** — see what moved between releases at a glance
- 🖼️ **Open Graph images** — every radar entry gets a shareable preview card
- 📸 **Radar image export** — download the full radar visualization as a PNG
- ☁️ **Static export** — deploy to GitHub Pages, Vercel, Netlify, or any static host
- 🗂️ **Content as code** — radar entries live in Git, changes go through pull requests

## Spin up your own

You only need [Node.js](https://nodejs.org/) 22+ to get started:

```bash
npm create @porscheofficial/techradar my-radar
cd my-radar
npm run dev
```

Then:

1. Add technologies as Markdown files under `radar/`.
2. Configure segments, rings, and labels in `config.json`.
3. Pick a built-in theme or copy `themes/.example/` to `themes/<your-theme>/manifest.jsonc` and customize colors, chips, logos, and background art (each theme can also provide light and dark mode variants).
4. Edit `about.md` to make this very page your own.
5. Run `npm run build` and publish the static `build/` directory anywhere.

The scaffolder also works with `pnpm create`, `yarn create`, and `bun create`.

See the [project README](https://github.com/porscheofficial/porschedigital-technology-radar) for full configuration and front-matter documentation.

## Contributing

The project is open source and contributions are very welcome on GitHub: [porscheofficial/porschedigital-technology-radar](https://github.com/porscheofficial/porschedigital-technology-radar).

## Acknowledgements

This project is based on the open-source [AOE Technology Radar](https://github.com/AOEpeople/aoe_technology_radar) (forked at v4.6.1) and has been substantially modernized by [Porsche Digital](https://www.porsche.digital/) for package-based reuse, static publishing, and content-as-code workflows.
