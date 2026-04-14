---
title: "OpenTelemetry"
ring: assess
quadrant: platforms-and-operations
tags:
  - devops
  - backend
teams:
  - "911"
  - macan
---

OpenTelemetry is being assessed as a vendor-neutral observability framework. We already use [[dash0]] for monitoring (which is OTel-native), and adopting OTel SDK instrumentation directly would reduce vendor lock-in and provide portable telemetry data across our [[kubernetes]] infrastructure. The 911 and Macan teams are prototyping OTel SDK integration in two services to evaluate the migration path from Datadog-native instrumentation.
