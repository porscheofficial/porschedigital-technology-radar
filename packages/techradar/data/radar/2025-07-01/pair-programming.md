---
title: "Pair Programming"
ring: assess
segment: methods-and-patterns
tags:
  - testing
teams:
  - "911"
links:
  - url: https://martinfowler.com/articles/on-pair-programming.html
    name: Martin Fowler on Pair Programming
  - url: https://tuple.app
    name: Tuple (Remote Pairing Tool)
---

Pair programming is being re-evaluated. With AI-assisted coding tools like [[copilot]] becoming prevalent, the dynamics of pairing have shifted. Only the 911 team still practices regular pair programming. We are reassessing how pairing integrates with Copilot-augmented workflows and whether the traditional model still provides the same value.

## The Shift

Before Copilot, pair programming served two primary functions:

1. **Real-time code review** — catching bugs and design issues as they're written
2. **Knowledge transfer** — spreading codebase familiarity across team members

Copilot has partially absorbed function #1 — it catches typos, suggests correct API usage, and fills boilerplate. But it cannot replace function #2, which remains the most valuable aspect of pairing for us.

## Current Practice (911 Team)

The 911 team pairs 2-3 times per week, typically for:

- **Complex debugging sessions** — when a bug spans multiple services or involves subtle race conditions
- **Architecture discussions** — designing new features at a whiteboard, then immediately implementing the skeleton together
- **Onboarding** — new team members pair with seniors for their first 2 weeks, working on real tasks rather than synthetic exercises

They use Tuple for remote pairing, which provides low-latency screen sharing with native drawing tools.

## Open Questions

- Does "Copilot + solo developer" produce comparable output to "pair without Copilot"?
- Should pairing sessions focus exclusively on design and review, leaving implementation to solo+AI workflows?
- Is the social/mentoring benefit of pairing worth the 2x developer cost in an AI-augmented environment?

The 911 team is running a structured comparison through Q3 2025: alternating sprints with and without mandatory pairing, measuring defect rates, velocity, and developer satisfaction.
