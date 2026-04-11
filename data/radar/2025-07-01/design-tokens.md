---
title: "Design Tokens"
ring: adopt
quadrant: methods-and-patterns
tags:
  - frontend
  - devops
teams:
  - taycan
  - "911"
  - cayenne
  - macan
---

Design tokens have reached adopt status across all teams. Our token pipeline is fully automated: design changes in Figma trigger token builds that publish to npm, CocoaPods, and Maven. The W3C Design Token Format ensures portability, and our theming system supports brand-specific and market-specific customizations.

## What Are Design Tokens

Design tokens are the atomic values of a design system — colors, spacing, typography, border radii, shadows, and motion parameters — expressed as platform-agnostic data. Instead of hardcoding `#0E0E12` in CSS or `UIColor(red: 0.05, ...)` in Swift, every team references `color.background.primary`, and the token pipeline resolves it to the correct value for each platform.

This indirection is what makes theming, white-labeling, and dark mode possible without touching application code.

## Our Token Architecture

```
Figma (source of truth)
  └─ Figma Variables API
       └─ Token Transformer (CI)
            ├─ CSS Custom Properties  → npm (@porsche-digital/tokens-web)
            ├─ SCSS Variables         → npm (@porsche-digital/tokens-scss)
            ├─ Swift Asset Catalog    → CocoaPods
            ├─ Kotlin Compose Theme   → Maven
            └─ JSON (raw)             → S3 (runtime theming)
```

The pipeline runs on every merge to the design system's `main` branch. Token packages are versioned with the design system — a color change is a minor bump, a renamed token is a major bump.

## Token Categories

| Category   | Examples                                                                   | Count |
| ---------- | -------------------------------------------------------------------------- | ----- |
| Color      | `color.background.primary`, `color.text.secondary`, `color.accent.success` | 84    |
| Spacing    | `spacing.static.small`, `spacing.fluid.medium`                             | 16    |
| Typography | `font.size.text.small`, `font.weight.bold`, `font.family.primary`          | 22    |
| Border     | `border.radius.medium`, `border.width.thin`                                | 8     |
| Shadow     | `shadow.elevation.low`, `shadow.elevation.high`                            | 4     |
| Motion     | `motion.duration.fast`, `motion.easing.standard`                           | 6     |

## Theming

Our token structure supports layered theming:

1. **Global tokens** — raw values (`blue-500: #178BFF`)
2. **Alias tokens** — semantic mappings (`color.accent.primary → blue-500`)
3. **Component tokens** — scoped overrides (`button.background → color.accent.primary`)

Dark mode is a theme layer that remaps alias tokens. Market-specific themes (e.g., China market) override a subset of globals. This three-tier approach means a single component can render correctly across all theme combinations without conditional logic.

## Adoption Journey

- **Q1 2024**: 911 team piloted tokens in the configurator frontend — replaced 200+ hardcoded color values
- **Q3 2024**: Figma Variables API integration automated the design-to-code pipeline
- **Q1 2025**: All four teams adopted the shared token packages; manual color/spacing values in code reviews became a blocking finding
- **Q3 2025**: W3C Design Token Community Group format adopted for interchange; runtime theming via JSON tokens deployed to CDN

## Lessons Learned

- **Name tokens semantically, not visually** — `color.text.primary` survives a rebrand; `color.dark-gray` does not
- **Lint for hardcoded values** — our Stylelint plugin flags raw hex colors and pixel spacing as errors
- **Version tokens with the design system** — decoupling caused painful mismatches before we unified versioning
- **Document every token** — our token reference site is auto-generated and includes visual previews, usage guidelines, and migration notes
