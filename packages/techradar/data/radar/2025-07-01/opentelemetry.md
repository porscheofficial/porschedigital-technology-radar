---
title: "OpenTelemetry"
ring: assess
segment: platforms-and-operations
tags:
  - devops
  - backend
teams:
  - "911"
  - macan
links:
  - url: https://opentelemetry.io
    name: Official Website
  - url: https://opentelemetry.io/docs/
    name: Documentation
  - url: https://github.com/open-telemetry
    name: GitHub Organization
---

OpenTelemetry is being assessed as a vendor-neutral observability framework. We already use [[dash0]] for monitoring (which is OTel-native), and adopting OTel SDK instrumentation directly would reduce vendor lock-in and provide portable telemetry data across our [[kubernetes]] infrastructure. The 911 and Macan teams are prototyping OTel SDK integration in two services to evaluate the migration path from Datadog-native instrumentation.

## Assessment Goals

Our evaluation focuses on three questions:

1. **Migration effort** — how much work to replace Datadog's `dd-trace` with OTel SDK instrumentation in a typical Node.js service?
2. **Feature parity** — do we lose any Datadog-specific features (profiling, runtime metrics, APM traces) that our teams depend on?
3. **Operational overhead** — does running the OTel Collector as a sidecar or DaemonSet add meaningful resource consumption or failure modes?

## Pilot Services

| Service | Team | Stack | Status |
|---|---|---|---|
| Vehicle Config API | 911 | Node.js + Express | OTel SDK integrated, comparing metrics with Datadog |
| Telemetry Ingestion | Macan | [[rust]] + Tokio | OTel Rust SDK integrated, testing trace export |

Both pilots run OTel and Datadog instrumentation in parallel for 4 weeks, comparing data quality, latency impact, and operational stability side-by-side.

## Collector Architecture

We are evaluating a DaemonSet deployment (one Collector per node) rather than a sidecar pattern:

```
Pod (application)
  └─ OTLP export (gRPC, port 4317)
       └─ OTel Collector (DaemonSet, same node)
            ├─ Processor: batch, memory limiter, resource detection
            └─ Exporter: OTLP → Dash0
```

The DaemonSet approach reduces per-pod overhead and simplifies configuration — applications only need to know the Collector's local endpoint, not the backend destination.

## Expected Outcome

If the assessment succeeds, we plan to standardize on OTel SDK instrumentation across all services, removing all proprietary agent dependencies. Dash0 remains the backend — OTel gives us the flexibility to change backends in the future without re-instrumenting application code.
