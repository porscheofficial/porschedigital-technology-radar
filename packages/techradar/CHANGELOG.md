# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/), and this project adheres to [Semantic Versioning](https://semver.org/).

## [2.1.0](https://github.com/porscheofficial/porschedigital-technology-radar/compare/porschedigital-technology-radar-v2.0.2...porschedigital-technology-radar-v2.1.0) (2026-05-07)


### Features

* **harness:** add bundle-budget regression sensor ([a416570](https://github.com/porscheofficial/porschedigital-technology-radar/commit/a4165709f26148cbb75f515e5f56d98d6c4b72c7))
* **harness:** add version-literal drift sensor ([e0d65b0](https://github.com/porscheofficial/porschedigital-technology-radar/commit/e0d65b0bf20aafe316ece0cfe21b0e085837ece5))
* **techradar:** add demo animation recorder for README ([e625969](https://github.com/porscheofficial/porschedigital-technology-radar/commit/e625969d9f179159ed66ad214e749737e2734b22))
* **techradar:** add v1 to v2 migration tooling ([ef40b93](https://github.com/porscheofficial/porschedigital-technology-radar/commit/ef40b93951e13bad826b314c4fd9f630c9a42b98))


### Bug Fixes

* **create-techradar:** add pnpm.onlyBuiltDependencies to scaffolded app ([b74c37b](https://github.com/porscheofficial/porschedigital-technology-radar/commit/b74c37baef6824179f4093a4441dfadadd354feb))
* **deps:** remove deprecated hast@1 runtime dep, types served by @types/hast ([1eb0195](https://github.com/porscheofficial/porschedigital-technology-radar/commit/1eb019547acabd076384eea7b5a7338faa1d2915))
* **harness:** move bundle-budget sensor to check:build phase ([b74c37b](https://github.com/porscheofficial/porschedigital-technology-radar/commit/b74c37baef6824179f4093a4441dfadadd354feb))
* **harness:** recurse subdirs in bundle-budget chunk scan ([78ce2ee](https://github.com/porscheofficial/porschedigital-technology-radar/commit/78ce2ee84f1b2d89596539bbb0684217b5c42192))
* **techradar:** bootstrap data on install for fresh clones ([673b007](https://github.com/porscheofficial/porschedigital-technology-radar/commit/673b00783a7963285dff7be2143115beed558eee))
* **techradar:** collapse stat-then-read in demo recorder static server ([ca30976](https://github.com/porscheofficial/porschedigital-technology-radar/commit/ca30976638d03e20ee58457387cadc82edb6e502))
* **techradar:** exclude recordDemo.ts from package typecheck ([6741692](https://github.com/porscheofficial/porschedigital-technology-radar/commit/6741692558e045dbc1e468054f8b145d5ed66d38))
* **techradar:** exclude recordDemo.ts from TypeScript compilation ([68506f5](https://github.com/porscheofficial/porschedigital-technology-radar/commit/68506f59df5f6ca83eb96754875ffbfaf8a5e89b))
* **techradar:** exclude scripts/record*.ts from shadow tsconfig in techradar build ([c37e913](https://github.com/porscheofficial/porschedigital-technology-radar/commit/c37e913ce364841d2958e54a7cbba7d7a445d7e0))
* **techradar:** improve deprecation warning for quadrants shim ([1451829](https://github.com/porscheofficial/porschedigital-technology-radar/commit/14518297040372ef9421e4e03110adbfb710256f))
* **techradar:** improve MobileSegmentNav layout and show ring counts ([8e7b098](https://github.com/porscheofficial/porschedigital-technology-radar/commit/8e7b09851ac457ea24a79248a293ed18c26f0f3f))
* **techradar:** make SpotlightSearch usable on touch devices ([0d341cb](https://github.com/porscheofficial/porschedigital-technology-radar/commit/0d341cb8a3b12075394ce16d9fcbdf8144814f55))
* **techradar:** suppress sonarjs/todo-tag on v7.0.0 shim comment ([1e7ad53](https://github.com/porscheofficial/porschedigital-technology-radar/commit/1e7ad533b906ae9b7154eed170e5deacb1329e16))
* **techradar:** update scanner test spy to use consola after logging refactor ([326de53](https://github.com/porscheofficial/porschedigital-technology-radar/commit/326de53c51052cd0a796e3553f75265ce113ec97))


### Code Refactoring

* **techradar:** extract typed getThemes loader ([703b690](https://github.com/porscheofficial/porschedigital-technology-radar/commit/703b6901bf26d2a12f675c0a8f5b01d856721db4))
* **techradar:** replace dangerouslySetInnerHTML in _document ([83ce45f](https://github.com/porscheofficial/porschedigital-technology-radar/commit/83ce45f150a4bbf56cd511a2881eb90273e814ae))
* **techradar:** standardize script logging on consola ([3ec6bdc](https://github.com/porscheofficial/porschedigital-technology-radar/commit/3ec6bdc7b55ce5e729d0e8394165502e6bec99bc))


### Build System

* **techradar:** bump CSS budget to 76 KB for mobile spotlight + nav styles ([26c5cdb](https://github.com/porscheofficial/porschedigital-technology-radar/commit/26c5cdb9b923ac7395d1feb82853ea4e3080ace9))

## [2.0.2](https://github.com/porscheofficial/porschedigital-technology-radar/compare/porschedigital-technology-radar-v2.0.1...porschedigital-technology-radar-v2.0.2) (2026-05-06)


### Bug Fixes

* **techradar:** honor manifest.default mode for dual-mode themes ([bf07bc4](https://github.com/porscheofficial/porschedigital-technology-radar/commit/bf07bc44df2f3e453985bf44e3c543f136979ae7))
* **techradar:** scaffold consumer themes to top-level themes/ folder ([69a58e1](https://github.com/porscheofficial/porschedigital-technology-radar/commit/69a58e101076b86d8e4ba9048cb34677059f46d9))
* **techradar:** show platform-correct shortcut in Spotlight bar ([4f46dc0](https://github.com/porscheofficial/porschedigital-technology-radar/commit/4f46dc0e2e0ddd3efebf777a60827b5a99f4f678))
* **techradar:** use role=img wrapper for kbd group ([1b9f730](https://github.com/porscheofficial/porschedigital-technology-radar/commit/1b9f730c730a5fec792588975ec656b87bfdb6ba))

## [2.0.1](https://github.com/porscheofficial/porschedigital-technology-radar/compare/porschedigital-technology-radar-v2.0.0...porschedigital-technology-radar-v2.0.1) (2026-05-06)


### Bug Fixes

* **techradar:** gate next.config.js dev-only branches on monorepo context ([7fb338b](https://github.com/porscheofficial/porschedigital-technology-radar/commit/7fb338b54bc127dffa6e3466be780dceec8a1121))

## [2.0.0](https://github.com/porscheofficial/porschedigital-technology-radar/compare/porschedigital-technology-radar-v1.3.0...porschedigital-technology-radar-v2.0.0) (2026-05-06)


### ⚠ BREAKING CHANGES

* **techradar:** drop migrate-colors CLI command
* **techradar:** introduce theme system with JSONC manifests and per-mode background

### Features

* **techradar:** boxed history button and restored header frost effect ([f2203e3](https://github.com/porscheofficial/porschedigital-technology-radar/commit/f2203e3d1f4fdf390f541a4622476d9b1a400c6b))
* **techradar:** drop migrate-colors CLI command ([dd37ddf](https://github.com/porscheofficial/porschedigital-technology-radar/commit/dd37ddf5c473f351e4fb7e45d9d6c6618e12e2c0))
* **techradar:** introduce theme system with JSONC manifests and per-mode background ([9543bed](https://github.com/porscheofficial/porschedigital-technology-radar/commit/9543bedb1d211bce608f07b5fb9520ec14fa880f))
* **techradar:** make porsche-heritage backgrounds prominent ([ef1e16e](https://github.com/porscheofficial/porschedigital-technology-radar/commit/ef1e16e583146afe8c0f7f9e7819a2d42746aa2c))
* **techradar:** scaffold all built-in themes during init ([6776d25](https://github.com/porscheofficial/porschedigital-technology-radar/commit/6776d2582f0a406b65a3c0ffc60f66d3775d21b4))
* **techradar:** segmented theme pill switcher and spotlight submenu navigation ([783a33c](https://github.com/porscheofficial/porschedigital-technology-radar/commit/783a33c41bacd64c5e60e52ad06c1936035d5503))
* **techradar:** seven built-in themes with assets and canonical ring ordering ([25c7c6f](https://github.com/porscheofficial/porschedigital-technology-radar/commit/25c7c6fe92a7896f048a836d31e57f61c4273070))
* **techradar:** theme-configurable chip system with unified blip and tag styling ([49ef55e](https://github.com/porscheofficial/porschedigital-technology-radar/commit/49ef55ed2db125250172b018f745d7894c3d0ec6))
* **techradar:** unify markdown link styling via PDS PLinkPure ([c05a9b3](https://github.com/porscheofficial/porschedigital-technology-radar/commit/c05a9b36024dc3ed200315dddd4491f894ec4d6c))
* **techradar:** welcoming about copy and pitch-driven disclaimer and footer ([c017b1d](https://github.com/porscheofficial/porschedigital-technology-radar/commit/c017b1d67812bacc49822ee86f4ffed27371f3ca))


### Bug Fixes

* **techradar:** drop redundant ring check in changelog matrix dot ([1e330c8](https://github.com/porscheofficial/porschedigital-technology-radar/commit/1e330c86972e60bbba53f9ff2d00853c5c2bfdbe))
* **techradar:** override PDS favicon so consumer favicon is used ([4956c36](https://github.com/porscheofficial/porschedigital-technology-radar/commit/4956c36d498e96896ac4c73b9eece9d0f539a0b8))
* **techradar:** prevent blip label flash on wedge hover and click ([7072b65](https://github.com/porscheofficial/porschedigital-technology-radar/commit/7072b651cb05226024e660e5818d3dba3e133e64))
* **techradar:** respect NEXT_PUBLIC_BASE_PATH for asset URLs ([19f1db4](https://github.com/porscheofficial/porschedigital-technology-radar/commit/19f1db4fcb15ff42c1cb7b5a7c122fdc1f44c246))


### Build System

* **deps-dev:** bump axe-core from 4.11.3 to 4.11.4 ([16c9d76](https://github.com/porscheofficial/porschedigital-technology-radar/commit/16c9d766e31d029cf2be175b7f76274fc5d8d5c7))
* **deps-dev:** bump html-validate from 10.13.1 to 10.15.0 ([e8d8b17](https://github.com/porscheofficial/porschedigital-technology-radar/commit/e8d8b17605cb60a9eb8246ae20d13851bd7f6ac9))
* **deps-dev:** bump jsdom from 29.1.0 to 29.1.1 in the testing group ([6ea36be](https://github.com/porscheofficial/porschedigital-technology-radar/commit/6ea36beb7453747a13a401041e51b4bbfb763b94))
* **deps-dev:** bump portless from 0.10.1 to 0.12.0 ([6a0b193](https://github.com/porscheofficial/porschedigital-technology-radar/commit/6a0b19393996ae28b12e1cce5340b995ea59b8cb))
* **deps:** bump postcss-nested from 6.2.0 to 7.0.2 ([35ec4f3](https://github.com/porscheofficial/porschedigital-technology-radar/commit/35ec4f323d268d4a9ebdd692fd5c76895c1ad958))
* **deps:** bump typescript from 5.8.3 to 6.0.3 ([3e591a2](https://github.com/porscheofficial/porschedigital-technology-radar/commit/3e591a242686d9a25d3689dd9e449a67d38df603))
* **deps:** bump zod from 4.3.6 to 4.4.2 ([cf3dfc6](https://github.com/porscheofficial/porschedigital-technology-radar/commit/cf3dfc6d50696b778485bdf57def847da3edfbe2))
* **techradar:** raise bundle budget for PDS v4 and html-react-parser ([634fef3](https://github.com/porscheofficial/porschedigital-technology-radar/commit/634fef3e82fde23a9d0c7b77c112628565ecaeff))

## [1.3.0](https://github.com/porscheofficial/porschedigital-technology-radar/compare/porschedigital-technology-radar-v1.2.6...porschedigital-technology-radar-v1.3.0) (2026-05-03)


### Features

* export radar as PNG from spotlight on the start page ([83523d3](https://github.com/porscheofficial/porschedigital-technology-radar/commit/83523d3))
* replace SearchBar with SpotlightSearch command palette ([45dcfbe](https://github.com/porscheofficial/porschedigital-technology-radar/commit/45dcfbe))
* **harness:** enforce README documented defaults match config.default.json ([fd1d0b0](https://github.com/porscheofficial/porschedigital-technology-radar/commit/fd1d0b0))


### Bug Fixes

* correct screenshot paths in READMEs ([b480b1c](https://github.com/porscheofficial/porschedigital-technology-radar/commit/b480b1c))
* delete root tsconfig.json, delegate typecheck per package ([300110e](https://github.com/porscheofficial/porschedigital-technology-radar/commit/300110e))
* remove committed node_modules and dist artifacts from git index ([2d4a9eb](https://github.com/porscheofficial/porschedigital-technology-radar/commit/2d4a9eb))
* remove orphaned SearchBar test after SpotlightSearch migration ([d92f813](https://github.com/porscheofficial/porschedigital-technology-radar/commit/d92f813))
* **dev:** allow worktree subdomains for HMR ([2c1fd11](https://github.com/porscheofficial/porschedigital-technology-radar/commit/2c1fd11))
* **radar:** preserve highlight on wedge click and clear it on segment page ([645f507](https://github.com/porscheofficial/porschedigital-technology-radar/commit/645f507))
* silence CodeQL ReDoS alert and exclude bundled dist/ from scan ([1bd4730](https://github.com/porscheofficial/porschedigital-technology-radar/commit/1bd4730))
* **techradar:** remove consola from client bundle and ban Node.js builtins in src/ ([25bb241](https://github.com/porscheofficial/porschedigital-technology-radar/commit/25bb241))
* **techradar:** remove node:fs from next.config.js and add build-output sensor ([90a183c](https://github.com/porscheofficial/porschedigital-technology-radar/commit/90a183c))


### Security

* bump postcss to >=8.5.10 (CVE-2026-41305) and harden ADR test ([d885af9](https://github.com/porscheofficial/porschedigital-technology-radar/commit/d885af9))


### Code Refactoring

* convert repo to pnpm workspace monorepo (ADR-0027) ([0e1d60d](https://github.com/porscheofficial/porschedigital-technology-radar/commit/0e1d60d))
* rename history page to changelog ([4fea1a6](https://github.com/porscheofficial/porschedigital-technology-radar/commit/4fea1a6))
* **techradar:** reduce cognitive complexity in checkConfigReadmeSync ([880d8c2](https://github.com/porscheofficial/porschedigital-technology-radar/commit/880d8c2))


### Documentation

* rewrite READMEs for npm and GitHub landing pages ([5385dcc](https://github.com/porscheofficial/porschedigital-technology-radar/commit/5385dcc))


### CI/CD

* add check:quality, check:a11y to CI verify workflow ([a27a331](https://github.com/porscheofficial/porschedigital-technology-radar/commit/a27a331))
* add pre-push hook running check:quality ([a27a331](https://github.com/porscheofficial/porschedigital-technology-radar/commit/a27a331))
* bump actions/setup-node from 4.4.0 to 6.4.0 ([fe3ce4c](https://github.com/porscheofficial/porschedigital-technology-radar/commit/fe3ce4c))
* bump github/codeql-action from 3.35.2 to 4.35.2 ([6b4e905](https://github.com/porscheofficial/porschedigital-technology-radar/commit/6b4e905))


### Dependencies

* bump next in the next group ([d659cdc](https://github.com/porscheofficial/porschedigital-technology-radar/commit/d659cdc))
* bump postcss-preset-env from 9.6.0 to 11.2.1 ([1fa49cd](https://github.com/porscheofficial/porschedigital-technology-radar/commit/1fa49cd))
* bump the porsche-design-system group with 2 updates ([9872e8f](https://github.com/porscheofficial/porschedigital-technology-radar/commit/9872e8f))
* bump @biomejs/biome in the biome group ([2e710e6](https://github.com/porscheofficial/porschedigital-technology-radar/commit/2e710e6))
* bump the testing group with 3 updates ([75cb8d5](https://github.com/porscheofficial/porschedigital-technology-radar/commit/75cb8d5))

## [1.2.6](https://github.com/porscheofficial/porschedigital-technology-radar/compare/v1.2.5...v1.2.6) (2026-04-23)


### Bug Fixes

* **a11y:** promote about-page section headings from h3 to h2 ([9fde2b2](https://github.com/porscheofficial/porschedigital-technology-radar/commit/9fde2b2000476c6c8c382ed7d00cd90ea6058798))
* **radar:** align trajectory arc with history page semantics ([7d94f1e](https://github.com/porscheofficial/porschedigital-technology-radar/commit/7d94f1e97868e902ef3bf657956f809a166e53fa))
* **radar:** read newest revision from reversed data.json ([1189f82](https://github.com/porscheofficial/porschedigital-technology-radar/commit/1189f8267ee0de7ffaeaf4736a3efa5a23571814))
* **radar:** remove redundant svg &lt;title&gt; causing native tooltip on blip hover ([ca12e6f](https://github.com/porscheofficial/porschedigital-technology-radar/commit/ca12e6f3cfcbc3b3273f2bdf6f3626c669e195c9))


### Documentation

* add ADR 0026 for renaming default branch to main ([6424662](https://github.com/porscheofficial/porschedigital-technology-radar/commit/64246622edfd633c18bfe7e1ca2b4a59d67d971c))
* **agents:** add Test Quality Requirement section ([6e69e76](https://github.com/porscheofficial/porschedigital-technology-radar/commit/6e69e76352d728b85712f3d69de12c5a83ff7ced))


### CI/CD

* rename default branch from pdig to main ([3cb5be1](https://github.com/porscheofficial/porschedigital-technology-radar/commit/3cb5be18e3aa38f3939ecad0308279340ddf1d0c))

## [1.2.5](https://github.com/porscheofficial/porschedigital-technology-radar/compare/v1.2.4...v1.2.5) (2026-04-23)


### Bug Fixes

* **scripts:** preserve latest revision when ring moves without team or body delta ([9e49830](https://github.com/porscheofficial/porschedigital-technology-radar/commit/9e49830c79b0e1053cf753f1b80fa2df5085e50d))


### Security

* fix CodeQL findings for tmp file race and insecure tmp dir ([2c3186e](https://github.com/porscheofficial/porschedigital-technology-radar/commit/2c3186e234372044bec99f5c42d71d88aaa79d23))


### Documentation

* collapse README badges into a single row ([862382c](https://github.com/porscheofficial/porschedigital-technology-radar/commit/862382c2477d475d674322af75cee6c74f48069a))
* document flexible quadrant count (1-6+) and lock invariant ([cb8ab7f](https://github.com/porscheofficial/porschedigital-technology-radar/commit/cb8ab7f4dfd4be02bab136c67b6af53c9bc86b4f))
* refresh README badge lineup ([f9d98fa](https://github.com/porscheofficial/porschedigital-technology-radar/commit/f9d98fa27a8b0d779e7106c97cd5ae341c12a925))


### CI/CD

* add PR verify workflow, npm provenance, and OSV SARIF upload ([b968d84](https://github.com/porscheofficial/porschedigital-technology-radar/commit/b968d844ffd1f940a05268beed6b332382f88d6f))
* build data before tsc and tests in verify workflow ([a3a4644](https://github.com/porscheofficial/porschedigital-technology-radar/commit/a3a464474b6f58b1c7e578cbe69d693ab366a5cf))

## [1.2.4](https://github.com/porscheofficial/porschedigital-technology-radar/compare/v1.2.3...v1.2.4) (2026-04-22)


### Bug Fixes

* **cli:** skip nested node_modules when copying source to shadow workspace ([3111452](https://github.com/porscheofficial/porschedigital-technology-radar/commit/3111452389debfd679186f3d5099e58bfddeb7ab))


### Documentation

* document automated release process and scrub personal path from ADR-0022 ([2e30e59](https://github.com/porscheofficial/porschedigital-technology-radar/commit/2e30e59b72d64b96a539335bcbffb2960782ab7f))

## [1.2.3](https://github.com/porscheofficial/porschedigital-technology-radar/compare/v1.2.2...v1.2.3) (2026-04-22)


### Bug Fixes

* **build:** fence shadow module resolution (ADR-0023) ([5b67291](https://github.com/porscheofficial/porschedigital-technology-radar/commit/5b67291fcafe39e14aab104516c188287f195dcb))

## [1.2.2](https://github.com/porscheofficial/porschedigital-technology-radar/compare/v1.2.1...v1.2.2) (2026-04-22)


### Bug Fixes

* **deps:** pin next to 16.2.3 to dodge prerender regression in 16.2.4 (ADR-0022) ([0447fd1](https://github.com/porscheofficial/porschedigital-technology-radar/commit/0447fd1ed8d4656af90c7b99771bf4c7b0886e9a))

## [1.2.1](https://github.com/porscheofficial/porschedigital-technology-radar/compare/v1.2.0...v1.2.1) (2026-04-22)


### Bug Fixes

* **cli:** recategorize build-time deps and drop devDependencies in shadow workspace (ADR-0021) ([6e72bc0](https://github.com/porscheofficial/porschedigital-technology-radar/commit/6e72bc00b630949e727b8aff86027e27d0b4f79b))

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
