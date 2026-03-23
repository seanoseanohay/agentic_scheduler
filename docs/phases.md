# Phases

## Phase 0 — Scaffold

### Goal
Create the repository, development standards, infrastructure baseline, and local developer workflow required for implementation.

### Deliverables
- Monorepo or structured repo with frontend, backend, shared types, infra, and docs
- CI checks for linting, typechecking, tests, and documentation integrity
- Local development environment with mockable FSP integration adapters
- Environment variable contract and secret-loading strategy
- Initial database migrations and Redis connection bootstrap

### Success Criteria
- A new developer can run the application locally with seeded demo data and mocked external integrations
- CI passes on every commit
- Base observability and logging libraries are wired in

## Phase 1 — Azure Foundation and FSP Integration

### Goal
Stand up the Azure-native runtime and establish secure FSP integration plus tenant-aware authentication and persistence.

### Deliverables
- Azure Container Apps environments for API, workers, and web frontend
- Azure Database for PostgreSQL Flexible Server
- Azure Cache for Redis
- Azure Key Vault, managed identity, and Application Insights
- FSP client layer for authentication, schedule polling, availability checks, twilight data, reservation validation, reservation creation, and progress reads
- Tenant-aware auth and authorization model
- Immutable audit event persistence

### Success Criteria
- Tenant-isolated users can sign in and view only their operator context
- FSP polling detects schedule changes within target cadence
- Audit events are stored for every system action
- Secret access uses managed identity rather than embedded credentials

## Phase 2 — Constraint Engine and Approval Workflows

### Goal
Build the deterministic scheduling engine and the operator approval experience.

### Deliverables
- Hard-constraint evaluation service
- Ranking service with tenant-configurable weights
- Suggestion state machine
- Operator queue with filtering, bulk actions, and explanations
- Realtime updates using SignalR-compatible or websocket abstraction
- Notification template and policy subsystem

### Success Criteria
- Suggestions are generated only when hard constraints pass
- Queue latency is low enough for operators to act during active scheduling windows
- Explanations identify ranking and compliance reasons clearly
- Realtime queue updates reflect state changes without manual refresh

## Phase 3 — MVP Workflow Completion

### Goal
Deliver all four end-to-end MVP workflows.

### Deliverables
- Waitlist automation workflow
- Cancellation recovery workflow
- Discovery flight workflow with payment handoff
- Next-lesson sequencing workflow
- Final reservation validation and creation orchestration
- Notification delivery and outcome tracking

### Success Criteria
- Each workflow can be executed from trigger through operator approval to FSP booking outcome
- Booking failures are retried or surfaced appropriately
- Pilot tenants can configure ranking and communication settings without code changes

## Phase 4 — Analytics, Observability, and Hardening

### Goal
Prove operational value and improve production readiness.

### Deliverables
- KPI dashboards
- Queue health and throughput monitoring
- Performance tuning for database and cache
- Rate limiting, retry policies, and circuit breakers
- Backup, restore, and recovery runbooks
- Pilotbase support tooling for tenant health

### Success Criteria
- Core metrics are visible by tenant and globally
- Performance and error budgets are measurable
- Operators and support teams can diagnose failures from logs, traces, and audit records

## Phase 5 — Launch Readiness and Pilot Operations

### Goal
Prepare for and execute pilot launch safely.

### Deliverables
- Tenant onboarding checklist
- Security review remediation
- Runbooks for rollout, rollback, incident response, and support escalation
- Feature flag rollout plan for 50 pilot schools
- Pilot feedback instrumentation and review cadence

### Success Criteria
- Pilot tenants can be onboarded repeatably
- No critical security findings remain open
- Launch can be rolled back without data corruption or tenant crossover
- Pilot metrics can be reviewed weekly against evaluation targets

## Confirmed Decisions

- Azure Container Apps is the default compute platform for MVP.
- Phase 0 is mandatory before feature implementation.
- Phase 3 contains all user-facing MVP workflows.

## Assumptions

- Managed Azure services will accelerate delivery more than custom orchestration.

## Open Uncertainties

- Whether a dedicated worker autoscaling profile is needed before pilot launch.
