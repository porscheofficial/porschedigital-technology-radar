---
title: "Event-Driven Architecture"
ring: trial
quadrant: methods-and-patterns
tags:
  - backend
  - data
teams:
  - macan
  - "911"
  - cayenne
links:
  - url: https://www.confluent.io/learn/event-driven-architecture/
    name: EDA Concepts (Confluent)
  - url: https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/event-driven-architecture.html
    name: AWS EDA Patterns
  - url: https://www.asyncapi.com
    name: AsyncAPI Specification
---

Event-driven architecture continues in trial with the Cayenne team joining. Our event catalog now documents 40+ domain events with schema validation enforced at publish time. The pattern has enabled several new cross-service features that would have been impractical with synchronous REST calls, such as real-time inventory updates across dealer networks.

## Event Infrastructure

Our event backbone runs on Amazon MSK (managed Kafka) with the following setup:

- **Schema Registry** — Confluent Schema Registry enforces Avro schemas at produce time; incompatible schema changes are rejected before any event is published
- **Event Catalog** — an AsyncAPI-based catalog auto-generated from our schema definitions, documenting all events with producer/consumer ownership
- **Dead Letter Queue** — failed events route to a DLQ with automatic retry policies (3 retries with exponential backoff, then alert)

## Key Domain Events

| Event | Producer | Consumers | Volume |
|---|---|---|---|
| `vehicle.configured` | Configurator | Pricing, Analytics, CRM | ~50K/day |
| `order.status.changed` | Order Service | Dealer Portal, Notifications, Analytics | ~5K/day |
| `inventory.updated` | Inventory Service | Dealer Portal, Search Index | ~200K/day |
| `user.action.tracked` | Frontend SDK | Analytics Pipeline, Personalization | ~2M/day |

## Lessons Learned

- **Schema evolution is critical** — we enforce backward-compatible changes only. Adding optional fields is fine; removing or renaming fields requires a new event version.
- **Idempotency by default** — every consumer must handle duplicate events gracefully. We use event IDs for deduplication.
- **Observability matters more** — debugging async flows is harder than REST. We trace events end-to-end using [[opentelemetry]] correlation IDs, visible in [[dash0]].
- **Start with choreography** — we avoided a central orchestrator. Services react to events independently. This keeps coupling low but requires clear event ownership documentation.
