---
title: "Biome"
ring: assess
segment: tools
tags:
  - linting
  - formatting
teams: []
links:
  - url: https://biomejs.dev
    name: Official Website
  - url: https://github.com/biomejs/biome
    name: GitHub Repository
---

Biome is a toolchain for JavaScript, TypeScript, JSON, and CSS that combines a formatter and a linter in one tool. It is written in Rust and is designed to replace separate tools such as Prettier and ESLint for these languages.

This repository uses Biome for linting and formatting across the whole workspace. A single configuration file, `biome.jsonc`, covers both packages, and the lint-staged hook runs it on every commit.
