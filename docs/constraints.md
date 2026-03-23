# Constraints

## Infrastructure Invariants

1. Azure is mandatory for MVP and initial production.
2. Compute must run in containerized services managed on Azure Container Apps unless a later documented decision changes this.
3. PostgreSQL Flexible Server is the sole system database for transactional workflow state.
4. Redis is required for caching and realtime support.
5. Secrets must be stored in Azure Key Vault.
6. Service-to-service Azure access must use managed identity where supported.

## Data and Tenancy Invariants

7. Tenant isolation by FSP `operatorId` is mandatory in schema design, query scoping, caching keys, job payloads, and logs.
8. No cross-tenant reads or writes are allowed outside explicitly authorized Pilotbase support workflows with audit coverage.
9. FSP remains the source of truth for schedule entities and reservation state.
10. OneShot may store only the minimal independent data necessary for workflow state, tenant configuration, notifications, and discovery prospect handling.

## Auth and Security Invariants

11. All external and internal traffic must use TLS.
12. Least-privilege access is required for FSP, database, cache, messaging, and payment integrations.
13. Audit records for approvals, rejections, bookings, and sensitive admin actions must be immutable and retained for at least one year.
14. US data residency is required for stored operational data.
15. No credentials may be embedded in source control or client-side code.

## Architecture Invariants

16. MVP is suggest-and-approve only; no booking may be created or changed without explicit operator approval.
17. Compliance-critical logic must be deterministic, testable, and explainable.
18. AI assistance is advisory only and cannot override rules, availability validation, or approval requirements.
19. FSP reservation validation must run before reservation creation.
20. Background job handlers must be idempotent.
21. All user-visible suggestion states must be backed by persisted workflow state.

## Product Limitations

22. MVP excludes payroll, grading, penalties, weather-aware scheduling, full-fleet optimization, and checkride coordination.
23. MVP does not require a student mobile app.
24. MVP does not support multi-cloud deployment.

## Confirmed Decisions

- All listed constraints are active for MVP.

## Assumptions

- Regulatory and customer requirements do not require non-US data regions during pilot rollout.

## Open Uncertainties

- Exact retention beyond one year for some audit categories
- Whether some enterprise tenants will require private networking in pilot phase
