# OneShot — Agentic Scheduler for Flight Schedule Pro

OneShot is an Azure-native, independently deployable, multi-tenant SaaS application that integrates with Flight Schedule Pro (FSP) to detect scheduling opportunities and present compliant scheduling suggestions to operators for approval.

## Repository Structure

- `AGENTS.md` — agent operating instructions for implementation and change management
- `README.md` — repository overview and execution posture
- `docs/requirements.md` — product requirements and hypotheses
- `docs/scope.md` — scope boundaries and priorities
- `docs/phases.md` — executable delivery phases
- `docs/architecture.md` — system architecture and data flow
- `docs/decisions.md` — major decisions, rationale, and tradeoffs
- `docs/system-map.md` — navigable map of modules, entry points, and integrations
- `docs/constraints.md` — non-negotiable invariants
- `docs/evaluation.md` — success metrics, test scenarios, and failure conditions

## Product Summary

The MVP operates in a **suggest-and-approve** mode only. It supports four workflows:

1. Waitlist automation when an opening appears
2. Reschedule on cancellation
3. Discovery flight booking
4. Schedule next lesson on lesson completion or progress change

FSP remains the system of record for scheduling data. OneShot adds detection, ranking, explainability, operator approval, communication, and auditability.

## Delivery Posture

- Cloud platform: **Azure-native**
- Tenant model: **strict tenant isolation by `operatorId`**
- Security posture: **least privilege, managed identity, encrypted data, audit trails**
- Autonomy posture: **human approval required for all changes in MVP**
- Deployment target: **pilot launch with 50 schools**

## Confirmed Decisions

- Azure is the required cloud provider for MVP and initial production.
- Azure OpenAI is allowed for ranking or explanation assistance, but deterministic scheduling constraints remain authoritative.
- PostgreSQL is the system database; Redis is the performance cache and event fan-out support.
- The frontend is a Next.js operator console; the backend is a TypeScript service layer.

## Assumptions

- FSP API access is available for authentication, schedule reads, availability checks, reservation validation, reservation creation, and training progress.
- SMS and email providers can be provisioned per tenant or centrally.
- Pilot customers will accept a human-in-the-loop rollout before any autonomy expansion.

## Open Uncertainties

- Whether FSP can fully support SSO reuse for all tenants or whether local session brokerage is required.
- Whether Azure Communication Services alone is sufficient for all outbound messaging or whether Twilio/SendGrid is needed for deliverability and tenant branding edge cases.
- Whether discovery-flight prospect storage can remain minimal or needs a dedicated CRM-like submodel for follow-up.

## Success Definition

The product succeeds when it measurably increases recovered flight hours, reduces manual scheduling effort, and maintains operator trust and compliance.
