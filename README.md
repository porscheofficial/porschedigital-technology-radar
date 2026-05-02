# Porsche Digital Technology Radar Monorepo

This repository is a pnpm workspace monorepo with two packages:

- [`packages/techradar`](./packages/techradar/) — the published framework
  package `@porscheofficial/porschedigital-technology-radar`
- [`packages/create-techradar`](./packages/create-techradar/) — the upcoming
  scaffolder package `@porscheofficial/create-techradar`

## Workspace commands

Run cross-cutting checks from the repo root:

```bash
pnpm run lint
pnpm run typecheck
pnpm run test
pnpm run check:arch
pnpm run check:sec
pnpm run check:quality
pnpm run check:a11y
pnpm run build
pnpm run check:build
```

Run package-specific commands with pnpm filters:

```bash
pnpm --filter @porscheofficial/porschedigital-technology-radar run dev
pnpm --filter @porscheofficial/porschedigital-technology-radar run build:data
pnpm --filter @porscheofficial/create-techradar run build
```

## Package docs

- Framework package docs: [`packages/techradar/README.md`](./packages/techradar/README.md)
- Scaffolder package docs: [`packages/create-techradar/README.md`](./packages/create-techradar/README.md)
