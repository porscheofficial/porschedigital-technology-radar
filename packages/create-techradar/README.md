# `@porscheofficial/create-techradar`

Scaffold a new [Porsche Digital Technology Radar](https://github.com/porscheofficial/porschedigital-technology-radar) in seconds.

## Usage

```bash
# npm
npm create @porscheofficial/techradar my-radar

# pnpm
pnpm create @porscheofficial/techradar my-radar

# yarn
yarn create @porscheofficial/techradar my-radar

# bun
bun create @porscheofficial/techradar my-radar
```

(`create @porscheofficial/techradar` is the package-manager shortcut for the `@porscheofficial/create-techradar` package — the `create-` prefix is stripped automatically.)

## What it does

1. Creates the target directory (must be empty).
2. Detects which package manager invoked it (npm, pnpm, yarn, bun) and uses it for everything that follows.
3. Looks up the latest `@porscheofficial/porschedigital-technology-radar` version on the npm registry.
4. Writes a minimal `package.json` (private, ESM, with `dev` / `build` / `validate` scripts) and a starter `README.md`.
5. Installs dependencies.
6. Runs `techradar init` to copy the starter radar content (markdown blips, config, public assets) into the project.
7. Initialises a git repository with a single `chore: initial scaffold via @porscheofficial/create-techradar` commit.

## Requirements

- Node.js `>=22`
- One of: npm, pnpm, yarn, bun

## Next steps

```bash
cd my-radar
npm run dev
```

See the [framework README](https://github.com/porscheofficial/porschedigital-technology-radar/tree/main/packages/techradar) for everything the resulting project can do.
