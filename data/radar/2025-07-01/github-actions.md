---
title: "GitHub Actions"
ring: adopt
quadrant: platforms-and-operations
tags:
  - devops
teams:
  - taycan
  - "911"
  - macan
links:
  - url: https://github.com/features/actions
    name: Product Page
  - url: https://docs.github.com/en/actions
    name: Documentation
  - url: https://github.com/actions
    name: Official Actions
---

GitHub Actions remains our standard CI/CD platform. The Cayenne team has migrated back to a self-hosted GitLab CI instance for compliance reasons specific to their deployment targets. Meanwhile, the Macan team has onboarded and adopted our reusable workflow library. The Taycan and 911 teams continue to expand the workflow library, now covering 95% of pipeline patterns.

## Reusable Workflow Library

Our shared workflow library (`@porsche-digital/gha-workflows`) provides composable, tested CI/CD building blocks:

| Workflow | Purpose | Used by |
|---|---|---|
| `build-and-test.yml` | Lint, typecheck, test, build | All repos |
| `deploy-preview.yml` | Deploy PR preview environments | Frontend repos |
| `publish-npm.yml` | Semantic release to npm | Library repos |
| `docker-build.yml` | Multi-arch image build + push to ECR | Backend repos |
| `security-scan.yml` | Trivy + CodeQL + dependency audit | All repos |

Teams configure pipelines by composing these workflows rather than writing custom YAML. A typical repository's `.github/workflows/ci.yml` is under 30 lines.

## Self-Hosted Runners

We operate a fleet of self-hosted runners on [[kubernetes]] for workloads that exceed GitHub-hosted runner capabilities:

- **Large builds** — monorepo builds that need 16+ GB RAM
- **Hardware access** — runners with USB passthrough for embedded device testing
- **Network access** — runners in our VPC for integration tests against internal services

The runners auto-scale via actions-runner-controller, spinning up pods on demand and scaling to zero during off-hours.

## Security Posture

All workflows enforce:

- **Least-privilege tokens** — `permissions` block is mandatory; workflows without explicit permissions fail PR checks
- **Pinned actions** — third-party actions are pinned to commit SHA, not tags
- **Secret scanning** — GitHub's secret scanning blocks pushes containing credentials
- **OIDC for cloud access** — no long-lived AWS credentials; workflows authenticate via GitHub's OIDC provider
