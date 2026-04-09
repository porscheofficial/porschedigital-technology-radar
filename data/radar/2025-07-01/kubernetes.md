---
title: "Kubernetes"
ring: adopt
quadrant: platforms-and-operations
tags: [devops, backend]
teams: ["911", macan, cayenne, taycan]
---

Kubernetes remains our standard container orchestration platform. Recent improvements include migration to Cilium for eBPF-based networking, implementation of Crossplane for infrastructure-as-code within K8s, and adoption of Kyverno for policy enforcement. Our platform team now supports 50+ production services across all teams.

## Platform Overview

We run Kubernetes on AWS EKS across three environments (dev, staging, production) with the following topology:

- **Production**: 3 node groups (general, compute-optimized, GPU) across 3 availability zones
- **Staging**: mirrors production topology at reduced scale
- **Dev**: single node group with spot instances for cost efficiency

Each team operates in dedicated namespaces with resource quotas and network policies enforced by Kyverno. The platform team maintains shared infrastructure (ingress, cert-manager, external-dns, monitoring stack) via Helm charts in a GitOps repository.

## Key Infrastructure Decisions

### Networking: Cilium

We migrated from AWS VPC CNI to Cilium in Q1 2025. The primary drivers were:

- **eBPF-based observability** — Hubble provides network flow visibility without sidecar overhead
- **Network policies at L7** — HTTP-aware policies replace our previous Istio service mesh for east-west traffic control
- **Performance** — eBPF dataplane reduced pod-to-pod latency by ~15% compared to iptables-based routing

### Policy Enforcement: Kyverno

Kyverno replaced OPA Gatekeeper for policy enforcement:

```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: require-resource-limits
spec:
  validationFailureAction: Enforce
  rules:
    - name: check-limits
      match:
        any:
          - resources:
              kinds: ["Pod"]
      validate:
        message: "CPU and memory limits are required."
        pattern:
          spec:
            containers:
              - resources:
                  limits:
                    memory: "?*"
                    cpu: "?*"
```

Our policy library enforces: resource limits, image provenance (only our ECR registries), label standards, PodDisruptionBudget presence for production workloads, and prohibition of `latest` tags.

### GitOps: Flux

All cluster state is managed via Flux CD pointing at our `infrastructure` monorepo. The reconciliation loop ensures drift detection — any manual `kubectl apply` is automatically reverted within 5 minutes.

## Scaling Strategy

| Dimension      | Approach                        | Tool                                   |
| -------------- | ------------------------------- | -------------------------------------- |
| Horizontal Pod | Request-based + custom metrics  | KEDA                                   |
| Vertical Pod   | Right-sizing recommendations    | VPA (recommend mode)                   |
| Cluster Nodes  | Bin-packing aware               | Karpenter                              |
| Cost           | Spot instances for non-critical | Karpenter + spot interruption handling |

Karpenter replaced Cluster Autoscaler in Q2 2025, reducing node provisioning time from ~90s to ~30s and improving bin-packing efficiency by 25%.

## Observability Integration

Every pod gets automatic instrumentation via OpenTelemetry Collector running as a DaemonSet:

- **Metrics** → Dash0 (via OTLP)
- **Traces** → Dash0 (via OTLP)
- **Logs** → Dash0 (via FluentBit → OTLP)

Kubernetes events and audit logs feed into our security monitoring pipeline for anomaly detection.

## What's Next

We are evaluating **Gateway API** to replace our Ingress-based routing (more expressive, better multi-team support), and exploring **Kubernetes VCluster** for ephemeral preview environments to replace our current branch-based namespace approach.
