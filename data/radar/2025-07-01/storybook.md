---
title: "Storybook"
ring: adopt
quadrant: tools
tags:
  - frontend
  - testing
teams:
  - taycan
  - cayenne
  - macan
---

Storybook remains adopted. The 911 team has consolidated their component development directly into the shared design system workspace, no longer maintaining a separate Storybook instance. The Taycan and Cayenne teams continue to use Storybook as their primary [[react]] component development and documentation tool, with [[design-tokens]] applied via a shared preset and designs sourced from [[figma]].

## How We Use Storybook

Storybook serves three distinct purposes in our workflow:

1. **Component development** — isolated development environment where developers build and iterate on components without running the full application
2. **Living documentation** — auto-generated docs pages with prop tables, usage examples, and design guidelines that stay in sync with the code
3. **Visual regression testing** — Chromatic integration catches unintended visual changes before they reach production

## Configuration

All teams extend a shared Storybook preset published as `@porsche-digital/storybook-preset`:

```typescript
// .storybook/main.ts
import type { StorybookConfig } from "@storybook/react-vite";

const config: StorybookConfig = {
  stories: ["../src/**/*.stories.@(ts|tsx)"],
  addons: [
    "@storybook/addon-essentials",
    "@storybook/addon-a11y",
    "@porsche-digital/storybook-preset",
  ],
  framework: "@storybook/react-vite",
};

export default config;
```

The shared preset configures:

- **PDS Provider decorator** — wraps every story in `PorscheDesignSystemProvider` with theme toggle
- **Viewport presets** — mobile, tablet, desktop matching our breakpoint system
- **Dark mode toggle** — switches between light and dark PDS themes
- **Design token documentation** — auto-renders available tokens per component

## Story Patterns

We enforce a consistent story structure across teams:

```tsx
// Button.stories.tsx
import { Button } from "./Button";

import type { Meta, StoryObj } from "@storybook/react";

const meta: Meta<typeof Button> = {
  component: Button,
  tags: ["autodocs"],
  argTypes: {
    variant: {
      control: "select",
      options: ["primary", "secondary", "ghost"],
    },
  },
};

export default meta;
type Story = StoryObj<typeof Button>;

export const Primary: Story = {
  args: { variant: "primary", children: "Click me" },
};

export const AllVariants: Story = {
  render: () => (
    <div style={{ display: "flex", gap: "1rem" }}>
      <Button variant="primary">Primary</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="ghost">Ghost</Button>
    </div>
  ),
};
```

Every component must have:

- A **default story** showing the most common usage
- An **all variants** story showing every visual permutation
- **Edge cases** — long text, empty state, loading state, error state

## Visual Regression Testing

We use Chromatic (by the Storybook team) for visual regression:

- Every PR triggers a Chromatic build that screenshots all stories
- Changed stories require **explicit approval** from a designer or frontend lead
- Baseline updates happen automatically on merge to `main`
- Average build: ~200 stories, completes in 2-3 minutes

The Chromatic integration has caught 30+ unintended visual regressions in the past 6 months that would have shipped to production otherwise.

## Accessibility Testing

The `@storybook/addon-a11y` plugin runs axe-core checks on every story. Our CI pipeline fails if any story has accessibility violations at the "critical" or "serious" level. This catches:

- Missing alt text on images
- Insufficient color contrast
- Missing form labels
- Incorrect ARIA attributes
- Keyboard navigation issues

## Deployment

Storybook is deployed as a static site to our internal CDN on every merge to `main`:

- **URL**: `https://storybook.internal.porsche.digital`
- **Versioned**: each release tag publishes to `/v{version}/`
- **Search**: Algolia DocSearch indexes all story documentation

Product managers and designers use the deployed Storybook as a reference when writing specs, ensuring they reference components that actually exist with their real prop APIs.

## What's Next

We are evaluating **Storybook 9's** tag-based filtering for better organization of our growing story library, and exploring **Storybook Test** for component-level integration tests that replace some of our Playwright component tests.
