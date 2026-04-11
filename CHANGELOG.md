# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/), and this project adheres to [Semantic Versioning](https://semver.org/).

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
