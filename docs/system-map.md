# System Map

## Entry Points

### Operator Console
- Login and session establishment
- Approval queue
- Suggestion detail and explanation view
- Tenant configuration
- Metrics and health dashboards

### Background Triggers
- Schedule polling
- Discovery request intake
- Lesson progression detection
- Retry and reconciliation jobs

### Administrative Entry Points
- Pilotbase support admin pages
- Feature flag controls
- Tenant onboarding tools
- Incident and audit review utilities

## Modules

### `web`
Frontend application for operator and support workflows.

### `api`
HTTP APIs for queue management, tenant configuration, metrics, and admin workflows.

### `workers`
Asynchronous orchestration for polling, suggestion generation, validation, booking, retries, and notifications.

### `fsp-adapter`
Normalized client for all FSP interactions.

### `rules`
Deterministic hard-constraint evaluation.

### `ranking`
Tenant-aware scoring and rationale generation.

### `notifications`
Template management, channel routing, provider abstraction, and delivery tracking.

### `persistence`
Database models, migrations, repositories, and audit storage.

### `observability`
Logging, metrics, tracing, alerts, and runbooks.

## Infrastructure

- Azure Container Apps environment
- Azure Database for PostgreSQL Flexible Server
- Azure Cache for Redis
- Azure Key Vault
- Azure Monitor / Application Insights
- Azure Managed Identity
- Container registry and CI/CD pipeline

## Integrations

- FSP APIs
- Azure Communication Services or Twilio/SendGrid
- Stripe or Square for discovery flight payment handoff
- Optional Azure OpenAI advisory integration

## Data Domains

- Tenant configuration
- Suggestion lifecycle state
- Audit events
- Notification history
- Minimal discovery prospect records
- Support/admin metadata

## Constraints

- Every module must carry tenant context explicitly.
- No module may write canonical schedule state outside approved FSP booking flows.
- Compliance evaluation must be invocable independently for testing.
- Advisory AI integrations cannot bypass rules or approval.

## Confirmed Decisions

- Module boundaries preserve a clean split between deterministic rules, orchestration, and integrations.
- Infrastructure is Azure-only for MVP.

## Assumptions

- The module split can be implemented in a single repo without organizational bottlenecks.

## Open Uncertainties

- Whether support/admin tooling belongs in the same frontend app or a separate admin surface.
