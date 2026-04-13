# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/), and this project adheres to [Semantic Versioning](https://semver.org/).

## [1.0.2](https://github.com/porscheofficial/porschedigital-technology-radar/compare/v1.0.1...v1.0.2) (2026-04-13)


### Bug Fixes

* clear teams and tags when later revision removes them ([f065eb6](https://github.com/porscheofficial/porschedigital-technology-radar/commit/f065eb6cdf704b7a0be3e79f64a283e272d639d7))
* hash installed package in build dir cache to detect updates ([816bee3](https://github.com/porscheofficial/porschedigital-technology-radar/commit/816bee3f8b7b7ad1c866c880d5c1d814b205273b))
* include lockfile in build dir hash to detect git dependency updates ([bab83ff](https://github.com/porscheofficial/porschedigital-technology-radar/commit/bab83ff68ff6368c059a192ae99e1e139fcbe8a9))
* pass route params via getStaticProps to prevent hydration mismatch ([b5777f3](https://github.com/porscheofficial/porschedigital-technology-radar/commit/b5777f3ca17c0ca8ceff1ad7115f839b83174959))
* render plain-text preview in quadrant item list to prevent hydration mismatch ([cb7c889](https://github.com/porscheofficial/porschedigital-technology-radar/commit/cb7c88952ca7a7f04a29b3a625ff2b190aadb93b))
* replace div with span inside Link to fix HTML nesting hydration error ([9c92961](https://github.com/porscheofficial/porschedigital-technology-radar/commit/9c92961c926ac75e5807a90ba750675714f60298))
* set bodyInherited in directory-merge path to prevent duplicate descriptions ([929d35c](https://github.com/porscheofficial/porschedigital-technology-radar/commit/929d35cef87f0f34ff7a5d7c2f5c35cb3dfb0d8c))


### Documentation

* add live showcase link to README ([701631e](https://github.com/porscheofficial/porschedigital-technology-radar/commit/701631edab96acf064d62f83b1c3d7cdecbfb773))

## [1.0.1](https://github.com/porscheofficial/porschedigital-technology-radar/compare/v1.0.0...v1.0.1) (2026-04-12)


### Bug Fixes

* correct search feature description in README ([15a9d8f](https://github.com/porscheofficial/porschedigital-technology-radar/commit/15a9d8f7559b3221d4f50534fecee0f12be20437))
* disable component prefix in release-please tag matching ([57453cf](https://github.com/porscheofficial/porschedigital-technology-radar/commit/57453cf23fc62d17fa7c885fdb29396363a475af))


### Documentation

* add badges and rewrite features section for leadership audience ([8ed8302](https://github.com/porscheofficial/porschedigital-technology-radar/commit/8ed8302aa4dafadf6555254c2e4c6c0ccbb27b0e))
* add screenshots of radar, quadrant, detail, history, and mobile views ([b28c28a](https://github.com/porscheofficial/porschedigital-technology-radar/commit/b28c28a72fe3f3e0d02482a6e5829d85db8f2212))


### Tests

* add comprehensive tests for buildData and positioner scripts ([3c89986](https://github.com/porscheofficial/porschedigital-technology-radar/commit/3c8998682da45bafc20feb22816cdb6629748901))


### CI/CD

* add release-please for automated GitHub Releases ([08f5063](https://github.com/porscheofficial/porschedigital-technology-radar/commit/08f50636a96efd6521ab14994bd648cbd16f4a39))


### Miscellaneous

* remove 24 unused SVG source files from src/icons/ ([0e2c3c2](https://github.com/porscheofficial/porschedigital-technology-radar/commit/0e2c3c2e5515fa9c8a736713ca83bd7c8c420b86))

## [1.0.0] - 2026-04-11

### Added

- Biome replaces ESLint + Prettier for linting and formatting
- Vitest + React Testing Library test suite (215 tests)
- `useRadarTooltip` hook extracted from Radar and QuadrantRadar
- `SafeHtml` error boundary for `dangerouslySetInnerHTML` content
- `blipIcons.ts` centralizes blip SVG data-URIs
- `featured: false` support — hidden technologies excluded from radar SVGs with visual indicators
- `hiddenFromRadar` config label for hidden technology notification
- `AGENTS.md` with Definition of Done and test coverage requirements

### Changed

- `scroll-behavior: smooth` moved from CSS to `data-scroll-behavior` attribute (Next.js 16)
- `appTitle` in `_document.tsx` reads from config instead of hardcoded string
- `formatRelease` consolidated into single source with timezone-safe `toSafeDate()` helper
- Magic numbers extracted to named constants
- `Record<string, any>` replaced with typed alternatives
- Module-level side effects in `Blip.tsx` and `ItemDetail.tsx` moved inside components
- `ItemTrajectory` and `VersionDiff` types moved to `types.ts`
- `chokidar` moved from dependencies to devDependencies
- Accessibility: replaced `<div role="link">` with proper `<Link>`, added ARIA attributes to SVGs

### Removed

- ESLint, Prettier, and `@trivago/prettier-plugin-sort-imports`
- Renovate configuration
- Dead `revalidate` export from sitemap
- No-op `useMemo` in `_document.tsx`

---

> **Note:** This project was originally forked from the [AOE Technology Radar](https://github.com/AOEpeople/aoe_technology_radar) at version 4.6.1. It has since been heavily modified — including architecture changes, a full tooling migration, comprehensive test coverage, and new features. The version has been reset to 1.0.0 to reflect this as an independent project.
