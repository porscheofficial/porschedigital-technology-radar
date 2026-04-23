---
title: "Backstage"
ring: trial
quadrant: platforms-and-operations
tags:
  - devops
teams:
  - "911"
  - taycan
---

Backstage moves to trial. The 911 team has run a production instance for a year, and the Taycan team has joined as a second adopter. Our custom plugins for service scaffolding and the API catalog have proven their value, and we want to validate the platform across more than one team before committing to adopt.

## What We Built

Our Backstage instance includes four custom plugins:

| Plugin | Purpose | Maintenance effort |
|---|---|---|
| Service Scaffolder | Generates new services from team-specific templates | Medium — templates need updating when conventions change |
| API Catalog | Aggregates OpenAPI specs from all services into a searchable catalog | Low — mostly automated via CI |
| Tech Radar | Embedded tech radar visualization (ironically, this very radar) | Low — reads from published data |
| Runbook Viewer | Surfaces operational runbooks linked to service entities | High — keeping runbooks current is a cultural challenge |

## The Maintenance Question

Backstage's plugin architecture is powerful but demands ongoing investment:

- **Upgrade cadence** — Backstage releases weekly. We fell behind by 3 months and the catch-up migration took a full sprint.
- **Plugin API changes** — the new frontend system (v2 plugin API) requires rewriting all our custom plugins
- **Build time** — the Backstage app takes 4+ minutes to build; local development requires running a separate backend process

The 911 team estimates they spend ~15% of one engineer's time maintaining the Backstage instance.

## Alternatives Under Consideration

- **Port (getport.io)** — managed developer portal with lower maintenance overhead
- **Custom lightweight portal** — a thin Next.js app consuming the same data sources, without the Backstage framework
- **Enhanced README standards** — investing in service READMEs and [[github-actions]]-powered automation instead of a centralized portal

## Decision Criteria

We will revisit by mid-2025 based on:

1. Does the new frontend system reduce our maintenance burden?
2. Can we justify the engineering cost for 4 teams, or is this only valuable at larger scale?
3. Do developers actually use the portal daily, or just for onboarding?

Usage analytics show the API Catalog gets 50+ daily views, but the scaffolder is used ~3 times per month. This asymmetry suggests we might be better served by keeping the catalog and dropping the full Backstage instance.
