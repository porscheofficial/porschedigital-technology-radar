---
title: "GitHub Copilot"
ring: adopt
quadrant: tools
tags:
  - ai
teams:
  - taycan
  - "911"
  - cayenne
  - macan
links:
  - url: https://github.com/features/copilot
    name: Product Page
  - url: https://docs.github.com/en/copilot
    name: Documentation
  - url: https://github.blog/news-insights/product-news/github-copilot-the-ai-pair-programmer/
    name: GitHub Blog
---

GitHub Copilot has reached adopt status organization-wide. All developers have access, and measured productivity gains average 20% for implementation tasks. Our internal guidelines have matured to cover prompt engineering best practices, mandatory code review for AI-generated code, and exclusion patterns for sensitive repositories.

## How We Measure Impact

We track Copilot's impact through three metrics:

- **Acceptance rate** — 35% of suggestions are accepted as-is, 20% accepted with modifications
- **Time-to-PR** — average time from branch creation to PR submission dropped 18% after rollout
- **Code review feedback** — AI-generated code receives the same review rigor; rejection rate is comparable to human-written code

These numbers come from quarterly developer surveys and GitHub's built-in Copilot metrics dashboard.

## Internal Guidelines

Our Copilot usage policy covers:

1. **Always review** — Copilot-generated code must pass the same review standards as hand-written code. "Copilot wrote it" is not a justification for skipping review.
2. **Security-sensitive repos excluded** — repositories handling PII, payment processing, and authentication have Copilot disabled via organization policy
3. **Test generation** — Copilot excels at generating test boilerplate. Developers are encouraged to use it for test scaffolding but must verify assertions are meaningful.
4. **No blind acceptance** — developers must understand every line they accept. Our onboarding includes a "Copilot literacy" module covering common failure modes.

## Integration with [[pair-programming]]

With Copilot handling routine implementation, our pair programming sessions have shifted focus toward architecture discussions and complex debugging rather than typing speed. Teams report that pairing with Copilot active feels like "pair programming with a fast junior" — useful for boilerplate, but requiring experienced judgment for design decisions.
