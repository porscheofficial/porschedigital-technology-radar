<div align="center">
  <br>
  <h1>Technology Radar Generator</h1>
  <p><strong>Create, customize, and publish your own technology radar<br>without building the platform yourself.</strong></p>
  <br>

  <a href="https://opensource.porsche.com/porschedigital-technology-radar/">Live showcase</a>
  <span>&nbsp;&nbsp;&bull;&nbsp;&nbsp;</span>
  <a href="#get-started">Get started</a>
  <span>&nbsp;&nbsp;&bull;&nbsp;&nbsp;</span>
  <a href="./packages/techradar/README.md">Documentation</a>

  <br><br>

  [![npm version][npm-badge]][npm-url]
  [![npm version (scaffolder)][npm-scaffolder-badge]][npm-scaffolder-url]
  [![CI][ci-badge]][ci-url]
  [![OpenSSF Scorecard][ossf-badge]][ossf-url]
  [![License][license-badge]][license-url]

  <br>

  <a href="https://opensource.porsche.com/porschedigital-technology-radar/">
    <img src="./packages/techradar/docs/assets/screenshot-radar.png" alt="Screenshot of a generated technology radar" width="680">
  </a>

  <br><br>
</div>

A technology radar makes technology decisions visible — what your teams adopt,
evaluate, or move away from, all in one place. This generator lets you spin up
your own radar as a static site, shaped entirely around your organization's
language, categories, and branding. Content lives as Markdown in Git. You own
everything.

> [!NOTE]
> Everything is configurable: segments, rings, labels, colors, logos, and
> metadata. The decision model is yours.

## Get started

```bash
npm create @porscheofficial/techradar my-radar
cd my-radar
npm run dev
```

Then customize:

1. Add technologies as Markdown files in `radar/`.
2. Configure segments, rings, labels, colors, and branding in [`config.json`][config-ref].
3. Build and publish the static `build/` directory.

Also works with `pnpm create`, `yarn create`, and `bun create`.

## Features

- 🚀 **Scaffold in one command** — starter content, dev server, and build scripts included
- 🏷️ **Configurable taxonomy** — define your own segments, rings, labels, and colors
- 🎨 **Custom branding** — logos, page titles, metadata, and theme colors
- 📡 **Radar visualization** — interactive overview with segment and ring layout
- 📄 **Technology detail pages** — each entry gets its own page with full context
- 🔍 **Search and filters** — find technologies by name, tag, team, or status
- 📜 **Revision history** — track how assessments change across releases
- 📋 **Changelog** — see what moved between releases at a glance
- 🖼️ **Open Graph images** — every radar entry gets a shareable preview card
- 📸 **Radar image export** — download the full radar visualization as a PNG
- ☁️ **Static export** — deploy to GitHub Pages, Vercel, Netlify, or any static host
- 🗂️ **Content as code** — radar entries live in Git, changes go through pull requests

## Packages

| Package | Description |
| --- | --- |
| [`@porscheofficial/create-techradar`][scaffolder-npm] | Scaffold a new radar project |
| [`@porscheofficial/porschedigital-technology-radar`][framework-npm] | Generator framework and CLI |

## Contributing

See the [framework documentation](./packages/techradar/README.md),
[workspace conventions](./AGENTS.md), and
[architecture decisions](./docs/decisions/).

## Maintained by Porsche Digital

Built and maintained by [Porsche Digital](https://www.porsche.digital/).
Originally based on the [AOE Technology Radar](https://github.com/AOEpeople/aoe_technology_radar),
substantially modernized for package-based reuse, static publishing, and
content-as-code workflows.

---

<sub>Framework: [Apache-2.0](./packages/techradar/LICENSE) · Scaffolder: [MIT](./packages/create-techradar/LICENSE)</sub>

<!-- link definitions -->
[npm-badge]: https://img.shields.io/npm/v/@porscheofficial/porschedigital-technology-radar?logo=npm&label=framework
[npm-url]: https://www.npmjs.com/package/@porscheofficial/porschedigital-technology-radar
[npm-scaffolder-badge]: https://img.shields.io/npm/v/@porscheofficial/create-techradar?logo=npm&label=create-techradar
[npm-scaffolder-url]: https://www.npmjs.com/package/@porscheofficial/create-techradar
[ci-badge]: https://img.shields.io/github/actions/workflow/status/porscheofficial/porschedigital-technology-radar/deploy.yml?branch=main&label=deploy&logo=github
[ci-url]: https://github.com/porscheofficial/porschedigital-technology-radar/actions/workflows/deploy.yml
[ossf-badge]: https://api.scorecard.dev/projects/github.com/porscheofficial/porschedigital-technology-radar/badge
[ossf-url]: https://scorecard.dev/viewer/?uri=github.com/porscheofficial/porschedigital-technology-radar
[license-badge]: https://img.shields.io/badge/license-Apache%202.0%20%2F%20MIT-blue
[license-url]: #packages
[scaffolder-npm]: https://www.npmjs.com/package/@porscheofficial/create-techradar
[framework-npm]: https://www.npmjs.com/package/@porscheofficial/porschedigital-technology-radar
[config-ref]: ./packages/techradar/README.md#%EF%B8%8F-configuration
