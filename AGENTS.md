# AGENTS.md

## Purpose

This repository is the execution-grade specification for OneShot. Agents must use these documents to plan, implement, test, and validate changes. Code is the implementation source of truth, but code must remain consistent with these specifications.

## Working Rules

1. Treat `docs/constraints.md` as non-negotiable.
2. Treat `docs/decisions.md` as the current decision register.
3. Treat `docs/evaluation.md` as the acceptance and reward function.
4. Respect tenant isolation at all times.
5. Preserve the MVP autonomy boundary: suggestions only, never auto-apply.
6. Use FSP as the source of truth for operational scheduling state.
7. Prefer deterministic rules for compliance-critical logic.
8. Use Azure-native services unless a documented decision explicitly allows an exception.

## Required Build Order

- Phase 0 scaffold and repository setup
- Phase 1 platform foundation and FSP integration
- Phase 2 constraint engine and approval workflows
- Phase 3 end-to-end MVP use cases
- Phase 4 observability, analytics, and hardening
- Phase 5 launch readiness and pilot operations

## Change Management

Any change that affects architecture, scope, security, tenancy, or evaluation must update the relevant document before or alongside implementation:

- user-visible capability change → `requirements.md` and `scope.md`
- delivery sequencing change → `phases.md`
- technical design change → `architecture.md`
- tradeoff or platform change → `decisions.md`
- invariant change → `constraints.md`
- acceptance criteria change → `evaluation.md`

## Confirmed Decisions

- Azure-native deployment is required.
- Containerized services run on Azure Container Apps for MVP.
- PostgreSQL Flexible Server is the primary database.
- Redis is required for caching and realtime fan-out support.
- Human approval is mandatory for every applied scheduling change in MVP.

## Assumptions

- FSP API capabilities in the source documents are available in production tenants.
- Pilot schools can supply tenant admins and notification policies during onboarding.

## Open Uncertainties

- Exact provider split between Azure Communication Services and third-party messaging.
- Whether later phases need a dedicated optimization worker tier separate from the rules engine.

## Implementation Guidance

- Keep compliance logic explicit and testable.
- Keep AI assistance advisory, not authoritative, for booking decisions.
- Make every suggestion explainable with the specific constraints and priorities used.
- Emit auditable events for suggestion creation, review, approval, rejection, notification, and booking outcome.
