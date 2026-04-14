---
title: "Trunk-Based Development"
ring: adopt
quadrant: methods-and-patterns
tags:
  - devops
teams:
  - taycan
  - "911"
  - macan
  - cayenne
links:
  - url: https://trunkbaseddevelopment.com
    name: Trunk Based Development
  - url: https://cloud.google.com/architecture/devops/devops-tech-trunk-based-development
    name: Google DevOps - Trunk-Based Dev
---

Trunk-based development is now adopted by all four teams. The Cayenne team completed their transition from GitFlow this quarter. Organization-wide deployment frequency is up 300% year-over-year, and our change failure rate has dropped below 5%. Feature flags have become a core part of our development culture.

## How It Works For Us

Every developer commits to `main` (or a short-lived branch that merges within 24 hours). There are no `develop`, `release/*`, or `hotfix/*` branches. The workflow:

1. Developer creates a feature branch from `main`
2. Work happens in small increments — PRs are typically under 200 lines
3. CI runs on every push: lint, typecheck, test, build (via [[github-actions]])
4. After code review approval, the branch merges to `main`
5. `main` is always deployable — broken builds are treated as P0 incidents

## Feature Flags

Feature flags are the enabler that makes trunk-based development safe for large features:

- **LaunchDarkly** manages our flags across all environments
- New features ship behind flags from day one — no long-lived branches
- Flags are cleaned up within 2 sprints of full rollout (enforced by a scheduled reminder)
- We maintain ~40 active flags at any given time; our maximum was 65, which we agreed was too many

## DORA Metrics

| Metric | Before (GitFlow) | After (Trunk-Based) |
|---|---|---|
| Deployment frequency | Weekly | Multiple daily |
| Lead time for changes | 2-3 weeks | 1-2 days |
| Change failure rate | 12% | 4.5% |
| Mean time to recovery | 4 hours | 25 minutes |

These improvements came not from trunk-based development alone, but from the practices it forced: smaller changes, better CI, feature flags, and continuous deployment.
