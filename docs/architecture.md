# Architecture

## System Overview

OneShot is an Azure-native, event-driven web application that observes FSP schedule state, evaluates scheduling opportunities against deterministic aviation and business constraints, ranks compliant options, and presents them in an operator approval queue. After approval, OneShot performs final FSP validation and submits bookings or reschedules back to FSP.

The architecture separates:
- web presentation
- API and workflow orchestration
- constraint and ranking evaluation
- integration adapters
- persistence and auditability
- messaging and observability

## Components

### 1. Web Frontend
- Technology: Next.js
- Responsibilities: operator login, approval queue, configuration screens, metrics views, support/admin pages
- Deployment: Azure Container Apps
- Data access: backend APIs and realtime queue updates

### 2. API Gateway / Application Service
- Technology: TypeScript service layer
- Responsibilities: session handling, tenant context, queue APIs, configuration APIs, support/admin APIs, webhook endpoints if enabled later
- Deployment: Azure Container Apps
- Dependencies: PostgreSQL, Redis, FSP adapter, workflow services

### 3. Workflow Orchestrator
- Responsibilities: trigger ingestion, suggestion lifecycle state machine, retries, idempotency, audit emission, booking orchestration
- Deployment: Azure Container Apps worker profile
- Dependencies: queue transport, PostgreSQL, Redis, FSP adapter

### 4. Constraint Engine
- Responsibilities: evaluate daylight rules, certification matching, aircraft suitability, availability checks, continuity policies, search window constraints
- Nature: deterministic and testable; no opaque model output may override it

### 5. Ranking and Explanation Service
- Responsibilities: score compliant candidates, produce operator-readable rationale, support tenant-specific weights
- AI posture: Azure OpenAI may assist with explanation formatting or ranking experimentation, but the final candidate list must remain bounded by deterministic hard constraints and explicit scoring rules

### 6. FSP Integration Adapter
- Responsibilities: authentication/session brokerage, operator and user reads, location reads, aircraft reads, instructor reads, availability checks, civil twilight reads, reservation validation, reservation creation, batch reservations, schedule polling, training progress reads
- Reliability patterns: retry with backoff, idempotency keys where possible, response normalization, rate-limit handling

### 7. Notification Service
- Responsibilities: template resolution, branding, channel selection, delivery provider invocation, delivery outcome storage
- Preferred providers: Azure Communication Services first; Twilio/SendGrid allowed if required by deliverability or tenant needs

### 8. Data Stores
- PostgreSQL Flexible Server:
  - tenants
  - user roles
  - workflow runs
  - suggestions
  - approvals
  - notification records
  - audit records
  - feature flags
  - minimal discovery prospects
- Redis:
  - cache for reference data
  - ephemeral queue support and fan-out
  - realtime update backing

### 9. Observability and Operations
- Azure Key Vault for secrets
- Managed Identity for service-to-service auth
- Azure Monitor and Application Insights for logs, metrics, traces, and alerting

## Data Flow

### Change Detection to Suggestion
1. Poller reads schedule state from FSP on a tenant cadence.
2. A relevant event is detected, such as cancellation, opening, discovery request, or progress advancement.
3. The orchestrator creates a workflow run and emits an audit event.
4. The constraint engine enumerates candidate options using FSP availability and reference data.
5. Hard constraints eliminate invalid options.
6. The ranking service scores remaining options and generates explanations.
7. Suggestions are stored in PostgreSQL and pushed to the operator queue via realtime updates.

### Approval to Booking
1. Operator approves a suggestion.
2. The orchestrator re-checks staleness and idempotency.
3. FSP reservation validation is executed.
4. If valid, OneShot creates the reservation or batch reservation in FSP.
5. Booking outcome is recorded in audit tables.
6. Notifications are sent and delivery outcomes are stored.
7. Queue state updates in realtime.

### Discovery Flight
1. Prospect submits request.
2. Prospect data is stored minimally.
3. Daylight-compliant options are generated.
4. Payment handoff is initiated.
5. After approval and payment satisfaction, final validation and booking occur in FSP.

## External Services

- Flight Schedule Pro APIs
- Azure Container Apps
- Azure Database for PostgreSQL Flexible Server
- Azure Cache for Redis
- Azure Key Vault
- Azure Monitor / Application Insights
- Azure Communication Services and optionally Twilio/SendGrid
- Payment provider such as Stripe or Square

## Security Model

- Tenant isolation enforced in data model, API layer, and background job processing
- Service credentials stored in Key Vault
- Managed identity for Azure resource access
- TLS in transit and platform encryption at rest
- Immutable audit events for sensitive operations
- Least-privilege access to FSP and messaging providers

## Architectural Constraints

- FSP is the system of record
- No auto-apply in MVP
- Compliance logic is deterministic
- Azure is mandatory
- US data residency required
- Background jobs must be idempotent

## Confirmed Decisions

- Azure-native deployment
- Container Apps for MVP compute
- PostgreSQL plus Redis
- Azure OpenAI optional advisory role only
- Event-driven orchestration with explicit state machines

## Assumptions

- Polling-based change detection is sufficient for MVP responsiveness.

## Open Uncertainties

- Whether SignalR is necessary or plain websocket infrastructure in Container Apps is enough for operator traffic
- Whether some FSP endpoints require tenant-specific throttling policies beyond a shared adapter strategy
