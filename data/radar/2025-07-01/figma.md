---
title: "Figma"
ring: adopt
quadrant: tools
tags:
  - frontend
teams:
  - taycan
  - "911"
  - cayenne
  - macan
links:
  - url: https://www.figma.com
    name: Official Website
  - url: https://www.figma.com/developers
    name: Developer Platform
  - url: https://help.figma.com/hc/en-us/articles/15339657135383-Guide-to-variables-in-Figma
    name: Figma Variables Guide
---

Figma remains our standard design tool with full organizational adoption. The recent addition of Figma AI features for auto-layout suggestions and asset generation has further accelerated design workflows. Our Figma-to-code pipeline now covers web, iOS, and Android platforms with consistent [[design-tokens|design token]] application.

## How We Use Figma

Figma serves as the single source of truth for all visual design decisions:

- **Component library** — our Porsche Design System is maintained as a Figma library with 120+ components, each mirroring the code component API (props → Figma properties)
- **Variables** — all design tokens (colors, spacing, typography) are defined as Figma Variables, exported via the Variables API to feed our [[design-tokens]] pipeline
- **Prototyping** — interactive prototypes replace static specs for user flows; developers reference prototypes directly during implementation
- **Dev Mode** — designers publish components with annotations, and developers inspect spacing, colors, and assets without leaving Figma

## Design-to-Code Pipeline

The pipeline connects Figma to our development workflow:

1. Designer updates a component or token in Figma
2. Figma Variables API webhook triggers a CI job
3. Token Transformer converts Figma variables to platform-specific formats
4. Published packages update automatically in [[storybook]] and application codebases
5. Chromatic visual regression tests flag any unintended visual changes

This automation eliminated the manual handoff that previously caused 2-3 day delays between design updates and code implementation.

## Team Workflow

All design reviews happen in Figma. Designers share prototypes with "can comment" access to the full engineering team, and feedback threads are resolved before implementation begins. This front-loads design decisions and reduces rework during code review.

Each team maintains a dedicated Figma project, but all teams share the central PDS component library. Custom components built for one team are evaluated for promotion to the shared library during monthly design system reviews.
