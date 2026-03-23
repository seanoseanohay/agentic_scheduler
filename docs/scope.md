# Scope

## In Scope

### MVP Workflows
- Waitlist automation for newly available slots
- Reschedule on cancellation
- Discovery flight booking with payment handoff
- Schedule next lesson based on progress state

### Platform Capabilities
- Azure-native multi-tenant deployment
- Operator approval queue
- Suggestion explanations
- Deterministic compliance and availability checks
- FSP validation and reservation creation
- Email and SMS notifications
- Audit trail and operational observability
- Tenant configuration for ranking, search windows, continuity preference, and communication templates
- Feature flags and pilot rollout controls

### Reporting for MVP
- Suggestion volume
- Approval and rejection rates
- Recovered flight hours
- Median queue time
- Notification delivery outcomes
- Booking success and failure rates

## Out of Scope

- Automatic booking changes without operator approval
- Payroll, timesheets, grading, and training records beyond what is needed for lesson sequencing
- Weather-aware proactive scheduling
- Full-fleet optimization across entire schools
- Checkride or exam coordination
- Student mobile app
- Instructor payroll or availability authoring outside FSP
- Standalone CRM beyond minimal prospect handling for discovery flights
- Direct replacement of FSP scheduling UI
- Multi-cloud support in MVP

## Priorities

### P0
- Tenant isolation
- FSP integration reliability
- Hard-constraint enforcement
- Approval queue usability
- Auditability
- Cancellation recovery and waitlist fill

### P1
- Discovery flight workflow
- Next-lesson sequencing
- Bulk approvals
- Messaging reliability
- Metrics dashboards

### P2
- Advanced analytics
- More configurable ranking rules
- Expanded support tooling
- Pilotbase admin console enhancements

## Deferred

- Low-risk auto-apply path after measured trust and rule confidence
- Weather and maintenance-driven rescheduling
- Forecast-based capacity optimization
- Mobile-first operator experiences
- Cross-tenant benchmarking
- ML-assisted ranking experimentation beyond advisory use

## Scope Boundaries

- OneShot may detect opportunities and orchestrate approved changes, but it does not own the canonical schedule.
- OneShot may store workflow state and minimal discovery-prospect information, but it does not become the system of record for students, instructors, aircraft, or reservations.
- OneShot may recommend actions, but operators remain the decision makers in MVP.

## Traceability

| Feature | User Need | Requirement Area | Delivery Phase |
|---|---|---|---|
| Waitlist automation | Refill openings quickly | suggestion generation, approval | Phase 3 |
| Reschedule on cancellation | Recover canceled lessons | suggestion generation, booking | Phase 3 |
| Discovery flight booking | Convert prospects compliantly | discovery flight, communications | Phase 3 |
| Schedule next lesson | Maintain training continuity | progression, ranking, booking | Phase 3 |
| Approval queue | Preserve control and trust | approval and booking | Phase 2 |
| Audit trail | Support compliance and supportability | administration and observability | Phase 1-4 |
| Metrics dashboard | Prove ROI and pilot readiness | administration and observability | Phase 4 |

## Confirmed Decisions

- Azure-only for MVP
- Human approval required
- Core delivery focus is revenue recovery through cancellation recovery and waitlist fill

## Assumptions

- Pilot customers value a narrow, high-confidence MVP more than a broad automation surface.

## Open Uncertainties

- Whether some pilots will demand next-lesson scheduling at launch parity with cancellation recovery
