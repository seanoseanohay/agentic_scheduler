# Decisions

## Decision 1
- **Decision:** Azure is the required cloud provider for MVP and initial production.
- **Reason:** Source materials prefer Azure, the buyer context is enterprise-oriented, and Azure reduces integration friction for identity, secrets, monitoring, and managed operations.
- **Tradeoffs:** This reduces portability compared with a cloud-agnostic design and may increase switching cost later.
- **Status:** final

## Decision 2
- **Decision:** Azure Container Apps is the default compute platform for web, API, and worker services in MVP.
- **Reason:** It provides managed container hosting, autoscaling, and faster delivery than AKS for the initial pilot scope.
- **Tradeoffs:** Less control than AKS for advanced networking, custom operators, or bespoke scaling behaviors.
- **Status:** final

## Decision 3
- **Decision:** FSP remains the system of record for scheduling entities and reservation state.
- **Reason:** Avoids dual-write conflicts and leverages FSP's domain-specific scheduling data and workflows.
- **Tradeoffs:** OneShot is constrained by FSP API latency, fidelity, and availability.
- **Status:** final

## Decision 4
- **Decision:** MVP autonomy is suggest-and-approve only.
- **Reason:** Safety, operator trust, and compliance require a human decision point during initial rollout.
- **Tradeoffs:** Lower maximum automation benefit in the short term and continued manual approval overhead.
- **Status:** final

## Decision 5
- **Decision:** Hard scheduling constraints are enforced by deterministic rule evaluation.
- **Reason:** Compliance-critical behavior must be testable, explainable, and reproducible.
- **Tradeoffs:** Rules require explicit maintenance and may adapt more slowly than a pure ML-based optimizer.
- **Status:** final

## Decision 6
- **Decision:** PostgreSQL Flexible Server is the primary data store and Redis is the cache/realtime support layer.
- **Reason:** This combination supports transactional workflow state plus performant reads and event fan-out.
- **Tradeoffs:** Two operational data technologies must be managed instead of one.
- **Status:** final

## Decision 7
- **Decision:** The operator experience is delivered through a Next.js web console.
- **Reason:** It supports SSR, authenticated dashboards, and a productive TypeScript-based full-stack workflow.
- **Tradeoffs:** Mobile-native experiences are deferred.
- **Status:** final

## Decision 8
- **Decision:** Azure OpenAI may be used only in an advisory role for ranking assistance experiments and explanation drafting.
- **Reason:** The product needs room for future intelligence while preserving deterministic compliance boundaries in MVP.
- **Tradeoffs:** Architectural complexity increases slightly, and AI usage must be carefully bounded to avoid implicit authority creep.
- **Status:** final

## Decision 9
- **Decision:** Azure Communication Services is the preferred notification provider, with Twilio/SendGrid permitted if needed.
- **Reason:** Azure alignment simplifies procurement and integration, while fallback providers protect deliverability and feature coverage.
- **Tradeoffs:** Provider abstraction adds implementation work.
- **Status:** provisional

## Decision 10
- **Decision:** Polling is the default event ingestion mechanism, with a webhook-ready abstraction for future upgrades.
- **Reason:** It minimizes dependency on upstream webhook availability and still meets MVP responsiveness targets.
- **Tradeoffs:** Polling introduces some latency and sustained API load.
- **Status:** final

## Confirmed Decisions
- Decisions 1 through 8 are locked for MVP.
- Decision 9 remains provisional until deliverability testing confirms provider sufficiency.

## Assumptions
- Polling plus caching can support target pilot scale without excessive FSP API strain.

## Open Uncertainties
- Final outbound messaging provider mix
- Need for AKS in later phases
