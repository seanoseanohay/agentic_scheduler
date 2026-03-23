# Evaluation

## Success Metrics

### Business Outcomes
1. Recovered flight hours increase by at least 15 percent within six months of pilot rollout for participating schools.
2. Manual scheduling effort decreases, measured by at least 60 percent reduction in scheduling actions that require manual edits beyond approval within twelve months.
3. Waitlist conversion reaches at least 75 percent within 48 hours for eligible openings.
4. Schedule fill rate reaches or exceeds 85 percent for target pilot cohorts.

### Operational Outcomes
5. Suggestion generation completes within 30 seconds of detected trigger under normal operating load.
6. Median operator queue load time is under 2 seconds.
7. Booking validation and creation complete within workflow SLAs for pilot tenants.
8. Uptime for pilot production reaches at least 95 percent during the early pilot stage.

### Trust and Quality Outcomes
9. A high share of approved suggestions are accepted without operator edits beyond approval.
10. Zero critical security incidents occur in MVP production.
11. Zero cross-tenant data leaks occur.
12. Daylight and certification compliance violations caused by OneShot remain at zero.

## Measurable Outcomes

- suggestions created per day
- suggestions approved per day
- suggestion approval rate by workflow
- approval-without-edit rate
- recovered hours by tenant and workflow
- time from trigger to suggestion creation
- time from suggestion creation to operator decision
- booking success rate
- notification delivery success rate
- queue staleness rate
- validation failure rate
- cross-tenant access incident count
- security incident count

## Test Scenarios

### Scenario 1: Cancellation Recovery
- **Setup:** Existing reservation is cancelled in FSP.
- **Expected Output:** OneShot detects the cancellation, generates compliant alternatives, stores them with explanations, and places them in the queue.
- **Pass Condition:** At least one valid suggestion appears within SLA and can be approved to create a valid replacement booking.
- **Failure Condition:** No suggestion appears, invalid suggestions appear, or final booking fails without surfaced reason.

### Scenario 2: Waitlist Fill
- **Setup:** An opening exists and multiple eligible students are available.
- **Expected Output:** Ranked candidates or a group proposal appear with clear rationale based on tenant weights.
- **Pass Condition:** Operator can approve the proposal and FSP booking succeeds.
- **Failure Condition:** Ranking ignores configured weights, violates constraints, or creates stale/unbookable suggestions.

### Scenario 3: Discovery Flight
- **Setup:** Prospect requests a discovery flight during a period with limited daylight availability.
- **Expected Output:** Only daylight-compliant slots are proposed and payment handoff can occur.
- **Pass Condition:** Approved booking succeeds only for compliant slots.
- **Failure Condition:** Any non-compliant slot is proposed or booked.

### Scenario 4: Next Lesson Scheduling
- **Setup:** Training progress indicates the next lesson should be scheduled.
- **Expected Output:** The next appropriate lesson is proposed using progression data and continuity preference when possible.
- **Pass Condition:** The suggestion aligns with training progression and valid availability.
- **Failure Condition:** Wrong lesson type, invalid instructor/aircraft pairing, or missing explanation.

### Scenario 5: Tenant Isolation
- **Setup:** Two pilot tenants with overlapping user actions and background jobs.
- **Expected Output:** No queue item, metric, audit record, or cached object crosses tenant boundaries.
- **Pass Condition:** Isolation checks pass in API, DB, cache, and worker layers.
- **Failure Condition:** Any cross-tenant visibility or mutation occurs.

### Scenario 6: Provider Failure
- **Setup:** Messaging provider or FSP endpoint returns transient failures.
- **Expected Output:** Retries, surfaced operational alerts, and durable workflow state preserve recoverability.
- **Pass Condition:** No silent data loss; operators and support can see the issue and retry outcome.
- **Failure Condition:** Workflow is lost, duplicated, or left in an ambiguous state.

## Expected Outputs

- Deterministic pass/fail results for constraint checks
- Persisted suggestion records with explanations
- Audit records for every state transition
- Observable metrics and traces for trigger, queue, booking, and notification stages
- Weekly pilot scorecards by tenant

## Failure Conditions

- Any booking created without operator approval
- Any daylight, certification, or availability violation caused by OneShot
- Any cross-tenant data exposure
- Any missing audit trail for sensitive actions
- Suggestion latency or queue usability that makes the workflow operationally irrelevant
- Persistent mismatch between configured tenant priorities and produced rankings

## Evaluation Process

### Pre-Launch
- Run automated integration tests against mocked FSP and selected real sandbox flows.
- Run security, tenancy, and idempotency tests.
- Verify dashboards and alerts before pilot traffic.

### Pilot Evaluation
- Review weekly scorecards for each pilot tenant.
- Compare baseline and post-launch recovered hours and manual effort.
- Sample approved and rejected suggestions for explanation quality and trust signals.
- Review incidents, retries, and support tickets.

### Launch Gate
A tenant rollout may expand only when:
- no critical security issues remain open,
- tenant isolation tests pass,
- compliance violations remain at zero,
- suggestion quality metrics meet threshold for the current pilot cohort.

## Confirmed Decisions

- Evaluation is based on business value, operational reliability, trust, security, and compliance.
- Weekly tenant scorecards are mandatory during pilot rollout.

## Assumptions

- Baseline metrics can be captured from participating pilot schools before activation.

## Open Uncertainties

- Exact formula for recovered flight hours in edge cases such as discovery-flight conversions or multi-leg lesson reshuffles
