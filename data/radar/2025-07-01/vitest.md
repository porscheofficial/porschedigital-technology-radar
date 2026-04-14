---
title: "Vitest"
ring: adopt
quadrant: tools
tags:
  - testing
  - frontend
teams:
  - taycan
  - "911"
  - cayenne
  - macan
links:
  - url: https://vitest.dev
    name: Official Website
  - url: https://github.com/vitest-dev/vitest
    name: GitHub Repository
  - url: https://vitest.dev/guide/browser/
    name: Browser Mode Guide
---

Vitest is now adopted by all teams. The Macan team uses it for testing their data visualization components. Browser mode has enabled us to consolidate component integration tests that previously required Cypress, simplifying our testing infrastructure alongside [[storybook|Storybook's]] visual regression testing. All tests are written in [[typescript]]. Average CI test time across all projects is under 90 seconds.

## Why Vitest Over Jest

We migrated from Jest to Vitest across all projects in Q2 2024. The primary drivers:

- **Vite-native** — our frontend projects already use Vite for bundling; Vitest reuses the same config and transform pipeline, eliminating the dual-config problem
- **Speed** — Vitest's worker-based architecture and smart file watching reduced local test runs by ~60% compared to Jest
- **ESM-first** — no more `moduleNameMapper` hacks for ESM packages; Vitest handles modern module formats natively
- **Compatible API** — migration was mostly mechanical; `describe`/`it`/`expect` patterns carried over directly

## Testing Strategy

Our testing pyramid across all projects:

| Layer | Tool | Scope | Count (avg per project) |
|---|---|---|---|
| Unit | Vitest | Functions, utilities, hooks | ~200 |
| Component | Vitest + React Testing Library | Isolated component behavior | ~100 |
| Integration | Vitest Browser Mode | Multi-component flows | ~30 |
| Visual | Chromatic | Screenshot comparison | ~200 stories |
| E2E | Playwright | Critical user journeys | ~15 |

Browser mode (powered by Playwright under the hood) runs component tests in a real browser, catching DOM-specific issues that jsdom misses — particularly around CSS media queries, intersection observers, and Web Component rendering.

## CI Integration

Every PR triggers the full test suite via [[github-actions]]. Our reusable workflow:

1. Runs Vitest with `--reporter=junit` for GitHub Actions test summary
2. Collects coverage with `@vitest/coverage-v8`
3. Posts coverage diff as a PR comment (minimum 80% for new code)
4. Fails on any `test.skip` or `test.todo` — these must be resolved before merge
