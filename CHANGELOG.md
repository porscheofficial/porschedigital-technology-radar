# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/), and this project adheres to [Semantic Versioning](https://semver.org/).

## [1.2.0](https://github.com/porscheofficial/porschedigital-technology-radar/compare/v1.1.0...v1.2.0) (2026-04-22)


### Features

* enrich link previews with per-item Open Graph images and add pre-commit secret scan ([37e12bb](https://github.com/porscheofficial/porschedigital-technology-radar/commit/37e12bb1ef48eff7f0aaf87212ba2b587931faa4))
* make detail-page tag and team badges link to filtered home ([d5b9177](https://github.com/porscheofficial/porschedigital-technology-radar/commit/d5b9177dbc7b49d5f48454821900b2c2c34c82c0))
* visual indicator for promoted/demoted changed blips ([707efec](https://github.com/porscheofficial/porschedigital-technology-radar/commit/707efecd77a0a7302950a621e84825e107706ec6))


### Bug Fixes

* **seo:** emit absolute canonical and Open Graph URLs ([8d075a1](https://github.com/porscheofficial/porschedigital-technology-radar/commit/8d075a1d7b6052d7671ee9689abdf4be7823e45c))


### Build System

* migrate package manager from npm to pnpm (ADR-0019) ([0ef2822](https://github.com/porscheofficial/porschedigital-technology-radar/commit/0ef2822763b9525d426bec0a5d5111994dfc35c0))

## [1.1.0](https://github.com/porscheofficial/porschedigital-technology-radar/compare/v1.0.4...v1.1.0) (2026-04-21)


### Features

* add a11y harness (jsx-a11y + axe-core) as fifth steering arm ([0b1df3b](https://github.com/porscheofficial/porschedigital-technology-radar/commit/0b1df3b57eacf2b8a6f2ab63a09fb6a6dcaacaf9))
* ban top-level helper functions in component files ([1b3259f](https://github.com/porscheofficial/porschedigital-technology-radar/commit/1b3259f7cfe5234047518e0a1710359df18066dc))
* introduce architecture steering harness ([8e5e091](https://github.com/porscheofficial/porschedigital-technology-radar/commit/8e5e091f3182fd968244964f024b75524d4dbdcb))
* phase 1 build-output sensors + Next server API ban ([efdcb87](https://github.com/porscheofficial/porschedigital-technology-radar/commit/efdcb87c297abec11d94a5d032be4246717fb7e3))
* phase 2 — adrs and doc-coverage sensor ([207f489](https://github.com/porscheofficial/porschedigital-technology-radar/commit/207f489c1801d5e2ba9b0308ef60b28147eaa0ac))
* phase 3 — framework lints and bundle budget ([933dca5](https://github.com/porscheofficial/porschedigital-technology-radar/commit/933dca535ee93a6f03f30e2276e7aae38d058f77))
* phase 7 harness sensors (wikilinks, license, html, coverage, spell) ([f978406](https://github.com/porscheofficial/porschedigital-technology-radar/commit/f97840607c2f91a0a4770310f6296f52ef9af542))


### Bug Fixes

* clean pre-existing biome lint warnings ([d0c1a53](https://github.com/porscheofficial/porschedigital-technology-radar/commit/d0c1a53a5986c69af3e5b7fd289c21009a3c490b))
* dereference annotated tags to commit SHAs for 3 pinned actions ([aa9183c](https://github.com/porscheofficial/porschedigital-technology-radar/commit/aa9183cf70215b66cd84df0b1b9231d846296a1d))
* drop assetUrl() inside &lt;Link&gt; to prevent basePath doubling ([2159d96](https://github.com/porscheofficial/porschedigital-technology-radar/commit/2159d969778ea1cd14cf30f5f74e654fe22163b4))
* resolve 3 CodeQL findings (sanitization, ReDoS, TOCTOU) ([c41bb6d](https://github.com/porscheofficial/porschedigital-technology-radar/commit/c41bb6dc866b5bfcfe2196a575c695da7fb4d95a))


### Security

* add Phase 1 security harness (sanitize, deps, secrets) ([4712383](https://github.com/porscheofficial/porschedigital-technology-radar/commit/4712383308ae6cb2805e786efd46bc7ec2691c99))
* pin GitHub Actions to SHAs and tighten GITHUB_TOKEN scopes (ADR-0017) ([9c3743a](https://github.com/porscheofficial/porschedigital-technology-radar/commit/9c3743ad575e5f727e57b49c130ee5b5f75cb93e))
* swap gitleaks for trufflehog as secrets-scanning sensor ([cb300af](https://github.com/porscheofficial/porschedigital-technology-radar/commit/cb300aff5634c8db284288c81b8715b1365cbfc9))


### Code Refactoring

* add jscpd duplication sensor (Phase 2b) ([fb78cd2](https://github.com/porscheofficial/porschedigital-technology-radar/commit/fb78cd25d01381351b72d85509cabed37e113bfe))
* phase 2c naming-convention sensor (biome useNamingConvention) ([0a5f2ee](https://github.com/porscheofficial/porschedigital-technology-radar/commit/0a5f2ee7c4d9da333040c324e1f9f3b3984d1396))
* phase 2d sonarjs sensor closes clean-code arm ([07d19f2](https://github.com/porscheofficial/porschedigital-technology-radar/commit/07d19f28c22c9fde979ba7d4633c176e8bf0c947))
* wire knip as check:quality harness arm (Phase 2a) ([778a1ee](https://github.com/porscheofficial/porschedigital-technology-radar/commit/778a1eed90105c03b1a9a22ea7ef10ed6be3e600))


### Documentation

* add centered inline table of contents to README ([c8f7a7a](https://github.com/porscheofficial/porschedigital-technology-radar/commit/c8f7a7a279b026c106dd5069c30e4df5614e020c))
* add docs/HARNESS.md as worked example of the steering harness ([33387f2](https://github.com/porscheofficial/porschedigital-technology-radar/commit/33387f240e20729a4e50882dff5e89d338360bc3))
* add npm version and weekly downloads badges ([5319d14](https://github.com/porscheofficial/porschedigital-technology-radar/commit/5319d14795d3a62d55adbfffbd0e5c27595847be))
* collapse harness invariant tables into one with a Phase column ([cca5984](https://github.com/porscheofficial/porschedigital-technology-radar/commit/cca5984b5e39de338a07a0a275b5a066d8d3c614))


### Build System

* add .npmrc with legacy-peer-deps for jsx-a11y eslint 10 gap ([385bbcd](https://github.com/porscheofficial/porschedigital-technology-radar/commit/385bbcd8668b006495c3ca65ac91fea45bbea0ab))


### CI/CD

* harden npm publish job and add manual recovery trigger ([79bf957](https://github.com/porscheofficial/porschedigital-technology-radar/commit/79bf957064e9f50865d2629d6580a38ee94c569c))

## [1.0.4](https://github.com/porscheofficial/porschedigital-technology-radar/compare/v1.0.3...v1.0.4) (2026-04-21)


### Bug Fixes

* skip maintainer prepare script in consumer build dir ([28cf571](https://github.com/porscheofficial/porschedigital-technology-radar/commit/28cf57175c31d42fcfeac0e6fd09dce01a95f415))

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
