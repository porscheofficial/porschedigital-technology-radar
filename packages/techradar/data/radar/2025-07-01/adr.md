---
title: "Architecture Decision Records"
ring: trial
segment: methods-and-patterns
tags:
  - devops
teams:
  - "911"
  - taycan
links:
  - url: https://adr.github.io
    name: ADR Homepage
  - url: https://github.com/adr/madr
    name: MADR Template
  - url: https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions
    name: Michael Nygard's Original Post
---

ADRs have moved to trial. The Taycan team has joined the 911 team in maintaining decision logs. We have created a shared ADR repository that aggregates decisions across teams, enabling cross-team visibility into architectural direction. The MADR template has been customized with Porsche-specific sections for compliance and security impact.

## What Are ADRs

An Architecture Decision Record captures the context, decision, and consequences of a significant technical choice. Unlike meeting notes or Slack threads, ADRs are version-controlled, searchable, and persistent — they answer "why did we choose X?" months or years after the decision was made.

## Our ADR Process

1. **Propose** — developer creates a PR with a new ADR in `docs/adr/` using our MADR template
2. **Discuss** — team reviews the ADR asynchronously (minimum 2 reviewers, one from outside the proposing team)
3. **Decide** — ADR status is set to "accepted" or "rejected" with the decision rationale
4. **Supersede** — when a decision is revisited, the original ADR is marked "superseded by ADR-XXX" and a new ADR captures the updated context

## Template Structure

Our customized MADR template adds two Porsche-specific sections:

```markdown
# ADR-042: Migrate from Datadog to Dash0

## Status: Accepted (2025-03-15)

## Context
[What is the issue? What forces are at play?]

## Decision
[What is the change that we're proposing?]

## Consequences
[What becomes easier or harder?]

## Compliance Impact        ← Porsche-specific
[Does this affect data residency, audit logging, or regulatory requirements?]

## Security Considerations  ← Porsche-specific
[Attack surface changes, credential management, network exposure?]
```

## Impact So Far

Since adoption:

- **38 ADRs** written across the 911 and Taycan teams
- **3 decisions revisited** — the ADR history made it easy to understand the original context and evaluate what changed
- **Onboarding accelerant** — new team members read the last 10 ADRs to understand the architectural landscape faster than any wiki page could convey

The Cayenne and Macan teams are expected to adopt ADRs in the next quarter as part of a broader documentation standardization effort.
