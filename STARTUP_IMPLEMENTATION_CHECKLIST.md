# Startup Implementation Checklist (India-First, Zero-Traffic Phase)

Last updated: 2026-04-19

## Operating Mode
- We are pre-traffic.
- Optimize for shipping speed, correctness, and clean architecture boundaries.
- Delay heavy infra until demand justifies it.

## Now (Do Immediately)
- [ ] Keep INR-only order persistence for all new orders.
- [ ] Apply/verify migration 026 in all active environments.
- [ ] Add lightweight CI guardrails (backend compile + frontend lint/build).
- [ ] Continue legacy cleanup with parity sign-off before deletions.
- [x] Add smoke checks for core checkout and admin critical paths.

## Next (After First Real Usage Signals)
- [ ] Add affiliate fraud controls (self-referral checks, payout hold window).
- [ ] Add basic observability (request timing, structured error logs, dashboards).
- [ ] Move non-critical work to background jobs (emails, webhook sync, reporting).
- [ ] Improve admin UX: bulk actions and stronger confirmation flows.

## Later (Traffic-Driven)
- [ ] Multi-warehouse stock model (warehouse, stock junction, transfer ledger).
- [ ] Subscription billing entities and dunning lifecycle.
- [ ] Loyalty ledger and community engagement mechanics.
- [ ] JWT refresh-token rotation migration (only if/when session model becomes limiting).

## Explicit Deferrals (Intentional)
- Celery/RQ at this stage: deferred until queue-worthy workload appears.
- Microservice split: deferred; maintain modular monolith boundaries now.
- Global tax automation: deferred; India-only launch scope is active.

## Exit Criteria From Zero-Traffic Phase
- Stable weekly signups/orders for multiple weeks.
- Clear slow endpoints from profiling, not assumptions.
- Team pain from current monolith boundaries.
- Manual ops burden becoming repetitive and costly.
