---
title: "TypeScript"
ring: adopt
quadrant: languages-and-frameworks
tags: [frontend, backend]
teams: [taycan, "911", cayenne, macan]
---

TypeScript has achieved adopt status across all teams. Every new project and service is written in TypeScript. The Macan team completed their migration of the telemetry API from plain JavaScript, and all teams benefit from shared type definitions via our internal npm packages. TypeScript is now a non-negotiable part of our technology stack.

## Why TypeScript

We adopted TypeScript to eliminate an entire class of runtime errors that plagued our JavaScript services. Before the migration, production incidents caused by `undefined is not a function` or incorrect API payloads accounted for roughly 20% of our P1 incidents. Since full adoption, that category has dropped to near zero.

Beyond type safety, TypeScript gives us:

- **Refactoring confidence** — renaming a field in a shared type immediately surfaces every consumer that needs updating
- **Self-documenting APIs** — interfaces and type aliases serve as living documentation for service contracts
- **Tooling quality** — IDE autocompletion, go-to-definition, and inline error highlighting accelerate developer onboarding

## Configuration Standards

All teams share a base `tsconfig.json` published via our internal `@porsche-digital/tsconfig` package:

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "target": "ES2022",
    "moduleResolution": "bundler"
  }
}
```

Key decisions:

- **`strict: true`** is mandatory — no exceptions. Teams that initially resisted found that the upfront investment paid off within the first sprint.
- **`noUncheckedIndexedAccess`** catches a surprising number of bugs when accessing arrays and records.
- **No `any`** — our ESLint config flags `@typescript-eslint/no-explicit-any` as an error. When external libraries lack types, we write declaration files rather than reaching for `any`.

## Shared Type Packages

Our monorepo publishes domain-specific type packages:

- `@porsche-digital/types-vehicle` — VIN, model, configuration types shared between frontend and backend
- `@porsche-digital/types-api` — Request/response types generated from OpenAPI specs
- `@porsche-digital/types-events` — Event schemas for our async messaging infrastructure

These packages are versioned independently and follow semantic versioning strictly — a breaking type change is a major version bump.

## Migration Lessons

The Macan team's JavaScript-to-TypeScript migration of the telemetry API (42 files, ~8,000 LOC) took 3 sprints. Key takeaways:

1. **Migrate bottom-up** — start with leaf modules (utilities, constants) and work toward entry points
2. **Don't boil the ocean** — use `// @ts-expect-error` temporarily with a tracking ticket, never `any`
3. **Pair with tests** — adding types surfaced 12 latent bugs that had existing tests passing despite incorrect behavior
4. **Celebrate milestones** — the team tracked "files remaining" on a dashboard, which maintained momentum

## What's Next

We are evaluating TypeScript 5.8's `--erasableSyntaxOnly` mode for direct Node.js execution without a build step, and exploring `satisfies` patterns for configuration objects across our infrastructure-as-code tooling.
