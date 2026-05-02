---
title: "Rust"
ring: trial
segment: languages-and-frameworks
tags:
  - backend
teams:
  - macan
  - "911"
links:
  - url: https://www.rust-lang.org
    name: Official Website
  - url: https://doc.rust-lang.org/book/
    name: The Rust Book
  - url: https://github.com/rust-lang/rust
    name: GitHub Repository
---

Rust has moved to trial. The telemetry data pipeline rewrite (previously [[typescript]]) is now in production, processing 2M+ events/sec with sub-millisecond latency. The 911 team has started using Rust for a new real-time vehicle tracking service. We have invested in Rust training and [[pair-programming]] sessions to build team competency.

## Production Use Cases

### Telemetry Data Pipeline (Macan)

The Macan team rewrote the telemetry ingestion service from Node.js/TypeScript to Rust. The motivation was clear: the Node.js version hit a ceiling at ~200K events/sec with increasing tail latency under load.

Results after migration:

| Metric | Node.js (before) | Rust (after) |
|---|---|---|
| Throughput | 200K events/sec | 2.1M events/sec |
| p99 latency | 45ms | 0.8ms |
| Memory usage | 2.4 GB | 180 MB |
| CPU cores needed | 8 | 2 |

The service uses `tokio` for async I/O, `serde` for zero-copy deserialization, and `rdkafka` for Kafka integration.

### Vehicle Tracking Service (911)

The 911 team chose Rust for a real-time GPS tracking service that processes live vehicle positions. The strict latency requirements (<5ms end-to-end) and the need for predictable performance (no GC pauses) made Rust the right fit. The service is deployed on [[kubernetes]] with a 99.99% uptime target.

## Learning Investment

Rust has a steep learning curve. Our approach:

- **Structured training** — 8-week internal Rust course covering ownership, lifetimes, async, and error handling
- **Pair programming** — experienced Rustaceans pair with newcomers on production code
- **Code review focus** — Rust PRs get extra review attention for idiomatic patterns
- **Shared crate library** — common patterns (error types, telemetry, config loading) are extracted into internal crates to reduce boilerplate

## Where Rust Fits (and Doesn't)

We use Rust for:
- High-throughput data processing
- Latency-sensitive real-time services
- [[webassembly]] compilation targets
- CLI tools that need fast startup

We don't use Rust for:
- CRUD APIs (TypeScript + Node.js is faster to develop)
- Frontend applications
- Scripts and automation (too much ceremony)

This intentional scoping ensures Rust is applied where its strengths matter most, without imposing its complexity where simpler tools suffice.
