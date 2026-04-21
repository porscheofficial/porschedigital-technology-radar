# How to use the Technology Radar

> ⚠️ **Disclaimer:** This is a showcase based on the [open-source technology radar](https://github.com/porscheofficial/porschedigital-technology-radar) for visualization purposes and does not represent actual Porsche or Porsche Digital technology choices.

<!-- NOTE: Rewrite this file for each instance of the Technology Radar. -->
<!-- This content is displayed on the "Help & About" page visible to end users. -->
<!-- Tailor the introduction, quadrant descriptions, and ring definitions to your audience. -->

### Introduction

The Porsche Digital Technology Radar visualizes the technologies, tools, methods, and platforms relevant to our engineering teams. It helps make informed decisions about which technologies to adopt, trial, assess, or hold.

Items are organized into quadrants and placed on rings that indicate our current recommendation. The radar structure — including the number of quadrants and rings — is fully configurable and may evolve over time (e.g., dedicated rings for AI-related technologies). The visual styling follows the [Porsche Design System](https://designsystem.porsche.com/).

### Setting up your own instance

1. Create a new project and install the radar as a dependency:

```bash
mkdir my-technology-radar && cd my-technology-radar
npm init -y
npm install @porscheofficial/porschedigital-technology-radar
```

2. Run `npx techradar init` to scaffold starter files (`radar/`, `config.json`, `about.md`, `public/`, `custom.scss`, `.gitignore`).

3. Edit `config.json` to set your branding, quadrants, rings, and colors.

4. Add your technologies as Markdown files in `radar/` (one folder per release, e.g. `radar/2025-01-15/react.md`).

5. Run `npx techradar dev` to preview, then `npx techradar build` to generate the static site in `build/`.

See the [README](https://github.com/porscheofficial/porschedigital-technology-radar) for full configuration and front-matter documentation.

### Contributing

Source code and contributions are welcome on GitHub: [Porsche Digital Technology Radar](https://github.com/porscheofficial/porschedigital-technology-radar)

### Acknowledgements

This project is based on the open-source [AOE Technology Radar](https://github.com/AOEpeople/aoe_technology_radar) (forked at v4.6.1) and has been extensively modified by [Porsche Digital](https://www.porsche.digital/).
