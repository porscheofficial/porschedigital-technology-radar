---
title: "Dash0"
ring: adopt
quadrant: platforms-and-operations
tags:
  - devops
  - backend
teams:
  - "911"
  - macan
  - taycan
  - cayenne
links:
  - url: https://www.dash0.com
    name: Official Website
  - url: https://www.dash0.com/docs
    name: Documentation
  - url: https://github.com/dash0hq
    name: GitHub Organization
---

Dash0 is now adopted by all four teams. The Cayenne team completed onboarding this quarter. Dash0's [[opentelemetry|OpenTelemetry]]-native pipeline and cost-transparent pricing model have proven ideal for our multi-team setup. It serves as the observability backend for all services running on [[kubernetes]]. Custom dashboards provide real-time business KPIs alongside technical metrics, and automatic instrumentation keeps onboarding effort minimal.

## Why Dash0

We evaluated Dash0 alongside Datadog, Grafana Cloud, and New Relic. The decision came down to three factors:

1. **OTel-native architecture** — Dash0 ingests OTLP directly without requiring proprietary agents. This aligns with our [[opentelemetry]] strategy and avoids vendor lock-in at the instrumentation layer.
2. **Transparent pricing** — per-GB ingestion pricing with no hidden per-host or per-container fees. For our Kubernetes environment with high pod churn, this saves ~40% compared to per-host models.
3. **Automatic instrumentation** — Dash0's Kubernetes operator automatically instruments workloads without code changes, which was critical for onboarding the 50+ services already running.

## Dashboard Strategy

Each team maintains two dashboard categories:

- **Technical dashboards** — latency percentiles, error rates, pod resource utilization, deployment frequency
- **Business dashboards** — conversion funnels, configurator session duration, API consumer usage patterns

A shared "platform health" dashboard aggregates cross-team SLOs, giving management a single pane for service reliability. Alerts route to PagerDuty with team-specific escalation policies.

## Integration Architecture

```
Application Pods
  └─ OTel SDK / auto-instrumentation
       └─ OTel Collector (DaemonSet)
            └─ OTLP export
                 └─ Dash0 SaaS
                      ├─ Metrics store
                      ├─ Trace store
                      └─ Log store
```

FluentBit collects container logs and forwards them via OTLP, unifying all three signals in a single backend. Correlation between traces, metrics, and logs uses the W3C trace context propagated through service calls.
