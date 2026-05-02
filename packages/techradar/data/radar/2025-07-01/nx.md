---
title: "Nx"
ring: trial
segment: tools
tags:
  - devops
  - frontend
teams:
  - taycan
  - "911"
links:
  - url: https://nx.dev
    name: Official Website
  - url: https://github.com/nrwl/nx
    name: GitHub Repository
  - url: https://nx.dev/features/cache-task-results
    name: Caching Documentation
---

Nx has moved to trial. The Taycan team has migrated from Turborepo and the 911 team has started adoption. Remote caching via Nx Cloud has reduced average CI build times by 65%. The module boundary enforcement feature helps maintain clean architecture in our growing monorepo, preventing unintended cross-package dependencies.

## Why We Switched From Turborepo

The Taycan team initially adopted Turborepo for monorepo orchestration. After 6 months, limitations drove the switch to Nx:

- **Task graph intelligence** — Nx understands project dependencies at the code level, not just the package.json level. This means it can identify affected projects from a single file change, something Turborepo's hash-based approach missed.
- **Module boundary enforcement** — Nx's `@nx/enforce-module-boundaries` lint rule prevents architectural violations at PR time. Our tag system (`scope:shared`, `scope:team-taycan`, `type:feature`, `type:util`) ensures teams don't accidentally import each other's internal code.
- **Code generation** — `nx generate` scaffolds new packages, components, and services with consistent structure, reducing boilerplate and enforcing conventions.

## Remote Caching Results

Nx Cloud caches task outputs (build, test, lint) across the entire team and CI:

| Metric | Before (Turborepo) | After (Nx Cloud) |
|---|---|---|
| Avg CI build time | 12 min | 4.2 min |
| Cache hit rate | ~40% | ~78% |
| Local dev rebuild | 45s | 8s |
| Flaky test reruns | Manual | Automatic (Nx Agents) |

The higher cache hit rate comes from Nx's finer-grained task hashing — it only invalidates caches when inputs that actually affect the output change, ignoring irrelevant file modifications like README updates.

## Monorepo Structure

Our Nx workspace organizes ~40 packages:

```
apps/
  configurator/       (Taycan team — Next.js)
  dealer-portal/      (911 team — Next.js)
  admin-dashboard/    (911 team — Vite + React)
libs/
  shared/ui/          (Porsche Design System wrappers)
  shared/utils/       (Common utilities)
  shared/types/       (Cross-project TypeScript types)
  team-taycan/        (Taycan-scoped libraries)
  team-911/           (911-scoped libraries)
```

Module boundaries ensure `apps/configurator` can import from `libs/shared/*` and `libs/team-taycan/*` but never from `libs/team-911/*`.
