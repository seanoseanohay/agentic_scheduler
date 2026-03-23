# Requirements

## Problem

Flight schools using Flight Schedule Pro lose flight hours and staff time when cancellations, openings, discovery requests, and lesson progression changes are handled manually. Operators need a system that detects these opportunities quickly, proposes compliant alternatives, and reduces administrative effort without sacrificing control, safety, or tenant isolation.

## Users

### Primary Users
- Flight school schedulers and dispatch staff who review and approve suggestions
- Chief flight instructors who need compliant, continuity-aware recommendations

### Secondary Users
- Owners and managers who configure policies and review operational metrics
- Support and operations staff at Pilotbase who monitor tenant health and onboarding

### External Participants
- Students who receive offers, confirmations, and reschedule notices
- Prospects booking discovery flights

## Use Cases

### 1. Waitlist Automation
When an opening appears, the system ranks qualified students using tenant-configured priorities and proposes one or more booking options for approval.

### 2. Reschedule on Cancellation
When an existing reservation is cancelled, the system proposes compliant alternatives that preserve location, aircraft suitability, and instructor continuity where possible.

### 3. Discovery Flight Booking
When a prospect requests a discovery flight, the system proposes daylight-compliant slots, supports payment handoff, and creates the reservation in FSP after approval and confirmation.

### 4. Schedule Next Lesson
When lesson completion or progress indicates the next event should be scheduled, the system proposes the next required lesson based on training progression and current availability.

## Functional Requirements

### Core Platform
1. The system shall operate as a multi-tenant SaaS application with strict tenant isolation keyed by FSP `operatorId`.
2. The system shall run on Azure and use Azure-native identity, secret management, monitoring, and deployment services.
3. The system shall integrate with FSP as the operational system of record for users, locations, aircraft, instructors, schedule state, availability, reservations, and training progress.
4. The system shall support near-real-time change detection using polling with a default 30-second cadence and a webhook-ready abstraction for future event ingestion.
5. The system shall persist internal configuration, workflow state, audit records, and notification records in PostgreSQL.
6. The system shall use Redis for hot data caching, queue coordination support, and realtime update fan-out.
7. The system shall expose a web operator console for queue review, explanation display, filtering, bulk actions, and tenant administration.

### Suggestion Generation
8. The system shall generate suggestions only when all hard constraints pass.
9. The system shall enforce FAA daylight restrictions for discovery flights and any other daylight-bound activity using FSP civil twilight data.
10. The system shall enforce instructor certification and aircraft compatibility for every suggestion.
11. The system shall validate student, instructor, and aircraft availability against FSP before presenting an actionable suggestion.
12. The system shall support tenant-configurable ranking weights including time since last flight, time until next flight, total hours, continuity preference, and custom business rules.
13. The system shall support group proposals for waitlist filling when batch reservation creation is appropriate.
14. The system shall support configurable search windows per tenant and per workflow.
15. The system shall produce an explanation for each suggestion that identifies the triggering event, satisfied constraints, ranking reasons, and any tradeoffs.

### Approval and Booking
16. The MVP shall require explicit operator approval before any booking or rescheduling action is applied.
17. The system shall support approval, rejection, and expiration states for suggestions.
18. The system shall call FSP reservation validation before reservation creation.
19. The system shall create individual or batch reservations in FSP only after approval and successful final validation.
20. The system shall record booking outcomes, failures, retries, and operator actions in an immutable audit trail.
21. The system shall support bulk approval actions where all included items independently satisfy hard constraints and remain valid at approval time.

### Communications
22. The system shall send email and SMS notifications for offers, confirmations, and changes using approved templates.
23. The system shall support tenant branding, opt-in rules, and communication policy configuration.
24. The system shall track delivery status and notification outcome per message.

### Discovery Flight
25. The system shall support prospect intake for discovery flights with minimal prospect data storage.
26. The system shall support external payment-provider handoff and reconciliation hooks for discovery flight workflows.

### Administration and Observability
27. The system shall provide operational dashboards for suggestion volume, approval rate, recovered hours, queue latency, and notification outcomes.
28. The system shall emit structured logs, metrics, and traces to Azure Monitor and Application Insights.
29. The system shall support feature flags for tenant rollout and controlled enablement of workflows.
30. The system shall retain audit history for at least one year.

## Constraints

- Human approval is mandatory in MVP.
- Azure is mandatory for MVP and initial production.
- FSP remains the source of truth; OneShot must not create divergent schedule state outside approved workflows.
- Compliance-critical decisions must be deterministic and testable.
- US data residency is required for stored operational data.
- No payroll, grading, penalties, or broad fleet optimization is in MVP.

## Key Hypotheses

### Hypothesis 1
- **Hypothesis:** Most recoverable flight-hour value comes from cancellation recovery and waitlist fill.
- **Why it matters:** It determines prioritization of workflows and pilot success metrics.
- **Supporting evidence:** Source documents emphasize revenue recovery and prioritize cancellation recovery plus waitlist autofill as the core engine.
- **What could invalidate it:** Pilot data shows discovery flights or next-lesson scheduling produces materially higher recovered hours or conversion value.

### Hypothesis 2
- **Hypothesis:** Operators will trust and adopt the system if every suggestion is explainable and approval remains manual in MVP.
- **Why it matters:** Adoption and approval-rate metrics depend on trust more than pure recommendation volume.
- **Supporting evidence:** Human-in-the-loop control and explainability are repeated requirements across all source documents.
- **What could invalidate it:** Operators still reject most suggestions or bypass the queue despite clear rationale and control.

### Hypothesis 3
- **Hypothesis:** FSP APIs provide enough fidelity to enforce core scheduling constraints without building an independent scheduling source of truth.
- **Why it matters:** It keeps architecture simpler and avoids synchronization risk.
- **Supporting evidence:** The PRD maps availability, civil twilight, reservation validation, reservation creation, and training progress endpoints to the core use cases.
- **What could invalidate it:** FSP data latency, missing fields, or API behavior creates frequent false positives or booking failures.

### Hypothesis 4
- **Hypothesis:** Azure Container Apps is sufficient for MVP scale and operational needs.
- **Why it matters:** It affects infrastructure complexity, deployment speed, and operating cost.
- **Supporting evidence:** The source docs prefer Azure and allow Container Apps or AKS, with MVP goals centered on rapid pilot deployment.
- **What could invalidate it:** Queue throughput, long-running workloads, or network isolation needs force AKS earlier than planned.

## Confirmed Decisions

- Azure-native architecture
- Next.js operator console
- TypeScript service stack
- PostgreSQL plus Redis
- Suggest-and-approve autonomy boundary
- FSP as source of truth

## Assumptions

- Tenants will configure business-priority weights and communication policies during onboarding.
- Pilot customers will tolerate up to 30-second change-detection latency in MVP.
- Operational recovery value can be measured from approved and completed bookings.

## Open Uncertainties

- Exact SSO integration model with FSP across all pilot tenants
- Final messaging-provider mix
- Whether all tenants need custom ranking extensions at MVP launch
