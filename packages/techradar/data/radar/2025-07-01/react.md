---
title: "React"
ring: adopt
segment: languages-and-frameworks
tags:
  - frontend
teams:
  - taycan
  - "911"
  - macan
links:
  - url: https://react.dev
    name: Official Docs
  - url: https://github.com/facebook/react
    name: GitHub Repository
  - url: https://react.dev/learn/react-compiler
    name: React Compiler
---

React continues as our standard for customer-facing web applications. We have adopted the React Compiler for automatic memoization, eliminating manual useMemo/useCallback optimization. Our shared component library — built with [[typescript]] — has grown to 80+ components with full accessibility compliance and Porsche Design System integration. Components are developed and documented in [[storybook]], and styled using [[design-tokens]].

## Our React Stack

Every React project at Porsche Digital shares the same foundation:

| Layer | Choice | Rationale |
|---|---|---|
| Framework | Next.js (Pages Router) | Static export for marketing/public sites; SSR for authenticated apps |
| Styling | SCSS Modules + Design Tokens | Co-located styles, Porsche Design System compliance |
| State | React Context + useReducer | Sufficient for our app complexity; no Redux needed |
| Forms | React Hook Form + Zod | Type-safe validation with minimal re-renders |
| Testing | [[vitest]] + React Testing Library | Fast, behavior-focused tests |
| Component Dev | [[storybook]] | Isolated development with PDS integration |

## React Compiler

The React Compiler (formerly React Forget) automatically optimizes re-renders by inserting memoization at build time. Since adoption:

- Removed ~400 manual `useMemo`/`useCallback` calls across our component library
- Reduced average component re-render time by 15-20% in profiler benchmarks
- Simplified code review — no more debates about "should this be memoized?"

The compiler runs as a Babel plugin in our build pipeline. Components that violate the Rules of React are flagged at build time, catching bugs that would have been silent runtime issues.

## Component Library

Our shared library (`@porsche-digital/components`) wraps Porsche Design System web components with React-specific APIs:

- **80+ components** covering layout, forms, navigation, data display, and feedback
- **Accessibility-first** — every component passes axe-core critical and serious checks
- **Design token integration** — all visual properties reference tokens, enabling theming without component changes
- **Versioned and published** to our internal npm registry with automated release via [[github-actions]]
