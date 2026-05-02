---
title: "AWS Lambda"
ring: hold
segment: platforms-and-operations
tags:
  - backend
  - devops
teams:
  - "911"
  - macan
links:
  - url: https://aws.amazon.com/lambda/
    name: AWS Lambda
  - url: https://docs.aws.amazon.com/lambda/latest/dg/welcome.html
    name: Documentation
---

AWS Lambda is moving to hold. While it served well for event-driven workloads, the operational complexity of managing hundreds of Lambda functions has become a burden. We are consolidating serverless workloads into containerized services on [[kubernetes]], which provides a more consistent operational model across our infrastructure.

## Why Hold

Lambda was attractive early on for its zero-ops promise. In practice, at our scale, the operational reality diverged:

- **Function sprawl** — we accumulated 180+ Lambda functions across three AWS accounts, many with unclear ownership
- **Cold starts** — latency-sensitive APIs suffered p99 spikes of 3-5s during cold starts, requiring provisioned concurrency that eroded the cost advantage
- **Observability gaps** — distributed traces across Lambda invocations required custom instrumentation; our [[dash0]] + [[opentelemetry]] stack works more naturally with long-running containers
- **Deployment complexity** — each function had its own deployment pipeline, IAM role, and VPC configuration. Managing this at scale consumed more ops time than running containers on Kubernetes

## Migration Plan

We are migrating Lambda functions to Kubernetes in three waves:

1. **API handlers** (completed) — REST APIs moved to Express.js containers on EKS
2. **Event processors** (in progress) — SQS/SNS consumers moving to KEDA-scaled pods on [[kubernetes]]
3. **Scheduled tasks** (planned) — cron-triggered Lambdas moving to Kubernetes CronJobs

Functions that remain are truly event-driven, low-volume workloads where Lambda's scale-to-zero makes economic sense (e.g., S3 event processing, CloudFormation custom resources).

## Lessons Learned

Lambda is excellent for isolated, event-driven workloads at low-to-moderate scale. For organizations running a platform team with Kubernetes, the incremental cost of running another container is lower than the cognitive overhead of maintaining a parallel serverless ecosystem.
